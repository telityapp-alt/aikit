import * as XLSX from "xlsx";
import { HttpError } from "../lib/http.js";
import { audit, db, rpc } from "../lib/supabase.js";
import {
  normalizeTikTokAd,
  runTikTokAdsActor,
  validateTikTokAdsInput,
} from "../platforms/tiktok-ads-apify.js";

const ACTIVE_WINDOW_DAYS = 14;

function countBy(values) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function sumBy(items, keyFn, valFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + (valFn ? valFn(item) : 1));
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

async function markStage(env, reportId, runId, stage, message, status = "running", payload = {}) {
  await db(env, "tiktok_ads_events", {
    method: "POST",
    body: { report_id: reportId, run_id: runId, stage, status, message, payload },
  });
}

async function patchRun(env, runId, body) {
  await db(env, `runs?id=eq.${runId}`, { method: "PATCH", body });
}

async function patchReport(env, reportId, body) {
  await db(env, `tiktok_ads_reports?id=eq.${reportId}`, {
    method: "PATCH",
    body: { ...body, updated_at: new Date().toISOString() },
  });
}

function isActive(ad, nowMs) {
  if (!ad.last_shown) return false;
  return new Date(ad.last_shown).getTime() >= nowMs - ACTIVE_WINDOW_DAYS * 86400000;
}

// Competitive / creative intelligence — NOT ROI. Impressions & reach are ranges.
function buildAdsIntelligence(items) {
  const nowMs = Date.now();
  const advertisers = new Set(items.map((i) => i.advertiser_name).filter(Boolean));
  const activeAds = items.filter((i) => isActive(i, nowMs)).length;

  const estImpressions = items.reduce((s, i) => s + Number(i.impressions_estimate || 0), 0);
  const estReach = items.reduce((s, i) => s + Number(i.reach_estimate || 0), 0);
  const daysActiveValues = items.map((i) => Number(i.days_active || 0)).filter((v) => v > 0);
  const avgDaysActive = daysActiveValues.length
    ? Math.round(daysActiveValues.reduce((s, v) => s + v, 0) / daysActiveValues.length)
    : 0;

  // Ad velocity over the observed first-shown window.
  const firstShownTimes = items
    .map((i) => (i.first_shown ? new Date(i.first_shown).getTime() : null))
    .filter(Boolean)
    .sort((a, b) => a - b);
  let adVelocityPerWeek = 0;
  let observedWindowDays = 0;
  if (firstShownTimes.length >= 2) {
    observedWindowDays = (firstShownTimes[firstShownTimes.length - 1] - firstShownTimes[0]) / 86400000;
    adVelocityPerWeek = observedWindowDays > 0
      ? Number(((items.length / observedWindowDays) * 7).toFixed(2))
      : items.length;
  }

  const shareOfVoice = sumBy(items, (i) => i.advertiser_name, (i) => Number(i.impressions_estimate || 0))
    .slice(0, 8)
    .map(([advertiser, impressions]) => ({
      advertiser,
      impressions,
      share: estImpressions ? Number(((impressions / estImpressions) * 100).toFixed(1)) : 0,
    }));

  const creativeVolume = countBy(items.map((i) => i.advertiser_name))
    .slice(0, 8)
    .map(([advertiser, count]) => ({ advertiser, count }));

  const ctaBreakdown = countBy(items.map((i) => i.cta))
    .slice(0, 8)
    .map(([cta, count]) => ({ cta, count }));

  const landingDomains = countBy(items.map((i) => i.ai_enrichment?.landingDomain))
    .slice(0, 8)
    .map(([domain, count]) => ({ domain, count }));

  // Region impressions across all ads' regionStats.
  const regionMap = new Map();
  for (const item of items) {
    for (const r of item.ai_enrichment?.regionStats || []) {
      regionMap.set(r.regionCode, (regionMap.get(r.regionCode) || 0) + Number(r.impressions || 0));
    }
  }
  const regionImpressions = [...regionMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([regionCode, impressions]) => ({ regionCode, impressions }));

  // Targeting distributions (ad counts).
  const ageDistribution = countBy(items.flatMap((i) => i.ai_enrichment?.ageRanges || []))
    .map(([label, count]) => ({ label, count }));
  const genderDistribution = countBy(items.flatMap((i) => i.ai_enrichment?.genders || []))
    .map(([label, count]) => ({ label, count }));
  const languages = countBy(items.flatMap((i) => i.ai_enrichment?.languages || []))
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }));
  const operatingSystems = countBy(items.flatMap((i) => i.ai_enrichment?.operatingSystems || []))
    .map(([label, count]) => ({ label, count }));

  const audienceSizes = items.map((i) => Number(i.audience_size_estimate || 0)).filter((v) => v > 0);
  const avgAudienceSize = audienceSizes.length
    ? Math.round(audienceSizes.reduce((s, v) => s + v, 0) / audienceSizes.length)
    : 0;
  const highSpendCount = items.filter((i) => i.ai_enrichment?.highSpendingPower).length;

  return {
    totalAds: items.length,
    uniqueAdvertisers: advertisers.size,
    activeAds,
    endedAds: items.length - activeAds,
    estImpressions,
    estReach,
    avgDaysActive,
    adVelocityPerWeek,
    observedWindowDays: Math.round(observedWindowDays),
    avgAudienceSize,
    highSpendingPowerRatio: items.length ? Number((highSpendCount / items.length).toFixed(3)) : 0,
    shareOfVoice,
    creativeVolume,
    ctaBreakdown,
    landingDomains,
    regionImpressions,
    ageDistribution,
    genderDistribution,
    languages,
    operatingSystems,
    impressionsSeries: [...items]
      .sort((a, b) => Number(b.impressions_estimate || 0) - Number(a.impressions_estimate || 0))
      .slice(0, 12)
      .map((i) => ({ label: i.advertiser_name?.slice(0, 10) || i.ad_id, value: Number(i.impressions_estimate || 0) })),
  };
}

function buildSummary(items, report) {
  const intel = buildAdsIntelligence(items);
  const topAds = [...items]
    .sort((a, b) => Number(b.impressions_estimate || 0) - Number(a.impressions_estimate || 0))
    .slice(0, 6);
  const topAdvertiser = intel.shareOfVoice[0]?.advertiser || report.query || "-";
  const topCta = intel.ctaBreakdown[0]?.cta || "-";
  const topRegion = intel.regionImpressions[0]?.regionCode || "-";

  return {
    ...intel,
    query: report.query,
    region: report.region,
    executiveSummary:
      items.length > 0
        ? `${intel.totalAds} iklan dari ${intel.uniqueAdvertisers} advertiser. Share-of-voice dipimpin ${topAdvertiser}. CTA dominan "${topCta}", region impressions terbesar ${topRegion}. Estimasi total impressions ~${intel.estImpressions.toLocaleString("id-ID")} (range mid-point), ${intel.activeAds} iklan masih aktif.`
        : "Belum ada iklan yang cocok dengan pencarian ini.",
    creativeAngleNote:
      "Impressions & reach berupa range (estimasi geometric mid-point). Gunakan untuk share-of-voice & benchmarking kreatif, bukan ROI.",
    recommendations: [
      `Bedah kreatif top ${topAdvertiser} — pelajari hook, CTA "${topCta}", dan landing page.`,
      intel.activeAds > 0
        ? `${intel.activeAds} iklan aktif — pantau yang berjalan lama (avg ${intel.avgDaysActive} hari) sebagai proven creative.`
        : "Tidak ada iklan aktif terdeteksi — cek rentang tanggal / region.",
      intel.regionImpressions[0]
        ? `Impressions terkonsentrasi di ${intel.regionImpressions[0].regionCode} — sesuaikan uji pasar & bahasa.`
        : "Perluas region pencarian untuk peta distribusi lebih lengkap.",
      "Replikasi format & targeting (usia/gender) dari iklan dengan estimasi impressions tertinggi.",
    ],
    topAdIds: topAds.map((a) => a.ad_id),
  };
}

function buildWorkbook(report, items, summary) {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([
      { key: "Query", value: report.query },
      { key: "Region", value: report.region },
      { key: "Date From", value: report.date_from },
      { key: "Date To", value: report.date_to },
      { key: "Results Limit", value: report.filters?.resultsLimit || items.length },
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
        est_impressions: summary.estImpressions,
        est_reach: summary.estReach,
        avg_days_active: summary.avgDaysActive,
        ad_velocity_per_week: summary.adVelocityPerWeek,
        avg_audience_size: summary.avgAudienceSize,
        top_advertiser: summary.shareOfVoice[0]?.advertiser || "",
        top_cta: summary.ctaBreakdown[0]?.cta || "",
        executive_summary: summary.executiveSummary,
      },
    ]),
    "Summary",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      items.map((item) => ({
        ad_id: item.ad_id,
        advertiser: item.advertiser_name,
        ad_name: item.ad_name,
        caption: item.caption,
        cta: item.cta,
        click_url: item.click_url,
        first_shown: item.first_shown,
        last_shown: item.last_shown,
        days_active: item.days_active,
        impressions_estimate: item.impressions_estimate,
        reach_estimate: item.reach_estimate,
        audience_size_estimate: item.audience_size_estimate,
        paid_by: item.paid_by,
        video_url: item.video_url,
      })),
    ),
    "Ads",
  );

  if (summary.shareOfVoice?.length) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        summary.shareOfVoice.map((r) => ({ advertiser: r.advertiser, est_impressions: r.impressions, share_pct: r.share })),
      ),
      "Share of Voice",
    );
  }

  if (summary.regionImpressions?.length) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(summary.regionImpressions.map((r) => ({ region: r.regionCode, impressions: r.impressions }))),
      "By Region",
    );
  }

  const bytes = XLSX.write(workbook, { type: "buffer", bookType: "xlsx", compression: true });
  return new Uint8Array(bytes);
}

export { validateTikTokAdsInput };

export async function createTikTokAdsRun(env, { user, run, input }) {
  const [report] = await db(env, "tiktok_ads_reports", {
    method: "POST",
    prefer: "return=representation",
    body: {
      run_id: run.id,
      user_id: user.id,
      query: input.query || input.startUrl,
      region: input.region,
      status: "queued",
      date_from: input.dateFrom,
      date_to: input.dateTo,
      filters: {
        resultsLimit: input.resultsLimit,
        mode: input.mode,
        startUrl: input.startUrl || null,
      },
      summary: {},
    },
  });

  await patchRun(env, run.id, {
    output: { reportId: report.id, module: "tiktok-ads-spy" },
  });

  return report;
}

export async function processTikTokAdsRun(env, payload) {
  const { runId, reportId, userId } = payload;
  const [run] = await db(
    env,
    `runs?id=eq.${runId}&select=id,status,input,title,automation_slug,credits_spent`,
  );
  if (!run) throw new Error(`Run ${runId} tidak ditemukan.`);
  if (run.status === "completed") return;

  const [report] = await db(env, `tiktok_ads_reports?id=eq.${reportId}&select=*`);
  if (!report) throw new Error(`Report ${reportId} tidak ditemukan.`);

  const input = {
    query: report.query,
    startUrl: report.filters?.startUrl || "",
    region: report.region || "all",
    resultsLimit: report.filters?.resultsLimit || 50,
    mode: report.filters?.mode === "lite" ? "lite" : "full",
    dateFrom: report.date_from,
    dateTo: report.date_to,
  };

  await patchRun(env, runId, { status: "running" });
  await patchReport(env, reportId, { status: "running" });

  try {
    await markStage(env, reportId, runId, "starting_actor", "Menjalankan TikTok Ads Library scraper di Apify.");
    const actorResult = await runTikTokAdsActor(env, input);
    const rawAds = actorResult.items || [];
    if (!rawAds.length) {
      throw new HttpError(422, "Actor selesai, tetapi tidak ada iklan yang ditemukan untuk pencarian ini.");
    }

    await markStage(env, reportId, runId, "normalizing_ads", "Menormalkan data iklan & targeting.");
    const normalized = rawAds
      .map((ad) => normalizeTikTokAd(ad))
      .filter((ad) => {
        if (!ad.firstShown) return true;
        if (input.dateFrom && new Date(ad.firstShown) < new Date(input.dateFrom)) return false;
        if (input.dateTo && new Date(ad.firstShown) > new Date(input.dateTo)) return false;
        return true;
      });
    if (!normalized.length) {
      throw new HttpError(422, "Tidak ada iklan yang cocok dengan periode yang dipilih.");
    }

    normalized.sort((a, b) => b.impressionsEstimate - a.impressionsEstimate);

    await markStage(env, reportId, runId, "scoring_ads", "Menyimpan iklan dan menghitung KPI.");
    const reportItems = [];
    for (let index = 0; index < normalized.length; index += 1) {
      const ad = normalized[index];
      const [reportItem] = await db(env, "tiktok_ads_report_items", {
        method: "POST",
        prefer: "return=representation",
        body: {
          report_id: reportId,
          rank_position: index + 1,
          ad_id: ad.adId,
          ad_name: ad.adName,
          caption: ad.caption,
          click_url: ad.clickUrl,
          cta: ad.cta,
          advertiser_id: ad.advertiserId,
          advertiser_name: ad.advertiserName,
          paid_by: ad.paidBy,
          audit_status: ad.auditStatus,
          ad_type: ad.adType,
          first_shown: ad.firstShown,
          last_shown: ad.lastShown,
          days_active: ad.daysActive,
          impressions_lower: ad.impressionsLower,
          impressions_upper: ad.impressionsUpper,
          impressions_estimate: ad.impressionsEstimate,
          reach_estimate: ad.reachEstimate,
          audience_size_estimate: ad.audienceSizeEstimate,
          video_url: ad.videoUrl,
          cover_image_url: ad.coverImageUrl,
          tiktok_user: ad.tiktokUser,
          ai_enrichment: {
            landingDomain: ad.landingDomain,
            regionStats: ad.regionStats,
            ageRanges: ad.ageRanges,
            genders: ad.genders,
            languages: ad.languages,
            operatingSystems: ad.operatingSystems,
            devices: ad.devices,
            interests: ad.interests,
            highSpendingPower: ad.highSpendingPower,
            targetRegions: ad.targetRegions,
            summary: ad.caption
              ? ad.caption.length > 140 ? `${ad.caption.slice(0, 137)}...` : ad.caption
              : ad.adName || "TikTok ad",
          },
        },
      });
      reportItems.push(reportItem);
    }

    await markStage(env, reportId, runId, "building_summary", "Menyusun ads intelligence deck.");
    const summary = buildSummary(reportItems, report);

    await markStage(env, reportId, runId, "building_workbook", "Membangun workbook TikTok Ads Spy.");
    const workbookBytes = buildWorkbook(report, reportItems, summary);
    const artifactKey = `reports/${userId}/${reportId}/tiktok-ads-spy.xlsx`;
    await env.REPORTS_BUCKET.put(artifactKey, workbookBytes, {
      httpMetadata: {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        contentDisposition: `attachment; filename="tiktok-ads-spy-${(report.query || "report").slice(0, 40)}.xlsx"`,
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
      output: { reportId, artifactId: artifact.id, module: "tiktok-ads-spy", summary },
    });

    await markStage(env, reportId, runId, "completed", "TikTok Ads Spy report selesai dibuat.", "completed");
    await audit(env, userId, "tiktok-ads-spy.completed", {
      run_id: runId, report_id: reportId, artifact_id: artifact.id,
    });
  } catch (error) {
    const reason = String(error?.message || error).slice(0, 300);
    console.error("[tiktok-ads] run failed", runId, reason);
    await markStage(env, reportId, runId, "failed", reason, "failed").catch(() => {});
    await patchReport(env, reportId, { status: "failed" }).catch(() => {});
    await patchRun(env, runId, {
      status: "failed", completed_at: new Date().toISOString(), error: reason,
    }).catch(() => {});
    if (run.credits_spent > 0) {
      await rpc(env, "add_credits", { p_user: userId, p_amount: run.credits_spent }).catch(
        (e) => console.error("[tiktok-ads] refund failed", e),
      );
    }
    await audit(env, userId, "tiktok-ads-spy.failed", {
      run_id: runId, report_id: reportId, reason,
    }).catch(() => {});
  }
}
