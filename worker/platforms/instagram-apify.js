import { HttpError } from "../lib/http.js";
import {
  getDatasetItems,
  startActorRun,
  waitForRunCompletion,
} from "./apify.js";

function cleanHandle(handle) {
  return String(handle || "")
    .trim()
    .replace(/^@/, "")
    .replace(/\/+$/, "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .split(/[/?]/)[0]
    .toLowerCase();
}

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

function pickFirst(raw, paths, fallback = null) {
  for (const path of paths) {
    const value = path
      .split(".")
      .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), raw);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function resolveInstagramActorId(env, actorId) {
  const resolved = actorId || env.APIFY_INSTAGRAM_ACTOR_ID;
  if (!resolved) {
    throw new HttpError(500, "APIFY_INSTAGRAM_ACTOR_ID belum dikonfigurasi.");
  }
  return resolved;
}

export function validateInstagramInput(input) {
  const handle = cleanHandle(input?.handle || input?.username || input?.profileUrl);
  const maxItems = Math.min(200, Math.max(1, Number(input?.maxItems || input?.limit || 30)));
  const dateFrom = input?.dateFrom ? new Date(input.dateFrom) : null;
  const dateTo = input?.dateTo ? new Date(input.dateTo) : null;

  if (!handle) {
    throw new HttpError(400, "Username Instagram wajib diisi.");
  }
  if (input?.dateFrom && Number.isNaN(dateFrom?.getTime())) {
    throw new HttpError(400, "Tanggal mulai tidak valid.");
  }
  if (input?.dateTo && Number.isNaN(dateTo?.getTime())) {
    throw new HttpError(400, "Tanggal akhir tidak valid.");
  }
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new HttpError(400, "Tanggal mulai tidak boleh lebih besar dari tanggal akhir.");
  }

  // "lite" = single actor run (details + latestPosts, cheaper, no comment sentiment).
  // "full" = two-phase run (details + posts, richer: videoPlayCount + comment signals).
  const mode = input?.mode === "lite" ? "lite" : "full";

  return {
    handle,
    maxItems,
    mode,
    dateFrom: dateFrom ? dateFrom.toISOString() : null,
    dateTo: dateTo ? dateTo.toISOString() : null,
    includeComments: input?.includeComments !== false,
  };
}

async function runActor(env, { resultsType, resultsLimit, directUrls, onlyPostsNewerThan }) {
  const input = { directUrls, resultsType, resultsLimit };
  if (onlyPostsNewerThan) input.onlyPostsNewerThan = onlyPostsNewerThan;
  const startedRun = await startActorRun(env, {
    actorId: resolveInstagramActorId(env),
    input,
  });
  const completedRun = await waitForRunCompletion(env, startedRun.id);
  const datasetId = completedRun?.defaultDatasetId || startedRun?.defaultDatasetId || null;
  if (!datasetId) throw new Error("Apify run selesai tapi dataset tidak tersedia.");
  const items = await getDatasetItems(env, datasetId, { limit: resultsLimit });
  return { run: completedRun, datasetId, items, actorInput: input };
}

// Scrapes an IG profile. Two modes:
//  - "lite": ONE actor run (resultsType "details"); posts come from the embedded
//    `latestPosts` (uses videoViewCount, no per-post comment sentiment). Half the cost.
//  - "full": TWO runs (details + posts) for videoPlayCount + comment signals.
export async function runInstagramProfileActor(env, input) {
  const profileUrl = `https://www.instagram.com/${cleanHandle(input.handle)}/`;
  const onlyPostsNewerThan = input.dateFrom ? input.dateFrom.slice(0, 10) : undefined;

  const detailsResult = await runActor(env, {
    resultsType: "details",
    resultsLimit: 1,
    directUrls: [profileUrl],
  });
  const profileRaw = detailsResult.items?.[0] || null;

  if (input.mode === "lite") {
    const latestPosts = Array.isArray(profileRaw?.latestPosts) ? profileRaw.latestPosts : [];
    return {
      profileRaw,
      postItems: latestPosts.slice(0, input.maxItems),
      run: detailsResult.run,
      datasetId: detailsResult.datasetId,
      actorInput: { details: detailsResult.actorInput },
      mode: "lite",
    };
  }

  const postsResult = await runActor(env, {
    resultsType: "posts",
    resultsLimit: input.maxItems,
    directUrls: [profileUrl],
    onlyPostsNewerThan,
  });

  return {
    profileRaw,
    postItems: postsResult.items || [],
    run: postsResult.run,
    datasetId: postsResult.datasetId,
    actorInput: { details: detailsResult.actorInput, posts: postsResult.actorInput },
    mode: "full",
  };
}

export function normalizeInstagramProfile(profileRaw, postItems, handle) {
  const first = profileRaw || postItems?.[0] || {};
  const cleaned = cleanHandle(handle);
  return {
    handle: cleaned,
    platformUserId: String(pickFirst(first, ["id", "ownerId", "fbid"], "")),
    displayName: pickFirst(first, ["fullName", "ownerFullName"], cleaned),
    profileUrl: `https://www.instagram.com/${cleaned}/`,
    profilePicUrl: pickFirst(first, ["profilePicUrlHD", "profilePicUrl"], ""),
    biography: pickFirst(first, ["biography"], ""),
    followerCount: toNumber(pickFirst(profileRaw, ["followersCount"], 0)),
    followingCount: toNumber(pickFirst(profileRaw, ["followsCount"], 0)),
    postsCount: toNumber(pickFirst(profileRaw, ["postsCount"], 0)),
    verified: Boolean(pickFirst(profileRaw, ["verified"], false)),
    isBusinessAccount: Boolean(pickFirst(profileRaw, ["isBusinessAccount"], false)),
    businessCategory: pickFirst(profileRaw, ["businessCategoryName"], "") || "",
    rawPayload: {
      source: "apify",
      sample: profileRaw ? { ...profileRaw, latestPosts: undefined, relatedProfiles: undefined } : null,
      itemCount: postItems?.length || 0,
    },
  };
}

const POSITIVE_HINTS = /(love|beautiful|amazing|great|best|thank|❤|🙌|🔥|😍|👏|wonderful|inspir|👍|💙|💯)/i;
const NEGATIVE_HINTS = /(hate|worst|scam|fake|boring|ugly|stop|cringe|🗑|😡|👎|terrible|awful)/i;

function scoreComments(latestComments = []) {
  const comments = Array.isArray(latestComments) ? latestComments : [];
  let positive = 0;
  let negative = 0;
  let verified = 0;
  let totalLen = 0;
  for (const c of comments) {
    const text = String(c?.text || "");
    totalLen += text.length;
    if (POSITIVE_HINTS.test(text)) positive += 1;
    if (NEGATIVE_HINTS.test(text)) negative += 1;
    if (c?.owner?.is_verified || c?.isVerified) verified += 1;
  }
  const scored = positive + negative;
  return {
    sampleSize: comments.length,
    positiveRatio: comments.length ? Number((positive / comments.length).toFixed(3)) : 0,
    negativeRatio: comments.length ? Number((negative / comments.length).toFixed(3)) : 0,
    sentiment: scored ? Number(((positive - negative) / scored).toFixed(3)) : 0,
    verifiedCommenterRatio: comments.length ? Number((verified / comments.length).toFixed(3)) : 0,
    avgCommentLength: comments.length ? Math.round(totalLen / comments.length) : 0,
  };
}

function classifyPostType(raw) {
  const type = String(pickFirst(raw, ["type"], "")).toLowerCase();
  const product = String(pickFirst(raw, ["productType"], "")).toLowerCase();
  if (product === "clips" || product === "reels") return "Reel";
  if (type === "sidecar" || product === "carousel_container") return "Carousel";
  if (type === "video") return "Video";
  return "Image";
}

export function normalizeInstagramPost(raw, profile) {
  const publishedAt = toIsoDate(pickFirst(raw, ["timestamp"], null));
  const likeCount = toNumber(pickFirst(raw, ["likesCount"], 0));
  const commentCount = toNumber(pickFirst(raw, ["commentsCount"], 0));
  const viewCount = toNumber(pickFirst(raw, ["videoPlayCount", "videoViewCount"], 0));
  const postType = classifyPostType(raw);
  const isVideo = postType === "Reel" || postType === "Video";
  const durationSeconds = toNumber(pickFirst(raw, ["videoDuration"], 0));
  const childCount = Array.isArray(raw?.childPosts) ? raw.childPosts.length : 0;
  const hashtags = Array.isArray(raw?.hashtags) ? raw.hashtags.filter(Boolean) : [];
  const mentions = Array.isArray(raw?.mentions) ? raw.mentions.filter(Boolean) : [];
  const caption = pickFirst(raw, ["caption"], "") || "";

  const engagementCount = likeCount + commentCount;
  const followerCount = profile.followerCount || 0;
  const engagementRate = followerCount
    ? Number(((engagementCount / followerCount) * 100).toFixed(4))
    : 0;
  const viewRate = viewCount ? Number(((engagementCount / viewCount) * 100).toFixed(4)) : 0;
  const commentRatio = engagementCount
    ? Number(((commentCount / engagementCount) * 100).toFixed(2))
    : 0;

  return {
    platform: "instagram",
    platformContentId: String(pickFirst(raw, ["id", "shortCode"], "") || crypto.randomUUID()),
    shortCode: pickFirst(raw, ["shortCode"], "") || "",
    url: pickFirst(raw, ["url"], "") || "",
    contentType: isVideo ? "video" : "image",
    postType,
    caption,
    captionLength: caption.length,
    publishedAt,
    thumbnailUrl: pickFirst(raw, ["displayUrl"], "") || "",
    isVideo,
    isPinned: Boolean(pickFirst(raw, ["isPinned"], false)),
    durationSeconds,
    childCount,
    hashtags,
    mentions,
    likeCount,
    commentCount,
    viewCount,
    engagementCount,
    engagementRate,
    viewRate,
    commentRatio,
    followerCountSnapshot: followerCount,
    commentSignals: scoreComments(raw?.latestComments),
    topComments: (Array.isArray(raw?.latestComments) ? raw.latestComments : [])
      .slice(0, 5)
      .map((c) => ({
        author: c?.ownerUsername || c?.owner?.username || "",
        text: String(c?.text || "").slice(0, 240),
        verified: Boolean(c?.owner?.is_verified),
      }))
      .filter((c) => c.text),
    rawPayload: { ...raw, latestComments: undefined, childPosts: undefined },
  };
}
