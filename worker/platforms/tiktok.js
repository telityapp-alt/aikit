import { HttpError } from "../lib/http.js";
import {
  buildTikTokActorInput,
  getDatasetItems,
  startActorRun,
  waitForRunCompletion,
} from "./apify.js";

function cleanHandle(handle) {
  return String(handle || "")
    .trim()
    .replace(/^@/, "")
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
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return fallback;
}

function extractVideoId(raw) {
  const directId = pickFirst(raw, ["id", "videoId", "aweme_id", "awemeId"], "");
  if (directId) return String(directId);
  const url = pickFirst(raw, ["webVideoUrl", "url", "videoUrl"], "");
  const match = String(url).match(/\/video\/(\d+)/);
  return match?.[1] || crypto.randomUUID();
}

export function validateTikTokInput(input) {
  const handle = cleanHandle(input?.handle || input?.tiktokHandle || input?.username);
  const maxItems = Math.min(100, Math.max(1, Number(input?.maxItems || input?.limit || 20)));
  const dateFrom = input?.dateFrom ? new Date(input.dateFrom) : null;
  const dateTo = input?.dateTo ? new Date(input.dateTo) : null;

  if (!handle) {
    throw new HttpError(400, "Handle TikTok wajib diisi.");
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

  return {
    handle,
    maxItems,
    dateFrom: dateFrom ? dateFrom.toISOString() : null,
    dateTo: dateTo ? dateTo.toISOString() : null,
    includeComments: input?.includeComments === true,
  };
}

export async function runTikTokProfileActor(env, input) {
  const actorInput = buildTikTokActorInput(env, input);
  const startedRun = await startActorRun(env, {
    actorId: env.APIFY_TIKTOK_ACTOR_ID,
    input: actorInput,
  });
  const completedRun = await waitForRunCompletion(env, startedRun.id);
  const datasetId =
    completedRun?.defaultDatasetId || startedRun?.defaultDatasetId || null;
  if (!datasetId) {
    throw new Error("Apify run selesai tapi dataset tidak tersedia.");
  }

  const items = await getDatasetItems(env, datasetId, {
    limit: input.maxItems,
    desc: 1,
  });

  return {
    actorInput,
    run: completedRun,
    datasetId,
    items,
  };
}

export function normalizeTikTokProfile(items, handle) {
  const firstItem = items[0] || {};
  const profileUrl = `https://www.tiktok.com/@${cleanHandle(handle)}`;
  return {
    handle: cleanHandle(handle),
    platformUserId: String(
      pickFirst(firstItem, ["authorMeta.id", "author.id", "authorId"], ""),
    ),
    displayName: pickFirst(firstItem, ["authorMeta.name", "authorMeta.nickName"], handle),
    profileUrl,
    profilePicUrl: pickFirst(firstItem, ["authorMeta.avatar", "author.avatar"], ""),
    followerCount: toNumber(
      pickFirst(firstItem, ["authorMeta.fans", "authorMeta.followerCount", "author.stats.followerCount"], 0),
    ),
    followingCount: toNumber(
      pickFirst(firstItem, ["authorMeta.following", "author.stats.followingCount"], 0),
    ),
    likesCount: toNumber(
      pickFirst(firstItem, ["authorMeta.heart", "author.stats.heartCount"], 0),
    ),
    rawPayload: {
      source: "apify",
      sample: firstItem,
      itemCount: items.length,
    },
  };
}

export function normalizeTikTokVideoItem(raw, profile) {
  const publishedAt = toIsoDate(
    pickFirst(raw, ["createTimeISO", "createTime", "createdAt"], null),
  );
  const likeCount = toNumber(pickFirst(raw, ["diggCount", "stats.diggCount"], 0));
  const commentCount = toNumber(pickFirst(raw, ["commentCount", "stats.commentCount"], 0));
  const shareCount = toNumber(pickFirst(raw, ["shareCount", "stats.shareCount"], 0));
  const saveCount = toNumber(pickFirst(raw, ["collectCount", "stats.collectCount"], 0));
  const viewCount = toNumber(pickFirst(raw, ["playCount", "stats.playCount"], 0));
  const durationSeconds = toNumber(
    pickFirst(raw, ["videoMeta.duration", "video.duration", "duration"], 0),
  );
  const engagementCount = likeCount + commentCount + shareCount + saveCount;
  const viewToEngagementRate = viewCount
    ? Number(((engagementCount / viewCount) * 100).toFixed(4))
    : 0;
  const shareRate = viewCount
    ? Number(((shareCount / viewCount) * 100).toFixed(4))
    : 0;
  const saveRate = viewCount
    ? Number(((saveCount / viewCount) * 100).toFixed(4))
    : 0;
  const commentRate = viewCount
    ? Number(((commentCount / viewCount) * 100).toFixed(4))
    : 0;
  const followerCountSnapshot = profile.followerCount || 0;
  const engagementRate = followerCountSnapshot
    ? Number(((engagementCount / followerCountSnapshot) * 100).toFixed(4))
    : 0;

  return {
    platform: "tiktok",
    platformContentId: extractVideoId(raw),
    url: pickFirst(raw, ["webVideoUrl", "url", "videoUrl"], ""),
    contentType: "video",
    caption: pickFirst(raw, ["text", "desc", "caption"], ""),
    publishedAt,
    thumbnailUrl: pickFirst(raw, ["covers.default", "thumbnail", "cover"], ""),
    durationSeconds,
    musicName: pickFirst(raw, ["musicMeta.musicName", "music.title"], ""),
    musicAuthor: pickFirst(raw, ["musicMeta.musicAuthor", "music.authorName"], ""),
    musicOriginal: Boolean(
      pickFirst(raw, ["musicMeta.musicOriginal", "music.isOriginal"], false),
    ),
    likeCount,
    commentCount,
    shareCount,
    saveCount,
    viewCount,
    engagementCount,
    engagementRate,
    viewToEngagementRate,
    shareRate,
    saveRate,
    commentRate,
    followerCountSnapshot,
    rawPayload: raw,
  };
}
