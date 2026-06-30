import * as XLSX from "xlsx";
import { HttpError } from "../lib/http.js";
import { audit, db } from "../lib/supabase.js";
import {
  getInstagramComments,
  getInstagramMediaIndex,
  getInstagramProfile,
  getInstagramTranscript,
  normalizeInstagramComment,
  normalizeInstagramMediaItem,
  normalizeInstagramProfile,
} from "../platforms/instagram.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function summarizeCaption(caption) {
  if (!caption) return "Tanpa caption yang terlihat.";
  return caption.length > 180 ? `${caption.slice(0, 177)}...` : caption;
}

function classifyHook(text) {
  const source = String(text || "").toLowerCase();
  if (!source) return "No visible hook";
  if (source.includes("?")) return "Question-led hook";
  if (/\d/.test(source)) return "Number-led hook";
  if (source.includes("cara") || source.includes("how to")) return "Tutorial hook";
  if (source.includes("rahasia") || source.includes("secret")) return "Curiosity hook";
  return "Statement hook";
}

function classifyContentFormat(item) {
  const source = `${item.mediaType} ${item.caption}`.toLowerCase();
  if (source.includes("reel")) return "Short-form video";
  if (source.includes("carousel")) return "Carousel";
  if (source.includes("tutorial")) return "Tutorial";
  if (source.includes("promo") || source.includes("diskon")) return "Promotional";
  return item.sourceTab === "reels" ? "Short-form video" : "Feed post";
}

function classifyCta(text) {
  const source = String(text || "").toLowerCase();
  if (source.includes("comment") || source.includes("komen")) return "Comment CTA";
  if (source.includes("save") || source.includes("simpan")) return "Save CTA";
  if (source.includes("share") || source.includes("bagikan")) return "Share CTA";
  if (source.includes("klik") || source.includes("link")) return "Traffic CTA";
  return "Soft CTA";
}

function pickTheme(text) {
  const source = String(text || "").toLowerCase();
  if (!source) return "general";
  if (source.includes("harga") || source.includes("mahal") || source.includes("murah")) return "pricing";
  if (source.includes("bagus") || source.includes("suka") || source.includes("keren")) return "praise";
  if (source.includes("gimana") || source.includes("cara") || source.includes("where")) return "question";
  if (source.includes("stock") || source.includes("ready") || source.includes("tersedia")) return "availability";
  if (source.includes("beli") || source.includes("checkout") || source.includes("link")) return "purchase intent";
  return "general";
}

function sentimentFromComment(text) {
  const source = String(text || "").toLowerCase();
  if (!source) return "neutral";
  if (/(bagus|suka|keren|mantap|love|great)/.test(source)) return "positive";
  if (/(jelek|parah|mahal|buruk|bingung|ga jelas|nggak jelas)/.test(source)) return "negative";
  return "neutral";
}

function buildFallbackPostInsight(item, comments, transcript) {
  const caption = item.caption || "";
  const topThemes = countBy(comments.map((comment) => comment.theme))
    .slice(0, 3)
    .map(([label]) => label);

  return {
    hookStyle: classifyHook(caption),
    contentFormat: classifyContentFormat(item),
    ctaStyle: classifyCta(caption),
    summary: summarizeCaption(caption),
    reasonsItWorked: [
      item.engagementRate >= 1 ? "Engagement rate relatif kuat dibanding follower base." : "Engagement absolut tetap menarik walau rate moderat.",
      item.commentCount > 0 ? "Komentar menunjukkan audience mau bereaksi, bukan hanya lihat." : "Performa ditopang likes atau views lebih dominan dari komentar.",
      transcript ? "Video punya spoken content yang bisa memperkuat retention." : "Caption dan visual jadi pendorong utama performa.",
    ],
    commentThemes: topThemes,
  };
}

function countBy(values) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

async function callAnthropic(env, prompt, system) {
  if (!env.ANTHROPIC_API_KEY) return null;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      max_tokens: 1200,
      temperature: 0.2,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic error ${response.status}: ${errorText}`);
  }

  const payload = await response.json();
  return payload?.content?.find((entry) => entry.type === "text")?.text || null;
}

async function enrichItemWithAI(env, item, comments, transcript) {
  const fallback = buildFallbackPostInsight(item, comments, transcript);

  try {
    const commentSample = comments.slice(0, 12).map((comment) => ({
      text: comment.text,
      sentiment: comment.sentiment,
      theme: comment.theme,
    }));
    const prompt = JSON.stringify({
      task: "Analyze why this Instagram content performed well.",
      output_schema: {
        hookStyle: "string",
        contentFormat: "string",
        ctaStyle: "string",
        summary: "string",
        reasonsItWorked: ["string"],
        commentThemes: ["string"],
      },
      post: {
        caption: item.caption,
        mediaType: item.mediaType,
        sourceTab: item.sourceTab,
        metrics: {
          likes: item.likeCount,
          comments: item.commentCount,
          views: item.viewCount,
          engagementRate: item.engagementRate,
        },
        transcript,
        comments: commentSample,
      },
      rules: [
        "Return JSON only.",
        "Keep summary under 35 words.",
        "Limit reasonsItWorked to 3 items.",
        "Limit commentThemes to 3 items.",
      ],
    });
    const raw = await callAnthropic(
      env,
      prompt,
      "You are a senior social media strategist. Respond with strict JSON only.",
    );

    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      hookStyle: parsed.hookStyle || fallback.hookStyle,
      contentFormat: parsed.contentFormat || fallback.contentFormat,
      ctaStyle: parsed.ctaStyle || fallback.ctaStyle,
      summary: parsed.summary || fallback.summary,
      reasonsItWorked: Array.isArray(parsed.reasonsItWorked)
        ? parsed.reasonsItWorked.slice(0, 3)
        : fallback.reasonsItWorked,
      commentThemes: Array.isArray(parsed.commentThemes)
        ? parsed.commentThemes.slice(0, 3)
        : fallback.commentThemes,
    };
  } catch (error) {
    console.warn("[instagram-competitor] ai item fallback", error.message);
    return fallback;
  }
}

async function buildPortfolioSummary(env, report, topItems, commentThemes) {
  const fallback = {
    executiveSummary:
      topItems.length > 0
        ? `${report.instagram_handle} paling kuat di format ${topItems[0]?.aiEnrichment?.contentFormat || "content"} dengan pemicu utama engagement dari kombinasi hook, visual, dan percakapan komentar.`
        : "Belum ada cukup data untuk membentuk ringkasan strategis.",
    winningPatterns: topItems.slice(0, 3).map((item) => item.aiEnrichment?.contentFormat || item.mediaType),
    audienceSignals: commentThemes.slice(0, 4).map(([theme]) => theme),
    recommendations: [
      "Replikasi format konten dengan engagement rate tertinggi.",
      "Gunakan hook 1-2 baris yang langsung menjelaskan value konten.",
      "Masukkan CTA komentar atau simpan pada konten edukatif.",
    ],
  };

  try {
    const prompt = JSON.stringify({
      task: "Summarize the top Instagram content portfolio.",
      output_schema: {
        executiveSummary: "string",
        winningPatterns: ["string"],
        audienceSignals: ["string"],
        recommendations: ["string"],
      },
      report: {
        handle: report.instagram_handle,
        sourceTab: report.source_tab,
        topItems: topItems.map((item) => ({
          caption: item.caption,
          engagementRate: item.engagementRate,
          likeCount: item.likeCount,
          commentCount: item.commentCount,
          hookStyle: item.aiEnrichment?.hookStyle,
          contentFormat: item.aiEnrichment?.contentFormat,
          ctaStyle: item.aiEnrichment?.ctaStyle,
          reasonsItWorked: item.aiEnrichment?.reasonsItWorked,
        })),
        commentThemes: commentThemes.slice(0, 6),
      },
      rules: [
        "Return strict JSON only.",
        "Keep executiveSummary under 60 words.",
        "Max 4 items per array.",
      ],
    });
    const raw = await callAnthropic(
      env,
      prompt,
      "You are a senior competitor intelligence analyst. Return strict JSON only.",
    );
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      executiveSummary: parsed.executiveSummary || fallback.executiveSummary,
      winningPatterns: Array.isArray(parsed.winningPatterns)
        ? parsed.winningPatterns.slice(0, 4)
        : fallback.winningPatterns,
      audienceSignals: Array.isArray(parsed.audienceSignals)
        ? parsed.audienceSignals.slice(0, 4)
        : fallback.audienceSignals,
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.slice(0, 4)
        : fallback.recommendations,
    };
  } catch (error) {
    console.warn("[instagram-competitor] ai portfolio fallback", error.message);
    return fallback;
  }
}

function scoreItem(item) {
  const engagementRateScore = clamp(item.engagementRate * 18, 0, 45);
  const engagementVolumeScore = clamp(Math.log10(item.engagementCount + 1) * 12, 0, 25);
  const commentDepthScore = clamp(Math.log10(item.commentCount + 1) * 12, 0, 15);
  const viewEfficiencyScore = item.viewCount
    ? clamp((item.engagementCount / item.viewCount) * 800, 0, 15)
    : 5;
  return Number(
    (engagementRateScore + engagementVolumeScore + commentDepthScore + viewEfficiencyScore).toFixed(2),
  );
}

function buildWorkbook(report, items, comments, summary) {
  const workbook = XLSX.utils.book_new();

  const readmeRows = [
    { key: "Handle", value: report.instagram_handle },
    { key: "Source Tab", value: report.source_tab },
    { key: "Date From", value: report.date_from },
    { key: "Date To", value: report.date_to },
    { key: "Generated At", value: new Date().toISOString() },
  ];
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(readmeRows),
    "README",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([
      {
        handle: report.instagram_handle,
        executive_summary: summary.executiveSummary,
        winning_patterns: summary.winningPatterns.join(" | "),
        audience_signals: summary.audienceSignals.join(" | "),
        recommendations: summary.recommendations.join(" | "),
      },
    ]),
    "Summary",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      items.map((item) => ({
        rank: item.rankPosition,
        is_top_content: item.isTopContent,
        media_type: item.mediaType,
        published_at: item.publishedAt,
        url: item.url,
        caption: item.caption,
        likes: item.likeCount,
        comments: item.commentCount,
        views: item.viewCount,
        play_count: item.playCount,
        engagement_count: item.engagementCount,
        engagement_rate: item.engagementRate,
        top_score: item.topScore,
      })),
    ),
    "Raw Media",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      items.map((item) => ({
        rank: item.rankPosition,
        url: item.url,
        hook_style: item.aiEnrichment?.hookStyle,
        content_format: item.aiEnrichment?.contentFormat,
        cta_style: item.aiEnrichment?.ctaStyle,
        summary: item.aiEnrichment?.summary,
        reasons_it_worked: (item.aiEnrichment?.reasonsItWorked || []).join(" | "),
        comment_themes: (item.aiEnrichment?.commentThemes || []).join(" | "),
      })),
    ),
    "Top Content",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      comments.map((comment) => ({
        post_url: comment.postUrl,
        author_handle: comment.authorHandle,
        published_at: comment.publishedAt,
        like_count: comment.likeCount,
        sentiment: comment.sentiment,
        theme: comment.theme,
        text: comment.text,
      })),
    ),
    "Comments",
  );

  const themeCounts = countBy(comments.map((comment) => comment.theme)).map(([theme, count]) => ({
    theme,
    count,
  }));
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(themeCounts),
    "Comment Themes",
  );

  const bytes = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    compression: true,
  });
  return new Uint8Array(bytes);
}

async function markStage(env, reportId, runId, stage, message, status = "running", payload = {}) {
  await db(env, "instagram_report_events", {
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
  await db(env, `instagram_competitor_reports?id=eq.${reportId}`, {
    method: "PATCH",
    body: {
      ...body,
      updated_at: new Date().toISOString(),
    },
  });
}

export function validateCompetitorInput(input) {
  const instagramHandle = String(input?.instagramHandle || input?.handle || "")
    .trim()
    .replace(/^@/, "");
  const sourceTab = input?.sourceTab === "reels" ? "reels" : "posts";
  const dateFrom = input?.dateFrom ? new Date(input.dateFrom) : null;
  const dateTo = input?.dateTo ? new Date(input.dateTo) : null;

  if (!instagramHandle) {
    throw new HttpError(400, "Handle Instagram wajib diisi.");
  }
  if (!dateFrom || Number.isNaN(dateFrom.getTime())) {
    throw new HttpError(400, "Tanggal mulai wajib diisi.");
  }
  if (!dateTo || Number.isNaN(dateTo.getTime())) {
    throw new HttpError(400, "Tanggal akhir wajib diisi.");
  }
  if (dateFrom > dateTo) {
    throw new HttpError(400, "Tanggal mulai tidak boleh lebih besar dari tanggal akhir.");
  }

  return {
    instagramHandle,
    sourceTab,
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
    region: input?.region || "ID",
    includeTranscripts: input?.includeTranscripts !== false,
  };
}

export async function createCompetitorReportRun(env, { user, run, input }) {
  const [report] = await db(env, "instagram_competitor_reports", {
    method: "POST",
    prefer: "return=representation",
    body: {
      run_id: run.id,
      user_id: user.id,
      instagram_handle: input.instagramHandle,
      source_tab: input.sourceTab,
      date_from: input.dateFrom,
      date_to: input.dateTo,
      status: "queued",
      filters: {
        region: input.region,
        includeTranscripts: input.includeTranscripts,
      },
      summary: {},
    },
  });

  await db(env, `runs?id=eq.${run.id}`, {
    method: "PATCH",
    body: {
      output: {
        reportId: report.id,
        module: "instagram-competitor-report",
      },
    },
  });

  return report;
}

export async function processCompetitorRun(env, payload) {
  const { runId, reportId, userId } = payload;
  const [run] = await db(
    env,
    `runs?id=eq.${runId}&select=id,status,input,title,automation_slug,credits_spent`,
  );
  if (!run) {
    throw new Error(`Run ${runId} tidak ditemukan.`);
  }
  if (run.status === "completed") return;

  const [report] = await db(
    env,
    `instagram_competitor_reports?id=eq.${reportId}&select=*`,
  );
  if (!report) {
    throw new Error(`Report ${reportId} tidak ditemukan.`);
  }

  const filter = {
    instagramHandle: report.instagram_handle,
    sourceTab: report.source_tab,
    dateFrom: report.date_from,
    dateTo: report.date_to,
    region: report.filters?.region || "ID",
    includeTranscripts: report.filters?.includeTranscripts !== false,
  };

  await patchRun(env, runId, { status: "running" });
  await patchReport(env, reportId, { status: "running" });

  await markStage(env, reportId, runId, "fetching_profile", "Mengambil profil Instagram.");
  const rawProfile = await getInstagramProfile(env, filter.instagramHandle, filter.region);
  const profile = normalizeInstagramProfile(rawProfile, filter.instagramHandle);

  const [account] = await db(env, "platform_accounts", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      platform: "instagram",
      handle: profile.handle,
      platform_user_id: profile.platformUserId,
      display_name: profile.displayName,
      profile_url: `https://www.instagram.com/${profile.handle}/`,
      profile_snapshot: profile.rawPayload,
      last_synced_at: new Date().toISOString(),
    },
  });

  await markStage(env, reportId, runId, "fetching_media_index", "Mengambil daftar konten.");
  const rawItems = await getInstagramMediaIndex(env, filter);
  if (!rawItems.length) {
    throw new HttpError(422, "Tidak ada konten yang ditemukan pada periode tersebut.");
  }

  const normalizedItems = rawItems.map((item) =>
    normalizeInstagramMediaItem(item, profile, filter.sourceTab),
  );
  normalizedItems.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

  await markStage(env, reportId, runId, "normalizing_metrics", "Menyusun metrik standar.");
  for (const item of normalizedItems) {
    const [contentItem] = await db(env, "platform_content_items", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      body: {
        platform: "instagram",
        account_id: account.id,
        platform_content_id: item.platformContentId,
        content_type: item.mediaType,
        url: item.url,
        shortcode: item.shortcode || null,
        caption: item.caption,
        published_at: item.publishedAt,
        metrics: {
          likes: item.likeCount,
          comments: item.commentCount,
          views: item.viewCount,
          play_count: item.playCount,
        },
        normalized_metrics: {
          engagement_count: item.engagementCount,
          engagement_rate: item.engagementRate,
          follower_count_snapshot: item.followerCountSnapshot,
          source_tab: item.sourceTab,
          thumbnail_url: item.thumbnailUrl,
        },
        raw_payload: item.rawPayload,
        last_synced_at: new Date().toISOString(),
      },
    });
    item.contentItemId = contentItem.id;
    item.topScore = scoreItem(item);
  }

  normalizedItems.sort((a, b) => b.topScore - a.topScore);
  normalizedItems.forEach((item, index) => {
    item.rankPosition = index + 1;
    item.isTopContent = index < 5;
  });

  await markStage(env, reportId, runId, "ranking_top_content", "Menentukan 5 konten terkuat.");

  const reportItems = [];
  const collectedComments = [];
  const themeRollup = [];

  for (const item of normalizedItems) {
    let transcript = "";
    let comments = [];

    if (item.isTopContent) {
      await markStage(
        env,
        reportId,
        runId,
        "fetching_comments",
        `Mengambil komentar untuk konten peringkat ${item.rankPosition}.`,
        "running",
        { url: item.url },
      );
      comments = (await getInstagramComments(env, item.url, filter.region, 80)).map(
        normalizeInstagramComment,
      );
      for (const comment of comments) {
        comment.sentiment = sentimentFromComment(comment.text);
        comment.theme = pickTheme(comment.text);
        comment.postUrl = item.url;
        collectedComments.push(comment);
        themeRollup.push(comment.theme);
        await db(env, "platform_content_comments", {
          method: "POST",
          prefer: "resolution=merge-duplicates",
          body: {
            platform: "instagram",
            content_item_id: item.contentItemId,
            platform_comment_id: comment.platformCommentId,
            author_handle: comment.authorHandle,
            text: comment.text,
            metrics: {
              like_count: comment.likeCount,
              sentiment: comment.sentiment,
              theme: comment.theme,
            },
            raw_payload: comment.rawPayload,
            published_at: comment.publishedAt,
          },
        });
      }

      if (filter.includeTranscripts && item.sourceTab === "reels") {
        await markStage(
          env,
          reportId,
          runId,
          "fetching_transcripts",
          `Mengambil transcript untuk konten peringkat ${item.rankPosition}.`,
          "running",
          { url: item.url },
        );
        transcript = await getInstagramTranscript(env, item.url, filter.region);
      }
    }

    const aiEnrichment = await enrichItemWithAI(env, item, comments, transcript);
    const [reportItem] = await db(env, "instagram_competitor_report_items", {
      method: "POST",
      prefer: "return=representation",
      body: {
        report_id: reportId,
        content_item_id: item.contentItemId,
        is_top_content: item.isTopContent,
        rank_position: item.rankPosition,
        top_score: item.topScore,
        source_tab: item.sourceTab,
        media_type: item.mediaType,
        url: item.url,
        caption: item.caption,
        published_at: item.publishedAt,
        thumbnail_url: item.thumbnailUrl,
        like_count: item.likeCount,
        comment_count: item.commentCount,
        play_count: item.playCount,
        view_count: item.viewCount,
        engagement_count: item.engagementCount,
        engagement_rate: item.engagementRate,
        follower_count_snapshot: item.followerCountSnapshot,
        transcript,
        ai_enrichment: aiEnrichment,
      },
    });
    reportItems.push({
      ...reportItem,
      aiEnrichment,
      caption: item.caption,
      mediaType: item.mediaType,
      url: item.url,
      likeCount: item.likeCount,
      commentCount: item.commentCount,
      playCount: item.playCount,
      viewCount: item.viewCount,
      engagementCount: item.engagementCount,
      engagementRate: item.engagementRate,
      sourceTab: item.sourceTab,
      publishedAt: item.publishedAt,
      thumbnailUrl: item.thumbnailUrl,
      topScore: item.topScore,
      rankPosition: item.rankPosition,
      isTopContent: item.isTopContent,
    });
  }

  const topItems = reportItems.filter((item) => item.isTopContent).sort((a, b) => a.rankPosition - b.rankPosition);
  const commentThemes = countBy(themeRollup);
  const summary = await buildPortfolioSummary(env, report, topItems, commentThemes);

  await markStage(env, reportId, runId, "building_workbook", "Membangun file Excel.");
  const workbookBytes = buildWorkbook(report, reportItems, collectedComments, summary);
  const artifactKey = `reports/${userId}/${reportId}/instagram-competitor-report.xlsx`;
  await env.REPORTS_BUCKET.put(artifactKey, workbookBytes, {
    httpMetadata: {
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      contentDisposition:
        `attachment; filename="instagram-competitor-report-${report.instagram_handle}.xlsx"`,
    },
  });

  const [artifact] = await db(env, "generated_artifacts", {
    method: "POST",
    prefer: "return=representation",
    body: {
      run_id: runId,
      report_id: reportId,
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
    profile_snapshot: profile.rawPayload,
    summary: {
      ...summary,
      totalMediaAnalyzed: reportItems.length,
      averageEngagementRate:
        reportItems.reduce((sum, item) => sum + Number(item.engagementRate || 0), 0) /
        Math.max(reportItems.length, 1),
      strongestCommentTheme: commentThemes[0]?.[0] || "general",
      reportTopItems: topItems.map((item) => item.id),
    },
    excel_artifact_id: artifact.id,
    completed_at: new Date().toISOString(),
  });

  await patchRun(env, runId, {
    status: "completed",
    completed_at: new Date().toISOString(),
    output: {
      reportId,
      artifactId: artifact.id,
      module: "instagram-competitor-report",
      summary,
    },
  });

  await markStage(env, reportId, runId, "completed", "Report selesai dibuat.", "completed");
  await audit(env, userId, "instagram-competitor-report.completed", {
    run_id: runId,
    report_id: reportId,
    artifact_id: artifact.id,
  });
}
