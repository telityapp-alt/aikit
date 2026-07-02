import * as XLSX from "xlsx";
import { HttpError } from "../lib/http.js";
import { audit, db } from "../lib/supabase.js";
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

function buildItemEnrichment(item) {
  return {
    hookStyle: classifyHook(item.caption),
    contentFormat: classifyContentFormat(item),
    topicCluster: pickTopic(item.caption),
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

  return {
    executiveSummary:
      topItems.length > 0
        ? `@${report.tiktok_handle} paling kuat di format ${topFormat} dengan topic dominan ${topTopic}. Sinyal utamanya datang dari kombinasi share rate, save rate, dan engagement density berbasis views.`
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
      `Prioritaskan 3 eksperimen baru di format ${topFormat}.`,
      avgSaveRate >= avgShareRate
        ? "Perbanyak konten utility yang mendorong save."
        : "Perkuat hook dan contrarian angle untuk dorong share.",
      profile.followerCount
        ? "Bandingkan top score dengan pertumbuhan follower di refresh berikutnya."
        : "Pertimbangkan actor profile detail agar follower-based KPI makin akurat.",
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
    dateFrom: report.date_from,
    dateTo: report.date_to,
    includeComments: report.filters?.includeComments === true,
  };

  await patchRun(env, runId, { status: "running" });
  await patchReport(env, reportId, { status: "running" });

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
}
