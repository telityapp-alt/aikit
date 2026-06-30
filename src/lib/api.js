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

async function downloadFile(path, filename) {
  const accessToken = await getAccessToken();
  const res = await fetch(path, {
    method: "GET",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  if (!res.ok) {
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    throw new Error(
      data?.error || data?.message || `Download gagal (${res.status})`,
    );
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const api = {
  runAutomation: (slug, input) =>
    apiFetch("/api/runs", { body: { slug, input } }),
  getInstagramCompetitorReports: () =>
    apiFetch("/api/instagram-competitor-reports", { method: "GET" }),
  getInstagramCompetitorReport: (reportId) =>
    apiFetch(`/api/instagram-competitor-reports/${reportId}`, {
      method: "GET",
    }),
  downloadInstagramCompetitorReport: (reportId, handle = "report") =>
    downloadFile(
      `/api/instagram-competitor-reports/${reportId}/download`,
      `instagram-competitor-report-${handle}.xlsx`,
    ),
  sendChat: (chatId, message, moduleSlug) =>
    apiFetch("/api/chat", { body: { chatId, message, moduleSlug } }),
  topUp: (amount) => apiFetch("/api/topup", { body: { amount } }),
};
