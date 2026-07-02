import { supabase } from "../../../lib/supabase";

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

async function aiFetch(path, { method = "GET", body } = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      data?.error || data?.message || `Request gagal (${response.status})`,
    );
  }

  return data;
}

export const aiApi = {
  listThreads: (agentSlug) =>
    aiFetch(`/api/ai/threads?agent=${encodeURIComponent(agentSlug)}`),
  getThreadMessages: (threadId) => aiFetch(`/api/ai/threads/${threadId}/messages`),
  getThreadArtifacts: (threadId) =>
    aiFetch(`/api/ai/threads/${threadId}/artifacts`),
  updateThread: (threadId, patch) =>
    aiFetch(`/api/ai/threads/${threadId}`, {
      method: "PATCH",
      body: patch,
    }),
  listKnowledge: (agentSlug, threadId) => {
    const params = new URLSearchParams();
    if (agentSlug) params.set("agent", agentSlug);
    if (threadId) params.set("threadId", threadId);
    return aiFetch(`/api/ai/knowledge?${params.toString()}`);
  },
  ingestKnowledge: (payload) =>
    aiFetch("/api/ai/knowledge", {
      method: "POST",
      body: payload,
    }),
  createThread: (agentSlug, title = "Obrolan Baru") =>
    aiFetch("/api/ai/threads", {
      method: "POST",
      body: { agentSlug, title },
    }),
  sendMessage: ({ threadId, agentSlug, message }) =>
    aiFetch("/api/ai/messages", {
      method: "POST",
      body: { threadId, agentSlug, message },
    }),
  sendMessageStream: async ({
    threadId,
    agentSlug,
    message,
    attachments = [],
    useKnowledge = false,
    onEvent,
  }) => {
    const accessToken = await getAccessToken();
    const response = await fetch("/api/ai/messages/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        threadId,
        agentSlug,
        message,
        attachments,
        useKnowledge,
      }),
    });

    if (!response.ok || !response.body) {
      const text = await response.text();
      throw new Error(text || "Gagal membuka stream AI.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalPayload = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const block of events) {
        const lines = block.split("\n");
        const eventLine = lines.find((line) => line.startsWith("event: "));
        const dataLine = lines.find((line) => line.startsWith("data: "));
        if (!eventLine || !dataLine) continue;

        const eventName = eventLine.slice(7).trim();
        let payload = null;
        try {
          payload = JSON.parse(dataLine.slice(6));
        } catch {
          payload = null;
        }

        onEvent?.(eventName, payload);

        if (eventName === "error") {
          throw new Error(payload?.error || "Stream AI gagal.");
        }
        if (eventName === "done") {
          finalPayload = payload;
        }
      }
    }

    return finalPayload;
  },
};
