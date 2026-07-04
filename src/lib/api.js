import { supabase } from "./supabase";

// Calls a Cloudflare Pages Function under /api/*, attaching the current
// Supabase access token so the Function's middleware can authenticate.
async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

async function apiFetch(path, { method = "POST", body } = {}) {
  const accessToken = await getAccessToken();

  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const message = data?.error || data?.message || `Request gagal (${res.status})`;
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

