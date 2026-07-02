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

// Unix seconds → ISO.
function toIsoFromUnix(value) {
  const n = toNumber(value);
  if (!n) return null;
  const date = new Date(n * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function resolveMetaAdsActorId(env, actorId) {
  const resolved = actorId || env.APIFY_META_ADS_ACTOR_ID;
  if (!resolved) {
    throw new HttpError(500, "APIFY_META_ADS_ACTOR_ID belum dikonfigurasi.");
  }
  return resolved;
}

export function validateMetaAdsInput(input) {
  const rawQuery = String(input?.query || input?.keyword || "").trim();
  const startUrl = String(input?.startUrl || "").trim();
  if (!rawQuery && !startUrl) {
    throw new HttpError(400, "Isi keyword / brand, atau tempel URL Meta Ads Library.");
  }
  if (startUrl && !/^https?:\/\/(www\.)?facebook\.com\/ads\/library/i.test(startUrl)) {
    throw new HttpError(400, "startUrl harus berupa link facebook.com/ads/library.");
  }

  const country = String(input?.country || "ID").trim().toUpperCase() || "ID";
  const activeStatus = ["all", "active", "inactive"].includes(input?.activeStatus)
    ? input.activeStatus
    : "all";
  // Actor requires a minimum of 10 "maximum charged results" to run.
  const count = Math.min(500, Math.max(10, Number(input?.count || input?.maxItems || 50)));
  const dateFrom = input?.dateFrom ? new Date(input.dateFrom) : null;
  const dateTo = input?.dateTo ? new Date(input.dateTo) : null;

  if (input?.dateFrom && Number.isNaN(dateFrom?.getTime())) {
    throw new HttpError(400, "Tanggal mulai tidak valid.");
  }
  if (input?.dateTo && Number.isNaN(dateTo?.getTime())) {
    throw new HttpError(400, "Tanggal akhir tidak valid.");
  }

  return {
    query: rawQuery,
    startUrl,
    country,
    activeStatus,
    count,
    dateFrom: dateFrom ? dateFrom.toISOString() : null,
    dateTo: dateTo ? dateTo.toISOString() : null,
    // "lite" skips per-ad detail scraping (scrapeAdDetails=false) → cheaper/faster.
    mode: input?.mode === "lite" ? "lite" : "full",
  };
}

export function buildMetaAdsUrl(input) {
  if (input.startUrl) return input.startUrl;
  const params = new URLSearchParams({
    active_status: input.activeStatus || "all",
    ad_type: "all",
    country: input.country || "ID",
    q: input.query,
    search_type: "keyword_unordered",
    media_type: "all",
  });
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

export async function runMetaAdsActor(env, input) {
  const url = buildMetaAdsUrl(input);
  const actorInput = {
    urls: [{ url }],
    count: input.count,
    scrapeAdDetails: input.mode !== "lite",
  };
  const startedRun = await startActorRun(env, {
    actorId: resolveMetaAdsActorId(env),
    input: actorInput,
  });
  const completedRun = await waitForRunCompletion(env, startedRun.id, {
    timeoutMs: 8 * 60 * 1000,
  });
  const datasetId = completedRun?.defaultDatasetId || startedRun?.defaultDatasetId || null;
  if (!datasetId) throw new Error("Apify run selesai tapi dataset tidak tersedia.");
  const items = await getDatasetItems(env, datasetId, { limit: input.count });
  return { run: completedRun, datasetId, items, actorInput, startUrl: url };
}

// Parses Meta transparency spend/reach strings like "₹125K - ₹150K" or ">1M".
function parseAmountRange(text) {
  if (!text || typeof text !== "string") return { lower: 0, upper: 0, estimate: 0, raw: text || "" };
  const mult = (s) => {
    const n = parseFloat(String(s).replace(/[^\d.]/g, ""));
    if (!Number.isFinite(n)) return 0;
    if (/m/i.test(s)) return n * 1_000_000;
    if (/k/i.test(s)) return n * 1_000;
    return n;
  };
  const parts = text.split(/[-–]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 2) {
    const lower = mult(parts[0]);
    const upper = mult(parts[1]);
    return { lower, upper, estimate: Math.round((lower + upper) / 2), raw: text };
  }
  const single = mult(text);
  return { lower: single, upper: single, estimate: single, raw: text };
}

function classifyFormat(snapshot) {
  const fmt = String(snapshot?.display_format || "").toUpperCase();
  const cards = Array.isArray(snapshot?.cards) ? snapshot.cards : [];
  if (cards.length > 1) return "Carousel";
  if (fmt === "DCO") return "Dynamic (DCO)";
  if (fmt === "VIDEO") return "Video";
  if (fmt === "IMAGE") return "Image";
  return fmt ? fmt.charAt(0) + fmt.slice(1).toLowerCase() : "Other";
}

export function normalizeMetaAd(raw) {
  const snapshot = raw?.snapshot || {};
  const startShown = toIsoFromUnix(raw?.start_date);
  const endShown = toIsoFromUnix(raw?.end_date);
  const nowMs = Date.now();
  const endMs = raw?.is_active ? nowMs : (endShown ? new Date(endShown).getTime() : nowMs);
  let daysActive = 0;
  if (startShown) {
    daysActive = Math.max(1, Math.round((endMs - new Date(startShown).getTime()) / 86400000));
  }

  const cards = Array.isArray(snapshot.cards) ? snapshot.cards : [];
  const video = Array.isArray(snapshot.videos) ? snapshot.videos[0] : null;
  const image = Array.isArray(snapshot.images) ? snapshot.images[0] : null;
  const cardImage = cards.find((c) => c.resized_image_url || c.original_image_url);

  const brand = snapshot.branded_content || null;
  const advertiserName = raw?.page_name || snapshot.page_name || "";
  const runningPage = snapshot.page_name || "";

  const spend = parseAmountRange(raw?.spend);
  const reachText = raw?.reach_estimate || raw?.impressions_with_index?.impressions_text || "";
  const reach = parseAmountRange(reachText);

  const bodyText = snapshot?.body?.text || "";
  const linkUrl = snapshot?.link_url || cards.find((c) => c.link_url)?.link_url || "";

  return {
    adArchiveId: String(raw?.ad_archive_id || crypto.randomUUID()),
    adLibraryUrl: raw?.ad_library_url || "",
    isActive: Boolean(raw?.is_active),
    advertiserName,
    runningPage,
    pageId: String(raw?.page_id || snapshot.page_id || ""),
    pageProfileUri: snapshot?.page_profile_uri || "",
    pageProfilePic: snapshot?.page_profile_picture_url || "",
    pageLikeCount: toNumber(snapshot?.page_like_count),
    pageCategories: Array.isArray(snapshot?.page_categories) ? snapshot.page_categories : [],
    title: snapshot?.title || "",
    caption: snapshot?.caption || "",
    bodyText,
    bodyLength: bodyText.length,
    ctaText: snapshot?.cta_text || "",
    ctaType: snapshot?.cta_type || "NO_BUTTON",
    linkUrl,
    landingDomain: domainOf(linkUrl),
    linkDescription: snapshot?.link_description || "",
    displayFormat: snapshot?.display_format || "",
    format: classifyFormat(snapshot),
    cardCount: cards.length,
    publisherPlatform: Array.isArray(raw?.publisher_platform) ? raw.publisher_platform : [],
    startShown,
    endShown,
    daysActive,
    collationCount: toNumber(raw?.collation_count) || 1,
    adsCount: toNumber(raw?.ads_count) || 1,
    marketTotal: toNumber(raw?.total),
    category: Array.isArray(raw?.categories) ? raw.categories[0] : "UNKNOWN",
    isPolitical: (Array.isArray(raw?.categories) ? raw.categories : []).includes("POLITICAL"),
    currency: raw?.currency || "",
    spend,
    reach,
    hasSpendData: spend.estimate > 0,
    isBrandedContent: Boolean(brand),
    brandPartner: brand?.page_name || "",
    disclosure: raw?.fev_info
      ? {
          email: raw.fev_info.email || "",
          phone: raw.fev_info.phone || "",
          website: raw.fev_info.website || "",
          address: raw.fev_info.address || "",
        }
      : null,
    thumbnailUrl:
      video?.video_preview_image_url ||
      image?.resized_image_url ||
      image?.original_image_url ||
      cardImage?.resized_image_url ||
      cardImage?.original_image_url ||
      "",
    videoUrl: video?.video_hd_url || video?.video_sd_url || "",
    cards: cards.slice(0, 10).map((c) => ({
      title: c.title || "",
      body: c.body || "",
      linkUrl: c.link_url || "",
      imageUrl: c.resized_image_url || c.original_image_url || "",
    })),
    rawPayload: { ...raw, snapshot: { ...snapshot, videos: undefined, images: undefined, cards: undefined } },
  };
}
