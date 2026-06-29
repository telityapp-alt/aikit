import { supabase } from "./supabase";

// Calls a Cloudflare Pages Function under /api/*, attaching the current
// Supabase access token so the Function's middleware can authenticate.
async function apiFetch(path, { method = "POST", body } = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
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
  sendChat: (chatId, message) =>
    apiFetch("/api/chat", { body: { chatId, message } }),
  topUp: (amount) => apiFetch("/api/topup", { body: { amount } }),
};
