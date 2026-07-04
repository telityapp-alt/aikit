import { requireEnv } from "../lib/env.js";
import { HttpError } from "../lib/http.js";

const DEFAULT_DATASET_ID = "gd_l1vikfch901nx3by4";
const MAX_URLS = 100;

function normalizeInstagramUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  let url = raw;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes("instagram.com")) return null;

    parsed.hash = "";
    parsed.search = "";

    const parts = parsed.pathname.split("/").filter(Boolean);
    if (!parts.length) return null;

    return `https://www.instagram.com/${parts[0]}/`;
  } catch {
    return null;
  }
}

function sanitizeNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function buildProfileRow(item) {
  return {
    source_url: item.url || item.profile_url || null,
    username: item.account || item.user_name || null,
    display_name: item.profile_name || item.full_name || null,
    full_name: item.full_name || null,
    followers: sanitizeNullableNumber(item.followers),
    following: sanitizeNullableNumber(item.following),
    posts_count: sanitizeNullableNumber(item.posts_count),
    highlights_count: sanitizeNullableNumber(item.highlights_count),
    avg_engagement: sanitizeNullableNumber(item.avg_engagement),
    is_private: Boolean(item.is_private),
    is_verified: Boolean(item.is_verified),
    is_business_account: Boolean(item.is_business_account),
    is_professional_account: Boolean(item.is_professional_account),
    business_category_name: item.business_category_name || null,
    category_name: item.category_name || null,
    biography: item.biography || null,
    external_url: item.external_url || null,
    email_address: item.email_address || null,
    phone_number: item.business_phone_number || null,
    business_address: item.business_address || null,
    profile_image_link: item.profile_image_link || null,
    latest_posts_count: Array.isArray(item.posts) ? item.posts.length : 0,
    highlights: Array.isArray(item.highlights) ? item.highlights : [],
    related_accounts: Array.isArray(item.related_accounts) ? item.related_accounts : [],
  };
}

function summarizeProfiles(profiles) {
  const totals = profiles.reduce(
    (acc, profile) => {
      acc.followers += profile.followers || 0;
      acc.posts += profile.latest_posts_count || 0;
      acc.verified += profile.is_verified ? 1 : 0;
      acc.business += profile.is_business_account ? 1 : 0;
      acc.private += profile.is_private ? 1 : 0;
      acc.withEmail += profile.email_address ? 1 : 0;
      acc.withExternalUrl += profile.external_url ? 1 : 0;
      return acc;
    },
    {
      followers: 0,
      posts: 0,
      verified: 0,
      business: 0,
      private: 0,
      withEmail: 0,
      withExternalUrl: 0,
    },
  );

  return {
    total_profiles: profiles.length,
    verified_profiles: totals.verified,
    business_profiles: totals.business,
    private_profiles: totals.private,
    with_email: totals.withEmail,
    with_external_url: totals.withExternalUrl,
    total_followers: totals.followers,
    average_followers: profiles.length ? Math.round(totals.followers / profiles.length) : 0,
    total_posts_captured: totals.posts,
  };
}

async function parseResponseBody(response) {
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";

  if (!text) return null;
  if (contentType.includes("application/jsonl")) {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
  if (contentType.includes("application/json")) {
    return JSON.parse(text);
  }

  const trimmed = text.trim();
  if (trimmed.includes("\n")) {
    const lines = trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length > 1 && lines.every((line) => line.startsWith("{"))) {
      return lines.map((line) => JSON.parse(line));
    }
  }
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return JSON.parse(trimmed);
  }

  return trimmed;
}

export const instagramProfilesBrightData = {
  slug: "instagram-profiles-brightdata",
  title: "Instagram Profiles by URL",

  validateInput(input) {
    const rawUrls = Array.isArray(input?.urls)
      ? input.urls
      : String(input?.urls_text || input?.urlsText || "")
          .split(/\r?\n/)
          .filter(Boolean);

    const seen = new Set();
    const urls = [];
    const invalid = [];

    for (const raw of rawUrls) {
      const normalized = normalizeInstagramUrl(raw);
      if (!normalized) {
        invalid.push(String(raw));
        continue;
      }
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      urls.push(normalized);
    }

    if (!urls.length) {
      throw new HttpError(400, "Masukkan minimal satu URL Instagram yang valid.");
    }

    if (invalid.length) {
      throw new HttpError(400, "Ada URL Instagram yang tidak valid.", {
        invalid: invalid.slice(0, 10),
      });
    }

    if (urls.length > MAX_URLS) {
      throw new HttpError(400, `Maksimal ${MAX_URLS} URL per run.`);
    }

    const limitPerInput =
      input?.limit_per_input === null || input?.limit_per_input === undefined
        ? null
        : Number(input.limit_per_input);

    if (limitPerInput !== null && (!Number.isInteger(limitPerInput) || limitPerInput <= 0)) {
      throw new HttpError(400, "limit_per_input harus berupa angka bulat positif.");
    }

    return {
      urls,
      limit_per_input: limitPerInput,
    };
  },

  async execute(env, validatedInput) {
    const apiKey = requireEnv(env, "BRIGHTDATA_API_KEY");
    const datasetId =
      env.BRIGHTDATA_INSTAGRAM_PROFILES_DATASET_ID ||
      env.BRIGHTDATA_INSTAGRAM_DATASET_ID ||
      DEFAULT_DATASET_ID;

    const params = new URLSearchParams({
      dataset_id: datasetId,
      notify: "false",
      include_errors: "true",
    });

    const body = {
      input: validatedInput.urls.map((url) => ({ url })),
      limit_per_input: validatedInput.limit_per_input,
    };

    const response = await fetch(`https://api.brightdata.com/datasets/v3/scrape?${params}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = await parseResponseBody(response);

    if (response.status === 202) {
      return {
        status: "running",
        output: {
          provider: "brightdata",
          mode: "pending-snapshot",
          snapshot_id: payload?.snapshot_id || null,
          message:
            payload?.message ||
            "Bright Data masih memproses snapshot ini. Cek kembali status run beberapa saat lagi.",
          requested_urls: validatedInput.urls,
          request: body,
        },
      };
    }

    if (!response.ok) {
      throw new HttpError(
        502,
        "Bright Data mengembalikan error saat scrape Instagram Profiles.",
        payload,
      );
    }

    const items = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

    const errors = Array.isArray(payload?.errors)
      ? payload.errors
      : items.filter((item) => item?.error);

    const profiles = items
      .filter((item) => item && typeof item === "object" && !item.error)
      .map(buildProfileRow);

    return {
      status: "completed",
      output: {
        provider: "brightdata",
        mode: "sync",
        dataset_id: datasetId,
        requested_urls: validatedInput.urls,
        request: body,
        summary: summarizeProfiles(profiles),
        profiles,
        errors,
        raw: payload,
      },
    };
  },
};
