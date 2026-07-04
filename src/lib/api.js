import { supabase } from "./supabase";

// Calls a Cloudflare Pages Function under /api/*, attaching the current
// Supabase access token so the Function's middleware can authenticate.
async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

function isLocalDevHost() {
  if (typeof window === "undefined") return false;
  const { hostname, port, protocol } = window.location;
  return (
    protocol.startsWith("http") &&
    (hostname === "127.0.0.1" || hostname === "localhost") &&
    (port === "4173" || port === "5173")
  );
}

function localDevApiHint(status) {
  if (!isLocalDevHost()) return null;
  if (status !== 404 && status !== 502 && status !== 503) return null;

  return [
    "Local API belum terhubung ke Worker.",
    "Jalankan `npm run dev:local` / `npm run dev:full`, atau jalankan `npm run dev:worker` di port 8787 saat Vite dev aktif.",
  ].join(" ");
}

async function apiFetch(path, { method = "POST", body } = {}) {
  const accessToken = await getAccessToken();
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (isLocalDevHost()) {
      throw new Error(
        "Tidak bisa menjangkau local Worker. Jalankan `npm run dev:local` / `npm run dev:full`, atau hidupkan `npm run dev:worker` di port 8787.",
      );
    }
    throw error;
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const message =
      localDevApiHint(res.status) ||
      data?.error ||
      data?.message ||
      `Request gagal (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  runAutomation: (slug, input) =>
    apiFetch("/api/runs", { body: { slug, input } }),
  getAutomationCatalog: () =>
    apiFetch("/api/automation-catalog", { method: "GET" }),
  getRecentAutomationRuns: () =>
    apiFetch("/api/automation-runs/recent", { method: "GET" }),
  getAutomationRunStatus: (runId) =>
    apiFetch(`/api/automation-runs/${runId}`, { method: "GET" }),
  getAutomationFiles: () =>
    apiFetch("/api/automation-files", { method: "GET" }),
  sendChat: (chatId, message, moduleSlug) =>
    apiFetch("/api/chat", { body: { chatId, message, moduleSlug } }),
  topUp: (amount) => apiFetch("/api/topup", { body: { amount } }),
};

