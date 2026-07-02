import * as XLSX from "xlsx";
import { HttpError } from "../lib/http.js";
import { audit, db, rpc } from "../lib/supabase.js";
import {
  normalizeInstagramPost,
  normalizeInstagramProfile,
  runInstagramProfileActor,
  validateInstagramInput,
} from "../platforms/instagram-apify.js";

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

function median(values) {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function classifyHook(text) {
  const source = String(text || "").trim();
  const lower = source.toLowerCase();
  if (!source) return "No caption";
  if (source.includes("?")) return "Question hook";
  if (/^\d/.test(source)) return "Number hook";
  if (/(how|cara|tips|guide|tutorial)/.test(lower)) return "Educational hook";
  if (/(don'?t|stop|avoid|never|jangan)/.test(lower)) return "Warning hook";
  if (source.length <= 40) return "One-liner hook";
  return "Story hook";
}

function pickTopic(text) {
  const source = String(text || "").toLowerCase();
  if (!source) return "general";
  if (/(love|relationship|breakup|family|friend)/.test(source)) return "relationships";
  if (/(money|business|work|career|rich)/.test(source)) return "money-career";
  if (/(art|music|photo|design|creativ)/.test(source)) return "creative";
  if (/(life|story|journey|lesson|grief)/.test(source)) return "life-story";
  if (/(tips|how|guide|learn)/.test(source)) return "education";
  return "general";
}

function captionBucket(len) {
  if (len <= 0) return "No caption";
  if (len <= 80) return "Short (≤80)";
  if (len <= 300) return "Medium (81–300)";
  if (len <= 1000) return "Long (301–1000)";
  return "Essay (1000+)";
}

function computeTopScore(item) {
  const engagementScore = clamp(item.engagementRate * 4, 0, 35);
  const conversationScore = clamp(item.commentRatio * 0.8, 0, 20);
  const reachScore = clamp(Math.log10((item.viewCount || item.engagementCount) + 1) * 6, 0, 25);
  const scaleScore = clamp(Math.log10(item.engagementCount + 1) * 5, 0, 15);
  const reelBonus = item.postType === "Reel" ? 5 : 0;
  return Number(
    (engagementScore + conversationScore + reachScore + scaleScore + reelBonus).toFixed(2),
  );
}

function buildItemEnrichment(item) {
  return {
    postType: item.postType,
    hookStyle: classifyHook(item.caption),
    topicCluster: pickTopic(item.caption),
    captionBucket: captionBucket(item.captionLength),
    hashtags: (item.hashtags || []).slice(0, 12),
    commentSignals: item.commentSignals,
    topComments: item.topComments,
    summary: item.caption
      ? item.caption.length > 140
        ? `${item.caption.slice(0, 137)}...`
        : item.caption
      : "No visible caption.",
    reasonsItWorked: [
      item.engagementRate >= 1
        ? "Engagement rate kuat relatif ke follower base."
        : "Engagement rate moderat, reach lebih ditopang non-follower.",
      item.commentRatio >= 5
        ? "Comment ratio tinggi — konten memicu diskusi."
        : "Interaksi lebih ke likes pasif, hook diskusi bisa diperkuat.",
      item.postType === "Reel"
        ? "Format Reel mendorong reach via video distribution."
        : `Format ${item.postType} mengandalkan feed & explore.`,
    ],
  };
}

async function markStage(env, reportId, runId, stage, message, status = "running", payload = {}) {
  await db(env, "instagram_pi_events", {
    method: "POST",
    body: { report_id: reportId, run_id: runId, stage, status, message, payload },
  });
}

async function patchRun(env, runId, body) {
  await db(env, `runs?id=eq.${runId}`, { method: "PATCH", body });
}

async function patchReport(env, reportId, body) {
  await db(env, `instagram_profile_reports?id=eq.${reportId}`, {
    method: "PATCH",
    body: { ...body, updated_at: new Date().toISOString() },
  });
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

// KPIs derived from the scraped post set — no extra API calls.
function buildContentIntelligence(reportItems) {
  const withDates = reportItems.filter((item) => item.published_at);
  const engagements = reportItems.map((item) => Number(item.engagement_count || 0));
  const medianEngagement = median(engagements);
  const meanEngagement = engagements.reduce((s, v) => s + v, 0) / Math.max(engagements.length, 1);
  const medianLikes = median(reportItems.map((i) => Number(i.like_count || 0)));
  const medianComments = median(reportItems.map((i) => Number(i.comment_count || 0)));
  const videoItems = reportItems.filter((i) => i.is_video);
  const medianViews = median(videoItems.map((i) => Number(i.view_count || 0)));

  let postingCadencePerWeek = 0;
  let daysSpan = 0;
  if (withDates.length >= 2) {
    const times = withDates.map((i) => new Date(i.published_at).getTime()).sort((a, b) => a - b);
    daysSpan = (times[times.length - 1] - times[0]) / (1000 * 60 * 60 * 24);
    postingCadencePerWeek = daysSpan > 0
      ? Number(((withDates.length / daysSpan) * 7).toFixed(2))
      : withDates.length;
  }

  const breakoutThreshold = medianEngagement * 2;
  const breakouts = engagements.filter((v) => v >= breakoutThreshold && v > 0).length;
  const breakoutRate = engagements.length
    ? Number(((breakouts / engagements.length) * 100).toFixed(1))
    : 0;

  const variance =
    engagements.reduce((s, v) => s + (v - meanEngagement) ** 2, 0) / Math.max(engagements.length, 1);
  const cv = meanEngagement > 0 ? Math.sqrt(variance) / meanEngagement : 0;
  const consistencyScore = Number((Math.max(0, 1 - Math.min(cv, 1)) * 100).toFixed(1));

  // Format performance (Reel / Video / Carousel / Image).
  const formatAgg = new Map();
  for (const item of reportItems) {
    const key = item.ai_enrichment?.postType || "Image";
    const e = formatAgg.get(key) || { count: 0, engagement: 0, views: 0, videoCount: 0 };
    e.count += 1;
    e.engagement += Number(item.engagement_count || 0);
    if (item.is_video) {
      e.views += Number(item.view_count || 0);
      e.videoCount += 1;
    }
    formatAgg.set(key, e);
  }
  const formatPerformance = [...formatAgg.entries()]
    .map(([format, e]) => ({
      format,
      count: e.count,
      avgEngagement: Math.round(e.engagement / Math.max(e.count, 1)),
      avgViews: e.videoCount ? Math.round(e.views / e.videoCount) : 0,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  // Reels vs static comparison.
  const reels = reportItems.filter((i) => i.ai_enrichment?.postType === "Reel");
  const statics = reportItems.filter((i) => i.ai_enrichment?.postType !== "Reel");
  const avg = (arr, sel) => (arr.length ? Math.round(arr.reduce((s, i) => s + Number(sel(i) || 0), 0) / arr.length) : 0);
  const reelsVsStatic = {
    reelCount: reels.length,
    staticCount: statics.length,
    reelAvgEngagement: avg(reels, (i) => i.engagement_count),
    staticAvgEngagement: avg(statics, (i) => i.engagement_count),
    reelAvgViews: avg(reels, (i) => i.view_count),
  };

  // Best posting window (by engagement).
  const hourAgg = HOUR_BLOCKS.map((b) => ({ ...b, count: 0, engagement: 0 }));
  const dayAgg = DAY_LABELS.map((label) => ({ label, count: 0, engagement: 0 }));
  for (const item of withDates) {
    const date = new Date(item.published_at);
    const v = Number(item.engagement_count || 0);
    const block = hourAgg.find((b) => date.getUTCHours() >= b.start && date.getUTCHours() < b.end);
    if (block) { block.count += 1; block.engagement += v; }
    const day = dayAgg[date.getUTCDay()];
    day.count += 1; day.engagement += v;
  }
  const hourPerformance = hourAgg
    .filter((b) => b.count > 0)
    .map((b) => ({ label: b.label, count: b.count, avgEngagement: Math.round(b.engagement / b.count) }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);
  const dayPerformance = dayAgg
    .filter((d) => d.count > 0)
    .map((d) => ({ label: d.label, count: d.count, avgEngagement: Math.round(d.engagement / d.count) }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);
  const bestPostingWindow = hourPerformance[0]
    ? `${hourPerformance[0].label} UTC${dayPerformance[0] ? ` · ${dayPerformance[0].label}` : ""}`
    : "-";

  // Caption length vs engagement.
  const captionAgg = new Map();
  for (const item of reportItems) {
    const bucket = item.ai_enrichment?.captionBucket || "No caption";
    const e = captionAgg.get(bucket) || { count: 0, engagement: 0 };
    e.count += 1; e.engagement += Number(item.engagement_count || 0);
    captionAgg.set(bucket, e);
  }
  const captionPerformance = [...captionAgg.entries()]
    .map(([bucket, e]) => ({ bucket, count: e.count, avgEngagement: Math.round(e.engagement / Math.max(e.count, 1)) }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  // Hashtags + mentions.
  const hashtagAgg = new Map();
  for (const item of reportItems) {
    for (const tag of item.ai_enrichment?.hashtags || []) {
      const key = String(tag).replace(/^#/, "").toLowerCase();
      if (key) hashtagAgg.set(key, (hashtagAgg.get(key) || 0) + 1);
    }
  }
  const topHashtags = [...hashtagAgg.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag, count]) => ({ tag, count }));

  // Audience signals aggregated from sampled comments.
  let sentSum = 0; let sentN = 0; let verifiedSum = 0; let lenSum = 0; let sampleTotal = 0;
  for (const item of reportItems) {
    const s = item.ai_enrichment?.commentSignals;
    if (s && s.sampleSize) {
      sentSum += s.sentiment; sentN += 1;
      verifiedSum += s.verifiedCommenterRatio;
      lenSum += s.avgCommentLength;
      sampleTotal += s.sampleSize;
    }
  }
  const audienceSignals = {
    commentsSampled: sampleTotal,
    avgSentiment: sentN ? Number((sentSum / sentN).toFixed(3)) : 0,
    verifiedCommenterRatio: sentN ? Number((verifiedSum / sentN).toFixed(3)) : 0,
    avgCommentLength: sentN ? Math.round(lenSum / sentN) : 0,
  };

  return {
    medianEngagement: Math.round(medianEngagement),
    medianLikes: Math.round(medianLikes),
    medianComments: Math.round(medianComments),
    medianViews: Math.round(medianViews),
    postingCadencePerWeek,
    observedWindowDays: Math.round(daysSpan),
    breakoutRate,
    breakoutCount: breakouts,
    consistencyScore,
    formatPerformance,
    reelsVsStatic,
    bestPostingWindow,
    hourPerformance,
    dayPerformance,
    captionPerformance,
    topHashtags,
    audienceSignals,
    engagementSeries: reportItems.slice(0, 12).map((item) => ({
      rank: item.rank_position,
      engagement: Number(item.engagement_count || 0),
      engagementRate: Number(item.engagement_rate || 0),
    })),
  };
}

function buildSummary(reportItems, report, profile) {
  const topItems = [...reportItems].sort((a, b) => b.top_score - a.top_score).slice(0, 5);
  const totalLikes = reportItems.reduce((s, i) => s + Number(i.like_count || 0), 0);
  const totalComments = reportItems.reduce((s, i) => s + Number(i.comment_count || 0), 0);
  const totalViews = reportItems.reduce((s, i) => s + Number(i.view_count || 0), 0);
  const totalEngagement = totalLikes + totalComments;
  const avgEngagementRate =
    reportItems.reduce((s, i) => s + Number(i.engagement_rate || 0), 0) / Math.max(reportItems.length, 1);
  const topicCounts = countBy(reportItems.map((i) => i.ai_enrichment?.topicCluster));
  const formatCounts = countBy(reportItems.map((i) => i.ai_enrichment?.postType));
  const topFormat = formatCounts[0]?.[0] || "Image";
  const topTopic = topicCounts[0]?.[0] || "general";
  const intel = buildContentIntelligence(reportItems);

  return {
    ...intel,
    followerCount: profile.followerCount || 0,
    followingCount: profile.followingCount || 0,
    postsCount: profile.postsCount || 0,
    verified: profile.verified || false,
    displayName: profile.displayName || report.instagram_handle,
    profilePicUrl: profile.profilePicUrl || "",
    biography: profile.biography || "",
    totalPostsAnalyzed: reportItems.length,
    totalLikes,
    totalComments,
    totalViews,
    totalEngagement,
    averageEngagementRate: Number(avgEngagementRate.toFixed(4)),
    dominantFormat: topFormat,
    dominantTopic: topTopic,
    executiveSummary:
      topItems.length > 0
        ? `@${report.instagram_handle} paling kuat di format ${topFormat} (topic dominan: ${topTopic}). Median engagement ${Number(intel.medianEngagement).toLocaleString("id-ID")}, engagement rate rata-rata ${avgEngagementRate.toFixed(2)}%, breakout rate ${intel.breakoutRate}%. Window posting terbaik: ${intel.bestPostingWindow}.`
        : "Belum ada cukup data untuk membangun summary.",
    engagementScore: Number(
      (avgEngagementRate * 20 + Math.min(20, Math.log10(totalEngagement + 1) * 4)).toFixed(2),
    ),
    conversationScore: Number(
      ((reportItems.reduce((s, i) => s + Number(i.comment_ratio || 0), 0) / Math.max(reportItems.length, 1)) * 2).toFixed(2),
    ),
    reachScore: Number(Math.min(100, Math.log10(totalViews + totalEngagement + 1) * 12).toFixed(2)),
    winningPatterns: formatCounts.slice(0, 4).map(([label]) => label),
    topicClusters: topicCounts.slice(0, 4).map(([label]) => label),
    recommendations: [
      `Perbanyak format ${topFormat} — performa engagement tertinggi di sampel ini.`,
      intel.reelsVsStatic.reelAvgEngagement > intel.reelsVsStatic.staticAvgEngagement
        ? "Reels unggul dari konten statis — tingkatkan cadence Reels."
        : "Konten statis/carousel masih kompetitif — jaga campuran format.",
      intel.bestPostingWindow !== "-"
        ? `Jadwalkan posting di window ${intel.bestPostingWindow}.`
        : "Kumpulkan lebih banyak post untuk memetakan best window.",
      intel.audienceSignals.avgSentiment >= 0.2
        ? "Sentimen komentar positif — dorong CTA & kolaborasi."
        : "Sentimen komentar netral/campur — uji hook & topik baru.",
    ],
    topPostUrls: topItems.map((i) => i.url),
  };
}

function buildWorkbook(report, profile, items, summary) {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([
      { key: "Handle", value: report.instagram_handle },
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
        handle: report.instagram_handle,
        display_name: profile.displayName,
        followers: summary.followerCount,
        posts_analyzed: summary.totalPostsAnalyzed,
        total_likes: summary.totalLikes,
        total_comments: summary.totalComments,
        total_views: summary.totalViews,
        avg_engagement_rate: summary.averageEngagementRate,
        median_engagement: summary.medianEngagement,
        breakout_rate: summary.breakoutRate,
        consistency_score: summary.consistencyScore,
        engagement_score: summary.engagementScore,
        conversation_score: summary.conversationScore,
        dominant_format: summary.dominantFormat,
        dominant_topic: summary.dominantTopic,
        best_posting_window: summary.bestPostingWindow,
        executive_summary: summary.executiveSummary,
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
        post_type: item.post_type,
        caption: item.caption,
        published_at: item.published_at,
        likes: item.like_count,
        comments: item.comment_count,
        views: item.view_count,
        engagement: item.engagement_count,
        engagement_rate: item.engagement_rate,
        comment_ratio: item.comment_ratio,
        top_score: item.top_score,
      })),
    ),
    "Raw Posts",
  );

  if (summary.formatPerformance?.length) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        summary.formatPerformance.map((r) => ({
          format: r.format, posts: r.count, avg_engagement: r.avgEngagement, avg_views: r.avgViews,
        })),
      ),
      "By Format",
    );
  }

  if (summary.topHashtags?.length) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(summary.topHashtags.map((r) => ({ hashtag: `#${r.tag}`, uses: r.count }))),
      "Top Hashtags",
    );
  }

  const bytes = XLSX.write(workbook, { type: "buffer", bookType: "xlsx", compression: true });
  return new Uint8Array(bytes);
}

export { validateInstagramInput };

export async function createInstagramProfileRun(env, { user, run, input }) {
  const [report] = await db(env, "instagram_profile_reports", {
    method: "POST",
    prefer: "return=representation",
    body: {
      run_id: run.id,
      user_id: user.id,
      instagram_handle: input.handle,
      status: "queued",
      date_from: input.dateFrom,
      date_to: input.dateTo,
      filters: { maxItems: input.maxItems, mode: input.mode, includeComments: input.includeComments },
      summary: {},
    },
  });

  await patchRun(env, run.id, {
    output: { reportId: report.id, module: "instagram-profile-intelligence" },
  });

  return report;
}

export async function processInstagramProfileRun(env, payload) {
  const { runId, reportId, userId } = payload;
  const [run] = await db(
    env,
    `runs?id=eq.${runId}&select=id,status,input,title,automation_slug,credits_spent`,
  );
  if (!run) throw new Error(`Run ${runId} tidak ditemukan.`);
  if (run.status === "completed") return;

  const [report] = await db(env, `instagram_profile_reports?id=eq.${reportId}&select=*`);
  if (!report) throw new Error(`Report ${reportId} tidak ditemukan.`);

  const input = {
    handle: report.instagram_handle,
    maxItems: report.filters?.maxItems || 30,
    mode: report.filters?.mode === "lite" ? "lite" : "full",
    dateFrom: report.date_from,
    dateTo: report.date_to,
    includeComments: report.filters?.includeComments !== false,
  };

  await patchRun(env, runId, { status: "running" });
  await patchReport(env, reportId, { status: "running" });

  try {
    await markStage(env, reportId, runId, "starting_actor", "Menjalankan Instagram scraper di Apify.");
    const actorResult = await runInstagramProfileActor(env, input);
    const rawPosts = actorResult.postItems || [];
    if (!rawPosts.length) {
      throw new HttpError(422, "Actor selesai, tetapi tidak ada post yang dikembalikan.");
    }

    await markStage(env, reportId, runId, "normalizing_profile", "Menyusun profile snapshot.");
    const profile = normalizeInstagramProfile(actorResult.profileRaw, rawPosts, input.handle);
    const [account] = await db(env, "platform_accounts", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      body: {
        platform: "instagram",
        handle: profile.handle,
        platform_user_id: profile.platformUserId,
        display_name: profile.displayName,
        profile_url: profile.profileUrl,
        profile_snapshot: profile.rawPayload,
        last_synced_at: new Date().toISOString(),
      },
    });

    await markStage(env, reportId, runId, "normalizing_posts", "Menormalkan metrics post Instagram.");
    const normalizedItems = rawPosts.map((item) => normalizeInstagramPost(item, profile));
    const filteredItems = normalizedItems.filter((item) => {
      if (!item.publishedAt) return true;
      if (input.dateFrom && new Date(item.publishedAt) < new Date(input.dateFrom)) return false;
      if (input.dateTo && new Date(item.publishedAt) > new Date(input.dateTo)) return false;
      return true;
    });
    if (!filteredItems.length) {
      throw new HttpError(422, "Tidak ada post Instagram yang cocok dengan periode yang dipilih.");
    }

    for (const item of filteredItems) {
      const [contentItem] = await db(env, "platform_content_items", {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=representation",
        body: {
          platform: "instagram",
          account_id: account.id,
          platform_content_id: item.platformContentId,
          content_type: item.contentType,
          url: item.url,
          caption: item.caption,
          published_at: item.publishedAt,
          metrics: {
            likes: item.likeCount,
            comments: item.commentCount,
            views: item.viewCount,
          },
          normalized_metrics: {
            post_type: item.postType,
            engagement_count: item.engagementCount,
            engagement_rate: item.engagementRate,
            view_rate: item.viewRate,
            comment_ratio: item.commentRatio,
            duration_seconds: item.durationSeconds,
            child_count: item.childCount,
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

    await markStage(env, reportId, runId, "scoring_posts", "Menghitung KPI turunan dan top score.");
    const reportItems = [];
    for (const item of filteredItems) {
      const [reportItem] = await db(env, "instagram_profile_report_items", {
        method: "POST",
        prefer: "return=representation",
        body: {
          report_id: reportId,
          content_item_id: item.contentItemId,
          rank_position: item.rankPosition,
          top_score: item.topScore,
          url: item.url,
          short_code: item.shortCode,
          post_type: item.postType,
          caption: item.caption,
          published_at: item.publishedAt,
          thumbnail_url: item.thumbnailUrl,
          is_video: item.isVideo,
          like_count: item.likeCount,
          comment_count: item.commentCount,
          view_count: item.viewCount,
          duration_seconds: item.durationSeconds,
          child_count: item.childCount,
          engagement_count: item.engagementCount,
          engagement_rate: item.engagementRate,
          view_rate: item.viewRate,
          comment_ratio: item.commentRatio,
          ai_enrichment: item.aiEnrichment,
        },
      });
      reportItems.push(reportItem);
    }

    await markStage(env, reportId, runId, "building_summary", "Menyusun signal deck dan executive summary.");
    const summary = buildSummary(reportItems, report, profile);

    await markStage(env, reportId, runId, "building_workbook", "Membangun workbook Instagram intelligence.");
    const workbookBytes = buildWorkbook(report, profile, reportItems, summary);
    const artifactKey = `reports/${userId}/${reportId}/instagram-profile-intelligence.xlsx`;
    await env.REPORTS_BUCKET.put(artifactKey, workbookBytes, {
      httpMetadata: {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        contentDisposition: `attachment; filename="instagram-profile-intelligence-${report.instagram_handle}.xlsx"`,
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
        mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size_bytes: workbookBytes.byteLength,
      },
    });

    await patchReport(env, reportId, {
      status: "completed",
      profile_account_id: account.id,
      profile_snapshot: {
        ...profile.rawPayload,
        followerCount: profile.followerCount,
        actorRunId: actorResult.run?.id,
        actorDatasetId: actorResult.datasetId,
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
      output: { reportId, artifactId: artifact.id, module: "instagram-profile-intelligence", summary },
    });

    await markStage(env, reportId, runId, "completed", "Instagram intelligence report selesai dibuat.", "completed");
    await audit(env, userId, "instagram-profile-intelligence.completed", {
      run_id: runId, report_id: reportId, artifact_id: artifact.id,
    });
  } catch (error) {
    const reason = String(error?.message || error).slice(0, 300);
    console.error("[instagram] run failed", runId, reason);
    await markStage(env, reportId, runId, "failed", reason, "failed").catch(() => {});
    await patchReport(env, reportId, { status: "failed" }).catch(() => {});
    await patchRun(env, runId, {
      status: "failed", completed_at: new Date().toISOString(), error: reason,
    }).catch(() => {});
    if (run.credits_spent > 0) {
      await rpc(env, "add_credits", { p_user: userId, p_amount: run.credits_spent }).catch(
        (e) => console.error("[instagram] refund failed", e),
      );
    }
    await audit(env, userId, "instagram-profile-intelligence.failed", {
      run_id: runId, report_id: reportId, reason,
    }).catch(() => {});
  }
}
