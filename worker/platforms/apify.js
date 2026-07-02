import { HttpError } from "../lib/http.js";

const APIFY_BASE_URL = "https://api.apify.com/v2";

function getApiToken(env) {
  const token = env.APIFY_API_TOKEN;
  if (!token) {
    throw new HttpError(500, "APIFY_API_TOKEN belum dikonfigurasi di environment Worker.");
  }
  return token;
}

function buildUrl(path, query = {}, token) {
  const url = new URL(`${APIFY_BASE_URL}${path}`);
  url.searchParams.set("token", token);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parseJsonSafe(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text ? { raw: text } : null;
  }
}

export async function apifyRequest(env, path, { method = "GET", body, query } = {}) {
  const token = getApiToken(env);
  const response = await fetch(buildUrl(path, query, token), {
    method,
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      data?.error ||
      `Apify error ${response.status}`;
    throw new Error(message);
  }
  return data;
}

function resolveActorId(env, actorId) {
  const resolved = actorId || env.APIFY_TIKTOK_ACTOR_ID;
  if (!resolved) {
    throw new HttpError(500, "APIFY_TIKTOK_ACTOR_ID belum dikonfigurasi.");
  }
  return resolved;
}

function replaceTemplateTokens(value, tokens) {
  if (typeof value === "string") {
    const wholeTokenMatch = value.match(/^\{\{\s*([a-zA-Z0-9_]+)\s*\}\}$/);
    if (wholeTokenMatch) {
      const tokenValue = tokens[wholeTokenMatch[1]];
      return tokenValue !== undefined ? tokenValue : "";
    }
    return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) =>
      tokens[key] !== undefined && tokens[key] !== null ? String(tokens[key]) : "",
    );
  }
  if (Array.isArray(value)) {
    return value.map((entry) => replaceTemplateTokens(entry, tokens));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        replaceTemplateTokens(entry, tokens),
      ]),
    );
  }
  return value;
}

// Apify's clockworks/tiktok-scraper expects an ISO `YYYY-MM-DD` date for its
// `oldestPostDateUnified` / `newestPostDate` filters, not a full ISO timestamp.
function toActorDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function buildTikTokActorInput(env, input) {
  const handle = String(input.handle || "").replace(/^@/, "");
  const tokens = {
    handle,
    username: handle,
    profileUrl: `https://www.tiktok.com/@${handle}`,
    maxItems: input.maxItems,
    dateFrom: toActorDate(input.dateFrom),
    dateTo: toActorDate(input.dateTo),
  };

  if (env.APIFY_TIKTOK_INPUT_TEMPLATE) {
    try {
      const template = JSON.parse(env.APIFY_TIKTOK_INPUT_TEMPLATE);
      return replaceTemplateTokens(template, tokens);
    } catch (error) {
      throw new HttpError(
        500,
        `APIFY_TIKTOK_INPUT_TEMPLATE tidak valid: ${String(error.message).slice(0, 140)}`,
      );
    }
  }

  // Native clockworks/tiktok-scraper input schema. Only the keys the actor
  // actually understands are sent; download flags are disabled to keep runs
  // fast and cheap since we only need metadata + metrics.
  const actorInput = {
    profiles: [handle],
    resultsPerPage: input.maxItems,
    profileScrapeSections: ["videos"],
    profileSorting: "latest",
    excludePinnedPosts: false,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadSubtitles: false,
    shouldDownloadSlideshowImages: false,
    shouldDownloadAvatars: false,
    shouldDownloadMusicCovers: false,
  };
  if (tokens.dateFrom) actorInput.oldestPostDateUnified = tokens.dateFrom;
  if (tokens.dateTo) actorInput.newestPostDate = tokens.dateTo;
  return actorInput;
}

export async function startActorRun(env, { actorId, input }) {
  const resolvedActorId = resolveActorId(env, actorId);
  const data = await apifyRequest(env, `/acts/${resolvedActorId}/runs`, {
    method: "POST",
    body: input,
  });
  return data?.data || data;
}

export async function getActorRun(env, runId) {
  const data = await apifyRequest(env, `/actor-runs/${runId}`);
  return data?.data || data;
}

export async function waitForRunCompletion(env, runId, {
  timeoutMs = 5 * 60 * 1000,
  pollIntervalMs = 3500,
} = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const run = await getActorRun(env, runId);
    const status = String(run?.status || "").toUpperCase();
    if (status === "SUCCEEDED") return run;
    if (["FAILED", "ABORTED", "TIMED-OUT"].includes(status)) {
      throw new Error(`Apify run berakhir dengan status ${status}.`);
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  throw new Error("Apify run timeout sebelum selesai.");
}

export async function getDatasetItems(env, datasetId, query = {}) {
  const data = await apifyRequest(env, `/datasets/${datasetId}/items`, {
    query: {
      clean: true,
      format: "json",
      ...query,
    },
  });
  return Array.isArray(data) ? data : [];
}
