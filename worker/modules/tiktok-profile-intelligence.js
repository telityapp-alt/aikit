import * as XLSX from "xlsx";
import { HttpError } from "../lib/http.js";
import { audit, db, rpc } from "../lib/supabase.js";
import {
  normalizeTikTokProfile,
  normalizeTikTokVideoItem,
  runTikTokProfileActor,
  validateTikTokInput,
} from "../platforms/tiktok.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function countBy(values) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function classifyHook(text) {
  const source = String(text || "").trim();
  const lower = source.toLowerCase();
  if (!source) return "No visible hook";
  if (source.includes("?")) return "Question hook";
  if (/^\d/.test(source)) return "Number hook";
  if (/(cara|gimana|tutorial|step)/.test(lower)) return "Tutorial hook";
  if (/(jangan|stop|hindari|salah)/.test(lower)) return "Warning hook";
  return "Statement hook";
}

function classifyContentFormat(item) {
  const source = `${item.caption} ${item.durationSeconds}`.toLowerCase();
  if (item.durationSeconds <= 15) return "Quick hit";
  if (/(cara|tutorial|tips|how to)/.test(source)) return "Educational";
  if (/(review|cobain|before after|hasil)/.test(source)) return "Review / proof";
  if (/(story|pengalaman|curhat)/.test(source)) return "Storytelling";
  return "Explainer";
}

function pickTopic(text) {
  const source = String(text || "").toLowerCase();
  if (!source) return "general";
  if (/(eczema|eksim|kulit|skincare)/.test(source)) return "skin-health";
  if (/(harga|murah|mahal|promo)/.test(source)) return "pricing";
  if (/(tips|cara|tutorial)/.test(source)) return "education";
  if (/(review|cobain|hasil|testimoni)/.test(source)) return "proof";
  return "general";
}

function computeTopScore(item) {
  const engagementDensityScore = clamp(item.viewToEngagementRate * 2.5, 0, 35);
  const shareScore = clamp(item.shareRate * 5, 0, 25);
  const saveScore = clamp(item.saveRate * 5, 0, 20);
  const commentScore = clamp(item.commentRate * 6, 0, 10);
  const scaleScore = clamp(Math.log10(item.viewCount + 1) * 5, 0, 10);
  return Number(
    (engagementDensityScore + shareScore + saveScore + commentScore + scaleScore).toFixed(2),
  );
}

function durationBucket(seconds) {
  if (seconds <= 0) return "Unknown";
  if (seconds <= 15) return "0–15s";
  if (seconds <= 30) return "16–30s";
  if (seconds <= 60) return "31–60s";
  if (seconds <= 120) return "1–2 min";
  return "2 min+";
}

function buildItemEnrichment(item) {
  return {
    hookStyle: classifyHook(item.caption),
    contentFormat: classifyContentFormat(item),
    topicCluster: pickTopic(item.caption),
    durationBucket: durationBucket(item.durationSeconds),
    hashtags: (item.hashtags || []).slice(0, 12),
    musicCluster: item.musicOriginal ? "Original audio" : "Licensed / trending audio",
    summary: item.caption
      ? item.caption.length > 140
        ? `${item.caption.slice(0, 137)}...`
        : item.caption
      : "No visible caption.",
    reasonsItWorked: [
      item.shareRate >= 1 ? "Share rate kuat, indikasi konten punya virality signal." : "Share rate moderat, performa lebih ditopang interaksi pasif.",
      item.saveRate >= 0.5 ? "Save rate tinggi, menandakan utility atau replay value." : "Save rate belum dominan, utility bisa diperkuat.",
      item.commentRate >= 0.2 ? "Comment rate cukup hidup, ada pemicu diskusi." : "Komentar tidak dominan, hook diskusi masih bisa ditingkatkan.",
    ],
  };
}

async function markStage(env, reportId, runId, stage, message, status = "running", payload = {}) {
  await db(env, "tiktok_report_events", {
    method: "POST",
    body: {
      report_id: reportId,
      run_id: runId,
      stage,
      status,
      message,
      payload,
    },
  });
}

async function patchRun(env, runId, body) {
  await db(env, `runs?id=eq.${runId}`, {
    method: "PATCH",
    body,
  });
}

async function patchReport(env, reportId, body) {
  await db(env, `tiktok_profile_reports?id=eq.${reportId}`, {
    method: "PATCH",
    body: {
      ...body,
      updated_at: new Date().toISOString(),
    },
  });
}

function median(values) {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

const DAY_LABELS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const HOUR_BLOCKS = [
  { label: "00–06", start: 0, end: 6 },
  { label: "06–09", start: 6, end: 9 },
  { label: "09–12", start: 9, end: 12 },
  { label: "12–15", start: 12, end: 15 },
  { label: "15–18", start: 15, end: 18 },
  { label: "18–21", start: 18, end: 21 },
  { label: "21–24", start: 21, end: 24 },
];

// KPIs derived purely from the scraped video set — no extra API calls.
function buildContentIntelligence(reportItems) {
  const withDates = reportItems.filter((item) => item.published_at);
  const views = reportItems.map((item) => Number(item.view_count || 0));
  const medianViews = median(views);
  const meanViews =
    views.reduce((sum, v) => sum + v, 0) / Math.max(views.length, 1);

  // Posting cadence over the observed window (posts per week).
  let postingCadencePerWeek = 0;
  let daysSpan = 0;
  if (withDates.length >= 2) {
    const times = withDates
      .map((item) => new Date(item.published_at).getTime())
      .sort((a, b) => a - b);
    daysSpan = (times[times.length - 1] - times[0]) / (1000 * 60 * 60 * 24);
    postingCadencePerWeek = daysSpan > 0
      ? Number(((withDates.length / daysSpan) * 7).toFixed(2))
      : withDates.length;
  }

  // Breakout rate: share of videos that beat 2× the median views.
  const breakoutThreshold = medianViews * 2;
  const breakouts = views.filter((v) => v >= breakoutThreshold && v > 0).length;
  const breakoutRate = views.length
    ? Number(((breakouts / views.length) * 100).toFixed(1))
    : 0;

  // Consistency: how tight the view distribution is (low variance = predictable).
  const variance =
    views.reduce((sum, v) => sum + (v - meanViews) ** 2, 0) /
    Math.max(views.length, 1);
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = meanViews > 0 ? stdDev / meanViews : 0;
  const consistencyScore = Number(
    (Math.max(0, 1 - Math.min(coefficientOfVariation, 1)) * 100).toFixed(1),
  );

  // Duration sweet spot: bucket with the highest average views.
  const durationAgg = new Map();
  for (const item of reportItems) {
    const bucket = item.ai_enrichment?.durationBucket || "Unknown";
    const entry = durationAgg.get(bucket) || { count: 0, views: 0 };
    entry.count += 1;
    entry.views += Number(item.view_count || 0);
    durationAgg.set(bucket, entry);
  }
  const durationPerformance = [...durationAgg.entries()]
    .map(([bucket, e]) => ({
      bucket,
      count: e.count,
      avgViews: Math.round(e.views / Math.max(e.count, 1)),
    }))
    .sort((a, b) => b.avgViews - a.avgViews);
  const durationSweetSpot = durationPerformance[0]?.bucket || "-";

  // Best posting window: hour block + weekday with the highest average views.
  const hourAgg = HOUR_BLOCKS.map((block) => ({ ...block, count: 0, views: 0 }));
  const dayAgg = DAY_LABELS.map((label) => ({ label, count: 0, views: 0 }));
  for (const item of withDates) {
    const date = new Date(item.published_at);
    const hour = date.getUTCHours();
    const v = Number(item.view_count || 0);
    const block = hourAgg.find((b) => hour >= b.start && hour < b.end);
    if (block) {
      block.count += 1;
      block.views += v;
    }
    const day = dayAgg[date.getUTCDay()];
    day.count += 1;
    day.views += v;
  }
  const hourPerformance = hourAgg
    .filter((b) => b.count > 0)
    .map((b) => ({ label: b.label, count: b.count, avgViews: Math.round(b.views / b.count) }))
    .sort((a, b) => b.avgViews - a.avgViews);
  const dayPerformance = dayAgg
    .filter((d) => d.count > 0)
    .map((d) => ({ label: d.label, count: d.count, avgViews: Math.round(d.views / d.count) }))
    .sort((a, b) => b.avgViews - a.avgViews);
  const bestPostingWindow = hourPerformance[0]
    ? `${hourPerformance[0].label} WIB${dayPerformance[0] ? ` · ${dayPerformance[0].label}` : ""}`
    : "-";

  // Top hashtags across the analyzed set.
  const hashtagAgg = new Map();
  for (const item of reportItems) {
    for (const tag of item.ai_enrichment?.hashtags || []) {
      const key = String(tag).replace(/^#/, "").toLowerCase();
      if (key) hashtagAgg.set(key, (hashtagAgg.get(key) || 0) + 1);
    }
  }
  const topHashtags = [...hashtagAgg.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  return {
    medianViews: Math.round(medianViews),
    meanViews: Math.round(meanViews),
    postingCadencePerWeek,
    observedWindowDays: Math.round(daysSpan),
    breakoutRate,
    breakoutCount: breakouts,
    consistencyScore,
    durationSweetSpot,
    durationPerformance,
    bestPostingWindow,
    hourPerformance,
    dayPerformance,
    topHashtags,
    // Compact per-video series (rank order) for sparkline / bar charts.
    viewsSeries: reportItems
      .slice(0, 12)
      .map((item) => ({
        rank: item.rank_position,
        views: Number(item.view_count || 0),
        engagementRate: Number(item.view_to_engagement_rate || 0),
      })),
  };
}

function buildSummary(reportItems, report, profile) {
  const topItems = [...reportItems].sort((a, b) => b.top_score - a.top_score).slice(0, 5);
  const avgViewToEngagementRate =
    reportItems.reduce((sum, item) => sum + Number(item.view_to_engagement_rate || 0), 0) /
    Math.max(reportItems.length, 1);
  const avgShareRate =
    reportItems.reduce((sum, item) => sum + Number(item.share_rate || 0), 0) /
    Math.max(reportItems.length, 1);
  const avgSaveRate =
    reportItems.reduce((sum, item) => sum + Number(item.save_rate || 0), 0) /
    Math.max(reportItems.length, 1);
  const totalViews = reportItems.reduce((sum, item) => sum + Number(item.view_count || 0), 0);
  const totalEngagement = reportItems.reduce(
    (sum, item) => sum + Number(item.engagement_count || 0),
    0,
  );
  const topicCounts = countBy(reportItems.map((item) => item.ai_enrichment?.topicCluster));
  const formatCounts = countBy(reportItems.map((item) => item.ai_enrichment?.contentFormat));
  const topFormat = formatCounts[0]?.[0] || "Explainer";
  const topTopic = topicCounts[0]?.[0] || "general";
  const intel = buildContentIntelligence(reportItems);

  return {
    ...intel,
    followerCount: profile.followerCount || 0,
    followingCount: profile.followingCount || 0,
    profileLikes: profile.likesCount || 0,
    displayName: profile.displayName || report.tiktok_handle,
    profilePicUrl: profile.profilePicUrl || "",
    executiveSummary:
      topItems.length > 0
        ? `@${report.tiktok_handle} paling kuat di format ${topFormat} (topic dominan: ${topTopic}). Median views ${Number(intel.medianViews).toLocaleString("id-ID")}, breakout rate ${intel.breakoutRate}%, dan durasi paling perform di ${intel.durationSweetSpot}. Window posting terbaik: ${intel.bestPostingWindow}.`
        : "Belum ada cukup data untuk membangun summary.",
    totalVideosAnalyzed: reportItems.length,
    totalViews,
    totalEngagement,
    averageViewToEngagementRate: Number(avgViewToEngagementRate.toFixed(4)),
    averageShareRate: Number(avgShareRate.toFixed(4)),
    averageSaveRate: Number(avgSaveRate.toFixed(4)),
    dominantTopic: topTopic,
    dominantFormat: topFormat,
    viralityScore: Number(
      (
        avgShareRate * 35 +
        avgSaveRate * 25 +
        avgViewToEngagementRate * 20 +
        Math.min(20, Math.log10(totalViews + 1) * 4)
      ).toFixed(2),
    ),
    intentScore: Number((avgSaveRate * 40 + avgViewToEngagementRate * 18).toFixed(2)),
    conversationScore: Number(
      (
        reportItems.reduce((sum, item) => sum + Number(item.comment_rate || 0), 0) /
        Math.max(reportItems.length, 1) *
        40
      ).toFixed(2),
    ),
    winningPatterns: formatCounts.slice(0, 4).map(([label]) => label),
    topicClusters: topicCounts.slice(0, 4).map(([label]) => label),
    recommendations: [
      `Prioritaskan 3 eksperimen baru di format ${topFormat} dengan durasi ${intel.durationSweetSpot}.`,
      intel.bestPostingWindow !== "-"
        ? `Jadwalkan posting di window ${intel.bestPostingWindow} — rata-rata views tertinggi ada di sana.`
        : "Kumpulkan lebih banyak post untuk memetakan best posting window.",
      avgSaveRate >= avgShareRate
        ? "Perbanyak konten utility yang mendorong save (save rate lebih dominan dari share)."
        : "Perkuat hook dan contrarian angle untuk dorong share (share rate lebih dominan).",
      intel.breakoutRate < 15
        ? `Breakout rate baru ${intel.breakoutRate}% — replikasi pola top movers untuk menaikkannya.`
        : `Breakout rate sehat (${intel.breakoutRate}%) — pertahankan konsistensi tema pemenang.`,
    ],
    topVideoUrls: topItems.map((item) => item.url),
    dataCoverage: {
      followerCountAvailable: Boolean(profile.followerCount),
      actorRunComplete: true,
      commentsCollected: false,
    },
  };
}

function buildWorkbook(report, profile, items, summary) {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([
      { key: "Handle", value: report.tiktok_handle },
      { key: "Date From", value: report.date_from },
      { key: "Date To", value: report.date_to },
      { key: "Max Items", value: report.filters?.maxItems || items.length },
      { key: "Generated At", value: new Date().toISOString() },
    ]),
    "README",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([
      {
        handle: report.tiktok_handle,
        display_name: profile.displayName,
        total_videos: summary.totalVideosAnalyzed,
        total_views: summary.totalViews,
        total_engagement: summary.totalEngagement,
        avg_view_to_engagement_rate: summary.averageViewToEngagementRate,
        avg_share_rate: summary.averageShareRate,
        avg_save_rate: summary.averageSaveRate,
        virality_score: summary.viralityScore,
        intent_score: summary.intentScore,
        conversation_score: summary.conversationScore,
        dominant_topic: summary.dominantTopic,
        dominant_format: summary.dominantFormat,
        executive_summary: summary.executiveSummary,
        recommendations: summary.recommendations.join(" | "),
      },
    ]),
    "Summary",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      items.map((item) => ({
        rank: item.rank_position,
        url: item.url,
        caption: item.caption,
        published_at: item.published_at,
        views: item.view_count,
        likes: item.like_count,
        comments: item.comment_count,
        shares: item.share_count,
        saves: item.save_count,
        duration_seconds: item.duration_seconds,
        engagement_count: item.engagement_count,
        engagement_rate: item.engagement_rate,
        view_to_engagement_rate: item.view_to_engagement_rate,
        share_rate: item.share_rate,
        save_rate: item.save_rate,
        comment_rate: item.comment_rate,
        top_score: item.top_score,
      })),
    ),
    "Raw Videos",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      items.slice(0, 10).map((item) => ({
        rank: item.rank_position,
        summary: item.ai_enrichment?.summary,
        hook_style: item.ai_enrichment?.hookStyle,
        content_format: item.ai_enrichment?.contentFormat,
        topic_cluster: item.ai_enrichment?.topicCluster,
        music_cluster: item.ai_enrichment?.musicCluster,
        reasons_it_worked: (item.ai_enrichment?.reasonsItWorked || []).join(" | "),
        url: item.url,
      })),
    ),
    "Top Movers",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([
      { metric: "Followers", value: summary.followerCount },
      { metric: "Median views", value: summary.medianViews },
      { metric: "Mean views", value: summary.meanViews },
      { metric: "Posting cadence / week", value: summary.postingCadencePerWeek },
      { metric: "Observed window (days)", value: summary.observedWindowDays },
      { metric: "Breakout rate %", value: summary.breakoutRate },
      { metric: "Consistency score", value: summary.consistencyScore },
      { metric: "Duration sweet spot", value: summary.durationSweetSpot },
      { metric: "Best posting window", value: summary.bestPostingWindow },
    ]),
    "Content Intelligence",
  );

  if (summary.durationPerformance?.length) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        summary.durationPerformance.map((row) => ({
          duration_bucket: row.bucket,
          videos: row.count,
          avg_views: row.avgViews,
        })),
      ),
      "By Duration",
    );
  }

  if (summary.topHashtags?.length) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        summary.topHashtags.map((row) => ({ hashtag: `#${row.tag}`, uses: row.count })),
      ),
      "Top Hashtags",
    );
  }

  const bytes = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    compression: true,
  });
  return new Uint8Array(bytes);
}

export { validateTikTokInput };

export async function createTikTokProfileRun(env, { user, run, input }) {
  const [report] = await db(env, "tiktok_profile_reports", {
    method: "POST",
    prefer: "return=representation",
    body: {
      run_id: run.id,
      user_id: user.id,
      tiktok_handle: input.handle,
      status: "queued",
      date_from: input.dateFrom,
      date_to: input.dateTo,
      filters: {
        maxItems: input.maxItems,
        sorting: input.sorting,
        excludePinned: input.excludePinned,
        minLikes: input.minLikes,
        includeComments: input.includeComments,
      },
      summary: {},
    },
  });

  await patchRun(env, run.id, {
    output: {
      reportId: report.id,
      module: "tiktok-profile-intelligence",
    },
  });

  return report;
}

export async function processTikTokProfileRun(env, payload) {
  const { runId, reportId, userId } = payload;
  const [run] = await db(
    env,
    `runs?id=eq.${runId}&select=id,status,input,title,automation_slug,credits_spent`,
  );
  if (!run) {
    throw new Error(`Run ${runId} tidak ditemukan.`);
  }
  if (run.status === "completed") return;

  const [report] = await db(env, `tiktok_profile_reports?id=eq.${reportId}&select=*`);
  if (!report) {
    throw new Error(`Report ${reportId} tidak ditemukan.`);
  }

  const input = {
    handle: report.tiktok_handle,
    maxItems: report.filters?.maxItems || 20,
    sorting: report.filters?.sorting || "latest",
    excludePinned: report.filters?.excludePinned === true,
    minLikes: report.filters?.minLikes || 0,
    dateFrom: report.date_from,
    dateTo: report.date_to,
    includeComments: report.filters?.includeComments === true,
  };

  await patchRun(env, runId, { status: "running" });
  await patchReport(env, reportId, { status: "running" });

  try {
  await markStage(env, reportId, runId, "starting_actor", "Menjalankan actor TikTok di Apify.");
  const actorResult = await runTikTokProfileActor(env, input);
  const rawItems = actorResult.items || [];
  if (!rawItems.length) {
    throw new HttpError(422, "Actor selesai, tetapi tidak ada video yang dikembalikan.");
  }

  await markStage(env, reportId, runId, "normalizing_profile", "Menyusun profile snapshot.");
  const profile = normalizeTikTokProfile(rawItems, input.handle);
  const [account] = await db(env, "platform_accounts", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      platform: "tiktok",
      handle: profile.handle,
      platform_user_id: profile.platformUserId,
      display_name: profile.displayName,
      profile_url: profile.profileUrl,
      profile_snapshot: profile.rawPayload,
      last_synced_at: new Date().toISOString(),
    },
  });

  await markStage(env, reportId, runId, "normalizing_videos", "Menormalkan metrics video TikTok.");
  const normalizedItems = rawItems.map((item) => normalizeTikTokVideoItem(item, profile));
  const filteredItems = normalizedItems.filter((item) => {
    if (!item.publishedAt) return true;
    if (input.dateFrom && new Date(item.publishedAt) < new Date(input.dateFrom)) return false;
    if (input.dateTo && new Date(item.publishedAt) > new Date(input.dateTo)) return false;
    return true;
  });
  if (!filteredItems.length) {
    throw new HttpError(422, "Tidak ada video TikTok yang cocok dengan periode yang dipilih.");
  }

  for (const item of filteredItems) {
    const [contentItem] = await db(env, "platform_content_items", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      body: {
        platform: "tiktok",
        account_id: account.id,
        platform_content_id: item.platformContentId,
        content_type: item.contentType,
        url: item.url,
        caption: item.caption,
        published_at: item.publishedAt,
        metrics: {
          likes: item.likeCount,
          comments: item.commentCount,
          shares: item.shareCount,
          saves: item.saveCount,
          views: item.viewCount,
        },
        normalized_metrics: {
          engagement_count: item.engagementCount,
          engagement_rate: item.engagementRate,
          view_to_engagement_rate: item.viewToEngagementRate,
          share_rate: item.shareRate,
          save_rate: item.saveRate,
          comment_rate: item.commentRate,
          duration_seconds: item.durationSeconds,
          music_name: item.musicName,
          music_author: item.musicAuthor,
          music_original: item.musicOriginal,
        },
        raw_payload: item.rawPayload,
        last_synced_at: new Date().toISOString(),
      },
    });
    item.contentItemId = contentItem.id;
    item.topScore = computeTopScore(item);
    item.aiEnrichment = buildItemEnrichment(item);
  }

  filteredItems.sort((a, b) => b.topScore - a.topScore);
  filteredItems.forEach((item, index) => {
    item.rankPosition = index + 1;
  });

  await markStage(env, reportId, runId, "scoring_videos", "Menghitung KPI turunan dan top score.");
  const reportItems = [];
  for (const item of filteredItems) {
    const [reportItem] = await db(env, "tiktok_profile_report_items", {
      method: "POST",
      prefer: "return=representation",
      body: {
        report_id: reportId,
        content_item_id: item.contentItemId,
        rank_position: item.rankPosition,
        top_score: item.topScore,
        url: item.url,
        caption: item.caption,
        published_at: item.publishedAt,
        thumbnail_url: item.thumbnailUrl,
        like_count: item.likeCount,
        comment_count: item.commentCount,
        share_count: item.shareCount,
        save_count: item.saveCount,
        view_count: item.viewCount,
        duration_seconds: item.durationSeconds,
        engagement_count: item.engagementCount,
        engagement_rate: item.engagementRate,
        view_to_engagement_rate: item.viewToEngagementRate,
        share_rate: item.shareRate,
        save_rate: item.saveRate,
        comment_rate: item.commentRate,
        velocity_score: Number((item.viewToEngagementRate * 0.6 + item.shareRate * 0.4).toFixed(2)),
        ai_enrichment: item.aiEnrichment,
      },
    });
    reportItems.push(reportItem);
  }

  await markStage(env, reportId, runId, "building_summary", "Menyusun signal deck dan executive summary.");
  const summary = buildSummary(reportItems, report, profile);

  await markStage(env, reportId, runId, "building_workbook", "Membangun workbook TikTok intelligence.");
  const workbookBytes = buildWorkbook(report, profile, reportItems, summary);
  const artifactKey = `reports/${userId}/${reportId}/tiktok-profile-intelligence.xlsx`;
  await env.REPORTS_BUCKET.put(artifactKey, workbookBytes, {
    httpMetadata: {
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      contentDisposition:
        `attachment; filename="tiktok-profile-intelligence-${report.tiktok_handle}.xlsx"`,
    },
  });

  const [artifact] = await db(env, "generated_artifacts", {
    method: "POST",
    prefer: "return=representation",
    body: {
      run_id: runId,
      report_id: null,
      kind: "excel",
      storage_provider: "r2",
      path: artifactKey,
      mime_type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size_bytes: workbookBytes.byteLength,
    },
  });

  await patchReport(env, reportId, {
    status: "completed",
    profile_account_id: account.id,
    profile_snapshot: {
      ...profile.rawPayload,
      actorRunId: actorResult.run?.id,
      actorDatasetId: actorResult.datasetId,
      actorInput: actorResult.actorInput,
    },
    summary,
    artifact_id: artifact.id,
    apify_run_id: actorResult.run?.id || null,
    apify_dataset_id: actorResult.datasetId || null,
    completed_at: new Date().toISOString(),
  });

  await patchRun(env, runId, {
    status: "completed",
    completed_at: new Date().toISOString(),
    output: {
      reportId,
      artifactId: artifact.id,
      module: "tiktok-profile-intelligence",
      summary,
    },
  });

  await markStage(env, reportId, runId, "completed", "TikTok intelligence report selesai dibuat.", "completed");
  await audit(env, userId, "tiktok-profile-intelligence.completed", {
    run_id: runId,
    report_id: reportId,
    artifact_id: artifact.id,
  });
  } catch (error) {
    // Mark the run + report as failed, refund credits, and surface the reason.
    // Swallow (do not rethrow) so the queue does not re-run the paid Apify actor.
    const reason = String(error?.message || error).slice(0, 300);
    console.error("[tiktok] run failed", runId, reason);
    await markStage(env, reportId, runId, "failed", reason, "failed").catch(() => {});
    await patchReport(env, reportId, { status: "failed" }).catch(() => {});
    await patchRun(env, runId, {
      status: "failed",
      completed_at: new Date().toISOString(),
      error: reason,
    }).catch(() => {});
    if (run.credits_spent > 0) {
      await rpc(env, "add_credits", {
        p_user: userId,
        p_amount: run.credits_spent,
      }).catch((e) => console.error("[tiktok] refund failed", e));
    }
    await audit(env, userId, "tiktok-profile-intelligence.failed", {
      run_id: runId,
      report_id: reportId,
      reason,
    }).catch(() => {});
  }
}
