import * as XLSX from "xlsx";
import { HttpError } from "../lib/http.js";
import { audit, db, rpc } from "../lib/supabase.js";
import {
  normalizeMetaAd,
  runMetaAdsActor,
  validateMetaAdsInput,
} from "../platforms/meta-ads-apify.js";

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

async function markStage(env, reportId, runId, stage, message, status = "running", payload = {}) {
  await db(env, "meta_ads_events", {
    method: "POST",
    body: { report_id: reportId, run_id: runId, stage, status, message, payload },
  });
}

async function patchRun(env, runId, body) {
  await db(env, `runs?id=eq.${runId}`, { method: "PATCH", body });
}

async function patchReport(env, reportId, body) {
  await db(env, `meta_ads_reports?id=eq.${reportId}`, {
    method: "PATCH",
    body: { ...body, updated_at: new Date().toISOString() },
  });
}

// Longevity + variant spy-score. Meta has no impressions for commercial ads,
// so "proven creative" = runs long + many variants + still active.
function computeSpyScore(ad) {
  const longevity = clamp(ad.daysActive * 0.5, 0, 45);
  const variants = clamp(ad.collationCount * 8, 0, 30);
  const activeBonus = ad.isActive ? 15 : 0;
  const crossPlatform = clamp((ad.publisherPlatform?.length || 0) * 2.5, 0, 10);
  return Number((longevity + variants + activeBonus + crossPlatform).toFixed(2));
}

// Competitive / creative intelligence — Meta exposes creatives + metadata,
// spend/reach only for political & social-issue ads.
function buildAdsIntelligence(items) {
  const advertisers = new Set(items.map((i) => i.advertiser_name).filter(Boolean));
  const activeAds = items.filter((i) => i.is_active).length;
  const marketSize = Math.max(0, ...items.map((i) => Number(i.market_total || 0)));

  const durations = items.map((i) => Number(i.days_active || 0)).filter((v) => v > 0);
  const avgDaysActive = durations.length
    ? Math.round(durations.reduce((s, v) => s + v, 0) / durations.length)
    : 0;
  const medianDaysActive = Math.round(median(durations));
  const longRunners = items.filter((i) => Number(i.days_active || 0) >= 30).length;

  const collations = items.map((i) => Number(i.collation_count || 1));
  const avgVariants = collations.length
    ? Number((collations.reduce((s, v) => s + v, 0) / collations.length).toFixed(2))
    : 0;

  const formatMix = countBy(items.map((i) => i.ai_enrichment?.format))
    .map(([format, count]) => ({ format, count }));

  const platformMix = countBy(items.flatMap((i) => i.ai_enrichment?.publisherPlatform || []))
    .map(([platform, count]) => ({ platform, count }));

  const ctaBreakdown = countBy(items.map((i) => i.cta_type))
    .slice(0, 8)
    .map(([cta, count]) => ({ cta, count }));

  const landingDomains = countBy(items.map((i) => i.ai_enrichment?.landingDomain))
    .slice(0, 8)
    .map(([domain, count]) => ({ domain, count }));

  // Advertiser leaderboard by ad volume (SOV proxy — no impressions for commercial).
  const advAgg = new Map();
  for (const item of items) {
    const key = item.advertiser_name;
    if (!key) continue;
    const e = advAgg.get(key) || { count: 0, active: 0, variants: 0, likes: 0 };
    e.count += 1;
    if (item.is_active) e.active += 1;
    e.variants += Number(item.collation_count || 1);
    e.likes = Math.max(e.likes, Number(item.ai_enrichment?.pageLikeCount || 0));
    advAgg.set(key, e);
  }
  const advertiserLeaderboard = [...advAgg.entries()]
    .map(([advertiser, e]) => ({ advertiser, ...e }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Influencer / branded-content partnerships.
  const partnerships = items
    .filter((i) => i.ai_enrichment?.isBrandedContent && i.ai_enrichment?.brandPartner)
    .map((i) => ({
      brand: i.ai_enrichment.brandPartner,
      creator: i.ai_enrichment.runningPage || i.advertiser_name,
      adArchiveId: i.ad_archive_id,
    }));
  const uniquePartnerships = [...new Map(partnerships.map((p) => [`${p.brand}::${p.creator}`, p])).values()].slice(0, 12);

  // Partial spend intel (political / social-issue ads only).
  const spendAds = items
    .filter((i) => Number(i.spend_estimate || 0) > 0)
    .map((i) => ({
      advertiser: i.advertiser_name,
      spendRaw: i.ai_enrichment?.spendRaw || "",
      spendEstimate: Number(i.spend_estimate || 0),
      currency: i.currency || "",
      reachRaw: i.ai_enrichment?.reachRaw || "",
    }))
    .sort((a, b) => b.spendEstimate - a.spendEstimate)
    .slice(0, 10);

  const pageCategories = countBy(items.flatMap((i) => i.ai_enrichment?.pageCategories || []))
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }));

  return {
    totalAds: items.length,
    uniqueAdvertisers: advertisers.size,
    activeAds,
    endedAds: items.length - activeAds,
    marketSize,
    avgDaysActive,
    medianDaysActive,
    longRunners,
    avgVariants,
    formatMix,
    platformMix,
    ctaBreakdown,
    landingDomains,
    advertiserLeaderboard,
    partnerships: uniquePartnerships,
    partnershipCount: uniquePartnerships.length,
    spendAds,
    spendAdsCount: spendAds.length,
    pageCategories,
    longevitySeries: [...items]
      .sort((a, b) => Number(b.days_active || 0) - Number(a.days_active || 0))
      .slice(0, 12)
      .map((i) => ({ label: (i.advertiser_name || "").slice(0, 10), value: Number(i.days_active || 0) })),
  };
}

function buildSummary(items, report) {
  const intel = buildAdsIntelligence(items);
  const topFormat = intel.formatMix[0]?.format || "Video";
  const topPlatform = intel.platformMix[0]?.platform || "FACEBOOK";
  const topAdvertiser = intel.advertiserLeaderboard[0]?.advertiser || report.query || "-";

  return {
    ...intel,
    query: report.query,
    country: report.country,
    executiveSummary:
      items.length > 0
        ? `${intel.totalAds} iklan dari ${intel.uniqueAdvertisers} advertiser (market size ~${intel.marketSize.toLocaleString("id-ID")} untuk query ini). Volume dipimpin ${topAdvertiser}. Format dominan ${topFormat}, platform utama ${topPlatform}. ${intel.activeAds} iklan aktif, ${intel.longRunners} long-runner (≥30 hari), rata-rata ${intel.avgVariants} varian/creative.`
        : "Belum ada iklan yang cocok dengan pencarian ini.",
    creativeAngleNote:
      "Meta hanya expose spend/reach untuk iklan politik/isu sosial. Untuk komersial: gunakan volume iklan, longevity, dan jumlah varian sebagai proxy 'proven creative' — bukan ROI.",
    recommendations: [
      `Swipe kreatif top ${topAdvertiser} — long-runner = proven. Pelajari hook body copy & CTA.`,
      intel.longRunners > 0
        ? `${intel.longRunners} iklan jalan ≥30 hari — prioritas tertinggi untuk direplikasi.`
        : "Belum ada long-runner — kompetitor masih fase testing, peluang masuk cepat.",
      intel.avgVariants >= 2
        ? `Rata-rata ${intel.avgVariants} varian/creative — kompetitor getol A/B test, siapkan variasi banyak.`
        : "Variasi creative rendah — ada ruang menang lewat volume testing.",
      intel.partnershipCount > 0
        ? `${intel.partnershipCount} partnership influencer terdeteksi — pertimbangkan creator serupa.`
        : `Format ${topFormat} + platform ${topPlatform} adalah placement utama kategori ini.`,
    ],
    topAdIds: [...items]
      .sort((a, b) => Number(b.spy_score || 0) - Number(a.spy_score || 0))
      .slice(0, 6)
      .map((i) => i.ad_archive_id),
  };
}

function buildWorkbook(report, items, summary) {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([
      { key: "Query", value: report.query },
      { key: "Country", value: report.country },
      { key: "Active status", value: report.filters?.activeStatus },
      { key: "Count", value: report.filters?.count || items.length },
      { key: "Generated At", value: new Date().toISOString() },
    ]),
    "README",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([
      {
        query: report.query,
        total_ads: summary.totalAds,
        unique_advertisers: summary.uniqueAdvertisers,
        active_ads: summary.activeAds,
        market_size: summary.marketSize,
        avg_days_active: summary.avgDaysActive,
        long_runners: summary.longRunners,
        avg_variants: summary.avgVariants,
        partnerships: summary.partnershipCount,
        top_advertiser: summary.advertiserLeaderboard[0]?.advertiser || "",
        top_format: summary.formatMix[0]?.format || "",
        executive_summary: summary.executiveSummary,
      },
    ]),
    "Summary",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      items.map((item) => ({
        ad_archive_id: item.ad_archive_id,
        advertiser: item.advertiser_name,
        is_active: item.is_active,
        format: item.ai_enrichment?.format,
        cta: item.cta_type,
        title: item.title,
        body: item.body_text,
        link_url: item.link_url,
        platforms: (item.ai_enrichment?.publisherPlatform || []).join("|"),
        start_shown: item.start_shown,
        end_shown: item.end_shown,
        days_active: item.days_active,
        variants: item.collation_count,
        spy_score: item.spy_score,
        spend: item.ai_enrichment?.spendRaw || "",
        video_url: item.video_url,
      })),
    ),
    "Ads",
  );

  if (summary.advertiserLeaderboard?.length) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        summary.advertiserLeaderboard.map((r) => ({
          advertiser: r.advertiser, ads: r.count, active: r.active, variants: r.variants, page_likes: r.likes,
        })),
      ),
      "Advertisers",
    );
  }

  if (summary.partnerships?.length) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(summary.partnerships.map((p) => ({ brand: p.brand, creator: p.creator }))),
      "Partnerships",
    );
  }

  const bytes = XLSX.write(workbook, { type: "buffer", bookType: "xlsx", compression: true });
  return new Uint8Array(bytes);
}

export { validateMetaAdsInput };

export async function createMetaAdsRun(env, { user, run, input }) {
  const [report] = await db(env, "meta_ads_reports", {
    method: "POST",
    prefer: "return=representation",
    body: {
      run_id: run.id,
      user_id: user.id,
      query: input.query || input.startUrl,
      country: input.country,
      status: "queued",
      date_from: input.dateFrom,
      date_to: input.dateTo,
      filters: {
        count: input.count,
        activeStatus: input.activeStatus,
        mode: input.mode,
        startUrl: input.startUrl || null,
      },
      summary: {},
    },
  });

  await patchRun(env, run.id, {
    output: { reportId: report.id, module: "meta-ads-spy" },
  });

  return report;
}

export async function processMetaAdsRun(env, payload) {
  const { runId, reportId, userId } = payload;
  const [run] = await db(
    env,
    `runs?id=eq.${runId}&select=id,status,input,title,automation_slug,credits_spent`,
  );
  if (!run) throw new Error(`Run ${runId} tidak ditemukan.`);
  if (run.status === "completed") return;

  const [report] = await db(env, `meta_ads_reports?id=eq.${reportId}&select=*`);
  if (!report) throw new Error(`Report ${reportId} tidak ditemukan.`);

  const input = {
    query: report.query,
    startUrl: report.filters?.startUrl || "",
    country: report.country || "ID",
    activeStatus: report.filters?.activeStatus || "all",
    count: report.filters?.count || 50,
    mode: report.filters?.mode === "lite" ? "lite" : "full",
    dateFrom: report.date_from,
    dateTo: report.date_to,
  };

  await patchRun(env, runId, { status: "running" });
  await patchReport(env, reportId, { status: "running" });

  try {
    await markStage(env, reportId, runId, "starting_actor", "Menjalankan Meta Ads Library scraper di Apify.");
    const actorResult = await runMetaAdsActor(env, input);
    const rawAds = (actorResult.items || []).filter((a) => a && (a.ad_archive_id || a.snapshot));
    if (!rawAds.length) {
      throw new HttpError(422, "Actor selesai, tetapi tidak ada iklan yang ditemukan untuk pencarian ini.");
    }

    await markStage(env, reportId, runId, "normalizing_ads", "Menormalkan data iklan Meta.");
    const normalized = rawAds
      .map((ad) => normalizeMetaAd(ad))
      .filter((ad) => {
        if (!ad.startShown) return true;
        if (input.dateFrom && new Date(ad.startShown) < new Date(input.dateFrom)) return false;
        if (input.dateTo && new Date(ad.startShown) > new Date(input.dateTo)) return false;
        return true;
      });
    if (!normalized.length) {
      throw new HttpError(422, "Tidak ada iklan yang cocok dengan periode yang dipilih.");
    }

    for (const ad of normalized) ad.spyScore = computeSpyScore(ad);
    normalized.sort((a, b) => b.spyScore - a.spyScore);

    await markStage(env, reportId, runId, "scoring_ads", "Menyimpan iklan dan menghitung KPI.");
    const reportItems = [];
    for (let index = 0; index < normalized.length; index += 1) {
      const ad = normalized[index];
      const [reportItem] = await db(env, "meta_ads_report_items", {
        method: "POST",
        prefer: "return=representation",
        body: {
          report_id: reportId,
          rank_position: index + 1,
          ad_archive_id: ad.adArchiveId,
          ad_library_url: ad.adLibraryUrl,
          is_active: ad.isActive,
          advertiser_name: ad.advertiserName,
          page_id: ad.pageId,
          title: ad.title,
          body_text: ad.bodyText,
          cta_type: ad.ctaType,
          cta_text: ad.ctaText,
          link_url: ad.linkUrl,
          display_format: ad.displayFormat,
          start_shown: ad.startShown,
          end_shown: ad.endShown,
          days_active: ad.daysActive,
          collation_count: ad.collationCount,
          market_total: ad.marketTotal,
          currency: ad.currency,
          spend_estimate: ad.spend.estimate,
          is_political: ad.isPolitical,
          spy_score: ad.spyScore,
          thumbnail_url: ad.thumbnailUrl,
          video_url: ad.videoUrl,
          ai_enrichment: {
            format: ad.format,
            landingDomain: ad.landingDomain,
            linkDescription: ad.linkDescription,
            caption: ad.caption,
            publisherPlatform: ad.publisherPlatform,
            pageLikeCount: ad.pageLikeCount,
            pageCategories: ad.pageCategories,
            cardCount: ad.cardCount,
            cards: ad.cards,
            isBrandedContent: ad.isBrandedContent,
            brandPartner: ad.brandPartner,
            runningPage: ad.runningPage,
            disclosure: ad.disclosure,
            spendRaw: ad.spend.raw,
            reachRaw: ad.reach.raw,
            summary: ad.bodyText
              ? ad.bodyText.length > 160 ? `${ad.bodyText.slice(0, 157)}...` : ad.bodyText
              : ad.title || "Meta ad",
          },
        },
      });
      reportItems.push(reportItem);
    }

    await markStage(env, reportId, runId, "building_summary", "Menyusun Meta ads intelligence deck.");
    const summary = buildSummary(reportItems, report);

    await markStage(env, reportId, runId, "building_workbook", "Membangun workbook Meta Ads Spy.");
    const workbookBytes = buildWorkbook(report, reportItems, summary);
    const artifactKey = `reports/${userId}/${reportId}/meta-ads-spy.xlsx`;
    await env.REPORTS_BUCKET.put(artifactKey, workbookBytes, {
      httpMetadata: {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        contentDisposition: `attachment; filename="meta-ads-spy-${(report.query || "report").slice(0, 40)}.xlsx"`,
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
      summary,
      artifact_id: artifact.id,
      apify_run_id: actorResult.run?.id || null,
      apify_dataset_id: actorResult.datasetId || null,
      start_url: actorResult.startUrl || null,
      completed_at: new Date().toISOString(),
    });

    await patchRun(env, runId, {
      status: "completed",
      completed_at: new Date().toISOString(),
      output: { reportId, artifactId: artifact.id, module: "meta-ads-spy", summary },
    });

    await markStage(env, reportId, runId, "completed", "Meta Ads Spy report selesai dibuat.", "completed");
    await audit(env, userId, "meta-ads-spy.completed", {
      run_id: runId, report_id: reportId, artifact_id: artifact.id,
    });
  } catch (error) {
    const reason = String(error?.message || error).slice(0, 300);
    console.error("[meta-ads] run failed", runId, reason);
    await markStage(env, reportId, runId, "failed", reason, "failed").catch(() => {});
    await patchReport(env, reportId, { status: "failed" }).catch(() => {});
    await patchRun(env, runId, {
      status: "failed", completed_at: new Date().toISOString(), error: reason,
    }).catch(() => {});
    if (run.credits_spent > 0) {
      await rpc(env, "add_credits", { p_user: userId, p_amount: run.credits_spent }).catch(
        (e) => console.error("[meta-ads] refund failed", e),
      );
    }
    await audit(env, userId, "meta-ads-spy.failed", {
      run_id: runId, report_id: reportId, reason,
    }).catch(() => {});
  }
}
