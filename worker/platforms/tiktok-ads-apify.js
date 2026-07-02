import { HttpError } from "../lib/http.js";
import {
  getDatasetItems,
  startActorRun,
  waitForRunCompletion,
} from "./apify.js";

function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function resolveAdsActorId(env, actorId) {
  const resolved = actorId || env.APIFY_TIKTOK_ADS_ACTOR_ID;
  if (!resolved) {
    throw new HttpError(500, "APIFY_TIKTOK_ADS_ACTOR_ID belum dikonfigurasi.");
  }
  return resolved;
}

export function validateTikTokAdsInput(input) {
  const rawQuery = String(input?.query || input?.advertiser || "").trim();
  const startUrl = String(input?.startUrl || "").trim();
  if (!rawQuery && !startUrl) {
    throw new HttpError(400, "Isi nama advertiser / keyword, atau tempel URL TikTok Ads Library.");
  }

  const region = String(input?.region || "all").trim() || "all";
  const resultsLimit = Math.min(500, Math.max(1, Number(input?.resultsLimit || input?.maxItems || 50)));
  const dateFrom = input?.dateFrom ? new Date(input.dateFrom) : null;
  const dateTo = input?.dateTo ? new Date(input.dateTo) : null;

  if (input?.dateFrom && Number.isNaN(dateFrom?.getTime())) {
    throw new HttpError(400, "Tanggal mulai tidak valid.");
  }
  if (input?.dateTo && Number.isNaN(dateTo?.getTime())) {
    throw new HttpError(400, "Tanggal akhir tidak valid.");
  }
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new HttpError(400, "Tanggal mulai tidak boleh lebih besar dari tanggal akhir.");
  }
  if (startUrl && !/^https?:\/\/(www\.)?library\.tiktok\.com\//i.test(startUrl)) {
    throw new HttpError(400, "startUrl harus berupa link library.tiktok.com.");
  }

  return {
    query: rawQuery,
    startUrl,
    region,
    resultsLimit,
    dateFrom: dateFrom ? dateFrom.toISOString() : null,
    dateTo: dateTo ? dateTo.toISOString() : null,
    // "lite" skips per-ad targeting detail scraping — faster & cheaper.
    mode: input?.mode === "lite" ? "lite" : "full",
  };
}

// Builds a TikTok Ads Library search URL from a plain advertiser name / keyword.
export function buildAdsLibraryUrl(input) {
  if (input.startUrl) return input.startUrl;
  const now = Date.now();
  const start = input.dateFrom ? new Date(input.dateFrom).getTime() : now - 86400000 * 180;
  const end = input.dateTo ? new Date(input.dateTo).getTime() : now;
  const params = new URLSearchParams({
    region: input.region || "all",
    start_time: String(start),
    end_time: String(end),
    adv_name: input.query,
    query_type: "2",
    sort_type: "create_time,desc",
  });
  return `https://library.tiktok.com/ads?${params.toString()}`;
}

export async function runTikTokAdsActor(env, input) {
  const startUrl = buildAdsLibraryUrl(input);
  const actorInput = {
    startUrls: [{ url: startUrl }],
    resultsLimit: input.resultsLimit,
    skipDetails: input.mode === "lite",
    shouldDownloadVideos: false,
  };
  const startedRun = await startActorRun(env, {
    actorId: resolveAdsActorId(env),
    input: actorInput,
  });
  const completedRun = await waitForRunCompletion(env, startedRun.id, {
    timeoutMs: 8 * 60 * 1000,
  });
  const datasetId = completedRun?.defaultDatasetId || startedRun?.defaultDatasetId || null;
  if (!datasetId) throw new Error("Apify run selesai tapi dataset tidak tersedia.");
  const items = await getDatasetItems(env, datasetId, { limit: input.resultsLimit });
  return { run: completedRun, datasetId, items, actorInput, startUrl };
}

// Range midpoint via geometric mean (better estimate for wide log-scale buckets).
function estimateRange(range) {
  const lower = toNumber(range?.lowerBound);
  const upper = toNumber(range?.upperBound);
  if (lower > 0 && upper > 0) return Math.round(Math.sqrt(lower * upper));
  return Math.round((lower + upper) / 2) || lower || upper || 0;
}

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const CTA_UNKNOWN = "(no CTA)";

export function normalizeTikTokAd(raw) {
  const firstShown = toIsoDate(raw?.firstShown);
  const lastShown = toIsoDate(raw?.lastShown);
  let daysActive = 0;
  if (firstShown && lastShown) {
    daysActive = Math.max(
      1,
      Math.round((new Date(lastShown).getTime() - new Date(firstShown).getTime()) / 86400000) + 1,
    );
  }
  const targeting = raw?.targeting || {};
  const regionsTargeting = Array.isArray(targeting.regions) ? targeting.regions : [];
  const ageRanges = [...new Set(regionsTargeting.flatMap((r) => r.ageRanges || []))];
  const genders = [...new Set(regionsTargeting.flatMap((r) => r.genders || []))];
  const regionStats = Array.isArray(raw?.regionStats) ? raw.regionStats : [];
  const video = Array.isArray(raw?.videos) ? raw.videos[0] : null;

  return {
    adId: String(raw?.adId || crypto.randomUUID()),
    adName: raw?.adName || "",
    caption: raw?.caption || "",
    clickUrl: raw?.clickUrl || "",
    landingDomain: domainOf(raw?.clickUrl),
    cta: raw?.cta || CTA_UNKNOWN,
    auditStatus: String(raw?.auditStatus ?? ""),
    adType: String(raw?.type ?? ""),
    advertiserId: String(raw?.advertiserId || ""),
    advertiserName: raw?.advertiserName || "",
    paidBy: raw?.paidBy || "",
    firstShown,
    lastShown,
    daysActive,
    impressionsLower: toNumber(raw?.impressions?.lowerBound),
    impressionsUpper: toNumber(raw?.impressions?.upperBound),
    impressionsEstimate: estimateRange(raw?.impressions),
    reachLower: toNumber(raw?.reach?.lowerBound),
    reachUpper: toNumber(raw?.reach?.upperBound),
    reachEstimate: estimateRange(raw?.reach),
    totalRegionImpressions: regionStats.reduce((s, r) => s + toNumber(r.impressions), 0),
    regionStats: regionStats.map((r) => ({ regionCode: r.regionCode, impressions: toNumber(r.impressions) })),
    audienceSizeLower: toNumber(targeting?.audienceSize?.lowerBound),
    audienceSizeUpper: toNumber(targeting?.audienceSize?.upperBound),
    audienceSizeEstimate: estimateRange(targeting?.audienceSize),
    highSpendingPower: Boolean(targeting?.highSpendingPower),
    firstPartyAudience: Boolean(targeting?.firstPartyAudience),
    languages: Array.isArray(targeting?.languages) ? targeting.languages : [],
    devices: Array.isArray(targeting?.devices) ? targeting.devices : [],
    operatingSystems: Array.isArray(targeting?.operatingSystems) ? targeting.operatingSystems : [],
    interests: Array.isArray(targeting?.interests) ? targeting.interests : [],
    ageRanges,
    genders,
    targetRegions: regionsTargeting.map((r) => r.regionCode).filter(Boolean),
    tiktokUser: raw?.tiktokUser
      ? {
          username: raw.tiktokUser.username || "",
          displayName: raw.tiktokUser.displayName || "",
          avatarUrl: raw.tiktokUser.avatarUrl || "",
          followersCount: toNumber(raw.tiktokUser.followersCount),
          profileUrl: raw.tiktokUser.profileUrl || "",
        }
      : null,
    videoUrl: video?.url || "",
    coverImageUrl: video?.coverImageUrl || "",
    rawPayload: raw,
  };
}
