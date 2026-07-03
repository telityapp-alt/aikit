import { HttpError } from "../lib/http.js";
import { runInstagramProfileActor } from "./instagram-apify.js";

const SCRAPECREATORS_BASE_URL = "https://api.scrapecreators.com";

function cleanHandle(handle) {
  return String(handle || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
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
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return fallback;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = String(value).replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.posts)) return payload.posts;
  if (Array.isArray(payload?.reels)) return payload.reels;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function extractNextCursor(payload) {
  return (
    payload?.next_max_id ||
    payload?.max_id ||
    payload?.cursor ||
    payload?.next_cursor ||
    payload?.pagination?.next_max_id ||
    null
  );
}

export async function scrapeCreatorsFetch(env, path, params = {}) {
  if (!env.SCRAPECREATORS_API_KEY) {
    throw new HttpError(
      500,
      "SCRAPECREATORS_API_KEY belum dikonfigurasi di environment Worker.",
    );
  }

  const url = new URL(`${SCRAPECREATORS_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      "x-api-key": env.SCRAPECREATORS_API_KEY,
      accept: "application/json",
    },
  });

  const payload = await response.text();
  const data = payload ? JSON.parse(payload) : null;
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `ScrapeCreators error ${response.status}`);
  }
  return data;
}

function canUseScrapeCreators(env) {
  return Boolean(env.SCRAPECREATORS_API_KEY);
}

export async function getInstagramProfile(env, handle, region) {
  const cleaned = cleanHandle(handle);
  if (!cleaned) {
    throw new HttpError(400, "Handle Instagram wajib diisi.");
  }
  if (!canUseScrapeCreators(env)) {
    const actorResult = await runInstagramProfileActor(env, {
      handle: cleaned,
      maxItems: 1,
      mode: "lite",
      includeComments: false,
    });
    return actorResult.profileRaw || actorResult.postItems?.[0] || {};
  }
  return scrapeCreatorsFetch(env, "/v1/instagram/profile", {
    handle: cleaned,
    region,
    trim: true,
  });
}

export async function getInstagramMediaIndex(env, {
  handle,
  sourceTab,
  region,
  dateFrom,
  dateTo,
  maxPages = 8,
}) {
  const cleaned = cleanHandle(handle);
  if (!canUseScrapeCreators(env)) {
    const actorResult = await runInstagramProfileActor(env, {
      handle: cleaned,
      maxItems: 60,
      mode: "full",
      dateFrom,
      dateTo,
      includeComments: false,
    });
    return Array.isArray(actorResult.postItems) ? actorResult.postItems : [];
  }
  const items = [];
  let cursor = null;

  for (let page = 0; page < maxPages; page += 1) {
    const endpoint =
      sourceTab === "reels" ? "/v1/instagram/user/reels" : "/v2/instagram/user/posts";
    const payload = await scrapeCreatorsFetch(env, endpoint, {
      handle: cleaned,
      region,
      trim: false,
      ...(sourceTab === "reels" ? { max_id: cursor } : { next_max_id: cursor }),
    });
    const batch = extractList(payload);
    if (!batch.length) break;

    for (const raw of batch) {
      const publishedAt = toIsoDate(
        pickFirst(raw, [
          "taken_at",
          "created_at",
          "caption.created_at",
          "published_at",
          "timestamp",
        ]),
      );
      items.push({ raw, publishedAt });
    }

    cursor = extractNextCursor(payload);
    if (!cursor) break;

    if (dateFrom) {
      const lastPublishedAt = items[items.length - 1]?.publishedAt;
      if (lastPublishedAt && new Date(lastPublishedAt) < new Date(dateFrom)) {
        break;
      }
    }
  }

  return items
    .filter((entry) => {
      if (!entry.publishedAt) return true;
      if (dateFrom && new Date(entry.publishedAt) < new Date(dateFrom)) return false;
      if (dateTo && new Date(entry.publishedAt) > new Date(dateTo)) return false;
      return true;
    })
    .map((entry) => entry.raw);
}

export async function getInstagramComments(env, postUrl, region, limit = 80) {
  if (!canUseScrapeCreators(env)) {
    return [];
  }
  const comments = [];
  let cursor = null;

  for (let page = 0; page < 5 && comments.length < limit; page += 1) {
    const payload = await scrapeCreatorsFetch(env, "/v2/instagram/post/comments", {
      url: postUrl,
      region,
      cursor,
      trim: false,
    });
    const batch = extractList(payload);
    comments.push(...batch);
    cursor = extractNextCursor(payload);
    if (!cursor || !batch.length) break;
  }

  return comments.slice(0, limit);
}

export async function getInstagramTranscript(env, postUrl, region) {
  if (!canUseScrapeCreators(env)) {
    return "";
  }
  try {
    const payload = await scrapeCreatorsFetch(env, "/v2/instagram/media/transcript", {
      url: postUrl,
      region,
    });
    return (
      pickFirst(payload, ["transcript", "data.transcript", "text", "data.text"], "") || ""
    );
  } catch (error) {
    console.warn("[instagram] transcript skipped", error.message);
    return "";
  }
}

export function normalizeInstagramProfile(rawProfile, handle) {
  return {
    handle: cleanHandle(handle || pickFirst(rawProfile, ["username"], "")),
    platformUserId: String(
      pickFirst(rawProfile, ["user.id", "id", "pk", "data.user.id", "ownerId", "fbid"], ""),
    ),
    displayName: pickFirst(rawProfile, [
      "user.full_name",
      "full_name",
      "fullName",
      "name",
      "data.user.full_name",
    ], handle),
    biography: pickFirst(rawProfile, [
      "user.biography",
      "biography",
      "data.user.biography",
    ], ""),
    profilePicUrl: pickFirst(rawProfile, [
      "user.profile_pic_url",
      "profile_pic_url",
      "profilePicUrlHD",
      "profilePicUrl",
      "data.user.profile_pic_url",
    ], ""),
    followerCount: toNumber(
      pickFirst(rawProfile, [
        "user.follower_count",
        "follower_count",
        "followersCount",
        "followers",
        "data.user.follower_count",
      ], 0),
    ),
    followingCount: toNumber(
      pickFirst(rawProfile, [
        "user.following_count",
        "following_count",
        "followsCount",
        "following",
        "data.user.following_count",
      ], 0),
    ),
    mediaCount: toNumber(
      pickFirst(rawProfile, [
        "user.media_count",
        "media_count",
        "postsCount",
        "posts_count",
        "data.user.media_count",
      ], 0),
    ),
    rawPayload: rawProfile,
  };
}

export function normalizeInstagramMediaItem(raw, profile, sourceTab) {
  const caption =
    pickFirst(raw, ["caption.text", "caption", "title", "text"], "") || "";
  const url =
    pickFirst(raw, ["url", "link", "permalink", "code_url"], "").replace(/\?.*$/, "");
  const likeCount = toNumber(
    pickFirst(raw, ["like_count", "likes", "likesCount", "edge_media_preview_like.count"], 0),
  );
  const commentCount = toNumber(
    pickFirst(raw, ["comment_count", "comments", "commentsCount", "edge_media_to_comment.count"], 0),
  );
  const playCount = toNumber(
    pickFirst(raw, ["play_count", "video_play_count", "videoPlayCount", "view_count", "views"], 0),
  );
  const viewCount = toNumber(
    pickFirst(raw, ["view_count", "video_view_count", "videoViewCount", "videoPlayCount", "play_count", "views"], 0),
  );
  const followerCountSnapshot = profile.followerCount || 0;
  const engagementCount = likeCount + commentCount;
  const engagementRate = followerCountSnapshot
    ? Number(((engagementCount / followerCountSnapshot) * 100).toFixed(4))
    : 0;

  return {
    platform: "instagram",
    sourceTab,
    platformContentId: String(
      pickFirst(raw, ["id", "pk", "media.id", "code"], crypto.randomUUID()),
    ),
    shortcode: String(pickFirst(raw, ["code", "shortcode"], "")),
    url,
    mediaType: pickFirst(
      raw,
      ["media_type", "product_type", "__typename", "type"],
      sourceTab === "reels" ? "reel" : "post",
    ),
    caption,
    publishedAt: toIsoDate(
      pickFirst(raw, [
        "taken_at",
        "created_at",
        "caption.created_at",
        "published_at",
        "timestamp",
      ]),
    ),
    thumbnailUrl: pickFirst(
      raw,
      ["thumbnail_url", "display_url", "displayUrl", "image_url", "cover_url"],
      "",
    ),
    likeCount,
    commentCount,
    playCount,
    viewCount,
    engagementCount,
    engagementRate,
    followerCountSnapshot,
    rawPayload: raw,
  };
}

export function normalizeInstagramComment(raw) {
  return {
    platformCommentId: String(pickFirst(raw, ["id", "pk"], crypto.randomUUID())),
    authorHandle: pickFirst(raw, ["user.username", "username", "author.username"], ""),
    text: pickFirst(raw, ["text", "content"], ""),
    likeCount: toNumber(pickFirst(raw, ["like_count", "likes"], 0)),
    publishedAt: toIsoDate(
      pickFirst(raw, ["created_at", "timestamp", "taken_at"]),
    ),
    rawPayload: raw,
  };
}
