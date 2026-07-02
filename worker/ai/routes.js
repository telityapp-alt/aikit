import { clientIp, db, getUser, rpc } from "../lib/supabase.js";
import { HttpError, corsHeaders, json, readJson } from "../lib/http.js";
import { getAgent, resolveModelRoute } from "./registry.js";

const AI_RATE_LIMIT = {
  bucket: "ai-chat",
  limit: 80,
  window: 60,
};

const KNOWLEDGE_MAX_INPUT = 24000;
const KNOWLEDGE_CHUNK_SIZE = 1200;
const KNOWLEDGE_CHUNK_OVERLAP = 180;

async function rateLimit(env, userId) {
  try {
    const allowed = await rpc(env, "rate_limit_check", {
      p_user: userId,
      p_bucket: AI_RATE_LIMIT.bucket,
      p_limit: AI_RATE_LIMIT.limit,
      p_window: AI_RATE_LIMIT.window,
    });
    if (allowed === false) {
      throw new HttpError(429, "Terlalu banyak permintaan ke AI. Coba lagi sebentar.");
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error("[worker][ai] rate limit check failed", error);
  }
}

async function fetchThread(env, threadId, userId) {
  const rows = await db(
    env,
    `chats?id=eq.${threadId}&user_id=eq.${userId}&select=*`,
  );
  return rows?.[0] || null;
}

async function fetchThreadMessages(env, threadId) {
  return db(
    env,
    `messages?chat_id=eq.${threadId}&order=created_at.asc&select=*`,
  );
}

async function fetchThreadArtifacts(env, threadId) {
  return db(
    env,
    `chat_artifacts?thread_id=eq.${threadId}&order=updated_at.desc&select=*`,
  );
}

async function fetchKnowledgeDocuments(env, userId, { agentSlug, threadId, limit = 25 } = {}) {
  const filters = [
    `user_id=eq.${userId}`,
    agentSlug ? `agent_slug=eq.${encodeURIComponent(agentSlug)}` : null,
    threadId ? `thread_id=eq.${threadId}` : null,
    `order=updated_at.desc`,
    `limit=${limit}`,
    "select=*",
  ].filter(Boolean);

  return db(env, `ai_knowledge_documents?${filters.join("&")}`);
}

async function fetchKnowledgeChunks(env, userId, { agentSlug, limit = 200 } = {}) {
  const filters = [
    `user_id=eq.${userId}`,
    agentSlug ? `agent_slug=eq.${encodeURIComponent(agentSlug)}` : null,
    `order=created_at.desc`,
    `limit=${limit}`,
    "select=*",
  ].filter(Boolean);

  return db(env, `ai_knowledge_chunks?${filters.join("&")}`);
}

async function callAnthropic({ env, model, maxTokens, systemPrompt, messages }) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

function extractGatewayText(payload) {
  if (!payload) return "";
  if (typeof payload.reply === "string") return payload.reply;
  if (typeof payload.output_text === "string") return payload.output_text;
  if (typeof payload.text === "string") return payload.text;

  const messageContent = payload?.choices?.[0]?.message?.content;
  if (typeof messageContent === "string") return messageContent;
  if (Array.isArray(messageContent)) {
    return messageContent
      .map((part) => part?.text || part?.content || "")
      .filter(Boolean)
      .join("\n");
  }

  const contentBlocks = payload?.content;
  if (Array.isArray(contentBlocks)) {
    return contentBlocks.map((part) => part?.text || "").filter(Boolean).join("\n");
  }

  return "";
}

async function callGateway({ env, route, agent, messages, systemPrompt }) {
  const response = await fetch(env.AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(env.AI_GATEWAY_KEY ? { Authorization: `Bearer ${env.AI_GATEWAY_KEY}` } : {}),
      ...(env.AI_GATEWAY_API_KEY ? { "x-api-key": env.AI_GATEWAY_API_KEY } : {}),
    },
    body: JSON.stringify({
      route: route.alias,
      provider: route.provider,
      model: route.model,
      max_tokens: route.maxTokens,
      temperature: route.temperature ?? 0.4,
      system: systemPrompt,
      messages,
      metadata: {
        agent_slug: agent.slug,
      },
    }),
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || text || "Gateway error");
  }

  return {
    payload,
    reply: extractGatewayText(payload) || "(tidak ada respons)",
    usage: payload?.usage || payload?.token_usage || null,
    providerRequestId:
      payload?.request_id ||
      payload?.provider_request_id ||
      payload?.id ||
      response.headers.get("x-request-id") ||
      null,
  };
}

async function createThread(env, userId, agentSlug, title = "Obrolan Baru") {
  const [thread] = await db(env, "chats", {
    method: "POST",
    prefer: "return=representation",
    body: {
      user_id: userId,
      agent_slug: agentSlug,
      title,
      status: "active",
      metadata: {},
      last_message_at: new Date().toISOString(),
    },
  });

  return thread;
}

function splitIntoKnowledgeChunks(text, chunkSize = KNOWLEDGE_CHUNK_SIZE) {
  const normalized = String(text || "").replace(/\r/g, "").trim();
  if (!normalized) return [];

  const chunks = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(normalized.length, start + chunkSize);
    const slice = normalized.slice(start, end).trim();
    if (slice) chunks.push(slice);
    if (end >= normalized.length) break;
    start = Math.max(end - KNOWLEDGE_CHUNK_OVERLAP, start + 1);
  }
  return chunks;
}

async function createAssistantArtifact({
  env,
  threadId,
  userId,
  agentSlug,
  assistantMessageId,
  prompt,
  reply,
}) {
  const titleBase = prompt.slice(0, 48) || "Output baru";
  const [artifact] = await db(env, "chat_artifacts", {
    method: "POST",
    prefer: "return=representation",
    body: {
      thread_id: threadId,
      message_id: assistantMessageId,
      user_id: userId,
      agent_slug: agentSlug,
      type: "assistant_note",
      title: `${titleBase}${titleBase.length >= 48 ? "..." : ""}`,
      summary: reply.slice(0, 220),
      content_json: {
        text: reply,
        source: "assistant_message",
      },
      source_refs: [],
    },
  });

  await db(env, `chats?id=eq.${threadId}`, {
    method: "PATCH",
    body: {
      last_artifact_at: new Date().toISOString(),
    },
  }).catch((error) => console.error("[worker][ai] thread artifact touch failed", error));

  return artifact;
}

async function createKnowledgeDocument({
  env,
  userId,
  agentSlug,
  threadId = null,
  title,
  text,
  sourceType = "note",
  fileName = null,
  mimeType = "text/plain",
  metadata = {},
}) {
  const contentText = String(text || "").trim().slice(0, KNOWLEDGE_MAX_INPUT);
  if (!contentText) {
    throw new HttpError(400, "Knowledge text kosong.");
  }

  const [document] = await db(env, "ai_knowledge_documents", {
    method: "POST",
    prefer: "return=representation",
    body: {
      user_id: userId,
      agent_slug: agentSlug,
      thread_id: threadId,
      title: title?.trim() || fileName || "Knowledge note",
      source_type: sourceType,
      file_name: fileName,
      mime_type: mimeType,
      content_text: contentText,
      content_preview: contentText.slice(0, 220),
      token_estimate: Math.ceil(contentText.length / 4),
      metadata,
    },
  });

  const chunks = splitIntoKnowledgeChunks(contentText);
  if (chunks.length > 0) {
    await db(env, "ai_knowledge_chunks", {
      method: "POST",
      body: chunks.map((chunk, index) => ({
        document_id: document.id,
        user_id: userId,
        agent_slug: agentSlug,
        chunk_index: index,
        content: chunk,
        content_preview: chunk.slice(0, 180),
        metadata: {
          title: document.title,
          source_type: sourceType,
        },
      })),
    });
  }

  return document;
}

function tokenizeForSearch(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function scoreChunk(queryTokens, chunk, preferredDocumentIds) {
  const haystack = `${chunk.content} ${chunk.content_preview || ""}`.toLowerCase();
  let score = 0;

  for (const token of queryTokens) {
    if (haystack.includes(token)) score += token.length > 6 ? 3 : 2;
  }

  if (preferredDocumentIds.has(chunk.document_id)) score += 5;
  if (chunk.agent_slug === "knowledge") score += 1;

  return score;
}

async function retrieveKnowledgeContext(env, userId, agentSlug, query, preferredDocumentIds = []) {
  const chunks = await fetchKnowledgeChunks(env, userId, { limit: 240 });
  if (!chunks?.length) return { contextText: "", chunks: [] };

  const queryTokens = tokenizeForSearch(query);
  const preferred = new Set(preferredDocumentIds);
  const ranked = chunks
    .map((chunk) => ({
      ...chunk,
      _score: scoreChunk(queryTokens, chunk, preferred),
    }))
    .filter((chunk) => chunk._score > 0 || chunk.agent_slug === agentSlug || preferred.has(chunk.document_id))
    .sort((left, right) => right._score - left._score || left.chunk_index - right.chunk_index)
    .slice(0, 6);

  if (ranked.length === 0) return { contextText: "", chunks: [] };

  const contextText = ranked
    .map(
      (chunk, index) =>
        `Context ${index + 1} (${chunk.metadata?.title || "Knowledge"}):\n${chunk.content}`,
    )
    .join("\n\n");

  return { contextText, chunks: ranked };
}

function normalizeAttachment(input) {
  if (!input || typeof input !== "object") return null;
  const text = String(input.text || "").trim();
  if (!text) return null;

  return {
    title: String(input.title || input.fileName || "Lampiran").slice(0, 120),
    text: text.slice(0, KNOWLEDGE_MAX_INPUT),
    fileName: input.fileName ? String(input.fileName).slice(0, 180) : null,
    mimeType: input.mimeType ? String(input.mimeType).slice(0, 120) : "text/plain",
    sourceType: input.sourceType ? String(input.sourceType).slice(0, 40) : "attachment",
  };
}

async function executeAiTurn({ request, env, user, payload }) {
  const message = String(payload?.message || "").trim();
  const agentSlug = payload?.agentSlug;

  if (!message) {
    throw new HttpError(400, "Pesan kosong.");
  }

  const agent = getAgent(agentSlug);
  if (!agent) {
    throw new HttpError(400, "Agent tidak valid.");
  }

  const route = resolveModelRoute(agent.modelAlias, env);
  const cost = agent.costPerMessage ?? 1;

  if (cost > 0) {
    try {
      await rpc(env, "spend_credits", { p_user: user.id, p_amount: cost });
    } catch (error) {
      if (String(error.message).includes("INSUFFICIENT_CREDITS")) {
        throw new HttpError(402, "Saldo kredit tidak cukup.");
      }
      throw error;
    }
  }

  const startedAt = Date.now();
  let threadId = payload?.threadId;
  let thread = null;

  if (threadId) {
    thread = await fetchThread(env, threadId, user.id);
    if (!thread) {
      throw new HttpError(404, "Thread tidak ditemukan.");
    }
    if (thread.agent_slug !== agentSlug) {
      throw new HttpError(400, "Thread ini milik agent lain.");
    }
  } else {
    thread = await createThread(env, user.id, agentSlug, message.slice(0, 60));
    threadId = thread.id;
  }

  const [userMessage] = await db(env, "messages", {
    method: "POST",
    prefer: "return=representation",
    body: {
      chat_id: threadId,
      user_id: user.id,
      role: "user",
      content: message,
      agent_slug: agentSlug,
      status: "completed",
    },
  });

  const attachments = Array.isArray(payload?.attachments)
    ? payload.attachments.map(normalizeAttachment).filter(Boolean).slice(0, 5)
    : [];

  const ingestedDocuments = [];
  for (const attachment of attachments) {
    const document = await createKnowledgeDocument({
      env,
      userId: user.id,
      agentSlug: agent.slug === "knowledge" ? "knowledge" : agent.slug,
      threadId,
      title: attachment.title,
      text: attachment.text,
      sourceType: attachment.sourceType,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      metadata: {
        origin: "chat_attachment",
      },
    });
    ingestedDocuments.push(document);
  }

  const history = await fetchThreadMessages(env, threadId);
  const providerMessages = history
    .filter((entry) => entry.role !== "system" && entry.role !== "event")
    .map((entry) => ({
      role: entry.role === "user" ? "user" : "assistant",
      content: entry.content,
    }));

  const shouldUseKnowledge =
    agent.slug === "knowledge" ||
    attachments.length > 0 ||
    payload?.useKnowledge === true;

  let knowledgeContext = { contextText: "", chunks: [] };
  if (shouldUseKnowledge) {
    knowledgeContext = await retrieveKnowledgeContext(
      env,
      user.id,
      agent.slug,
      message,
      ingestedDocuments.map((document) => document.id),
    );
  }

  const contextualSystemPrompt = [
    agent.systemPrompt,
    knowledgeContext.contextText
      ? `Gunakan knowledge context berikut hanya jika relevan. Kutip secara ringkas dan jangan mengarang detail di luar context.\n\n${knowledgeContext.contextText}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  let reply = "AI Agent siap, tapi AI gateway belum dipasang di environment Worker.";
  let usage = null;
  let resolvedModel = route.model;
  let provider = env.AI_GATEWAY_URL ? "gateway" : route.provider;
  let latencyMs = Date.now() - startedAt;
  let providerRequestId = null;

  try {
    if (env.AI_GATEWAY_URL) {
      const result = await callGateway({
        env,
        route,
        agent,
        messages: providerMessages,
        systemPrompt: contextualSystemPrompt,
      });
      reply = result.reply;
      usage = result.usage;
      providerRequestId = result.providerRequestId;
      latencyMs = Date.now() - startedAt;
    } else if (env.ANTHROPIC_API_KEY) {
      const result = await callAnthropic({
        env,
        model: route.model,
        maxTokens: route.maxTokens,
        systemPrompt: contextualSystemPrompt,
        messages: providerMessages,
      });
      reply = result?.content?.[0]?.text || "(tidak ada respons)";
      usage = result?.usage || null;
      providerRequestId = result?.id || null;
      latencyMs = Date.now() - startedAt;
    } else if (cost > 0) {
      await rpc(env, "add_credits", { p_user: user.id, p_amount: cost }).catch(
        console.error,
      );
    }
  } catch (error) {
    if (cost > 0) {
      await rpc(env, "add_credits", { p_user: user.id, p_amount: cost }).catch(
        console.error,
      );
    }
    throw new HttpError(502, `AI error: ${String(error.message).slice(0, 200)}`);
  }

  const [assistantMessage] = await db(env, "messages", {
    method: "POST",
    prefer: "return=representation",
    body: {
      chat_id: threadId,
      user_id: user.id,
      role: "assistant",
      content: reply,
      agent_slug: agentSlug,
      status: "completed",
      provider,
      model: resolvedModel,
      latency_ms: latencyMs,
    },
  });

  const artifact = await createAssistantArtifact({
    env,
    threadId,
    userId: user.id,
    agentSlug,
    assistantMessageId: assistantMessage.id,
    prompt: message,
    reply,
  }).catch((error) => {
    console.error("[worker][ai] artifact create failed", error);
    return null;
  });

  await db(env, `chats?id=eq.${threadId}`, {
    method: "PATCH",
    body: {
      updated_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
      title: thread?.title === "Obrolan Baru" ? message.slice(0, 60) : thread?.title,
      summary: reply.slice(0, 140),
    },
  });

  await db(env, "chat_turns", {
    method: "POST",
    body: {
      thread_id: threadId,
      user_id: user.id,
      agent_slug: agentSlug,
      user_message_id: userMessage.id,
      assistant_message_id: assistantMessage.id,
      provider_request_id: providerRequestId,
      gateway_route: agent.modelAlias,
      model_alias: agent.modelAlias,
      resolved_provider: provider,
      resolved_model: resolvedModel,
      input_tokens: usage?.input_tokens ?? null,
      output_tokens: usage?.output_tokens ?? null,
      cache_read_tokens: usage?.cache_read_input_tokens ?? null,
      cache_write_tokens: usage?.cache_creation_input_tokens ?? null,
      cost_credits: cost,
      duration_ms: latencyMs,
      status: "completed",
      metadata: {
        ip: clientIp(request),
        attachment_count: attachments.length,
        knowledge_chunk_ids: knowledgeContext.chunks.map((chunk) => chunk.id),
      },
    },
  }).catch((error) => console.error("[worker][ai] turn log failed", error));

  const messages = await fetchThreadMessages(env, threadId);
  const artifacts = await fetchThreadArtifacts(env, threadId);

  return {
    threadId,
    messages,
    artifacts,
    artifact,
    reply,
    documents: ingestedDocuments,
  };
}

function streamEvent(controller, encoder, event, payload) {
  controller.enqueue(
    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`),
  );
}

export async function handleAiThreadsList(request, env) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const url = new URL(request.url);
  const agentSlug = url.searchParams.get("agent");
  if (!agentSlug || !getAgent(agentSlug)) {
    throw new HttpError(400, "Agent tidak valid.");
  }

  const threads = await db(
    env,
    `chats?user_id=eq.${user.id}&agent_slug=eq.${encodeURIComponent(agentSlug)}&select=id,title,summary,status,pinned,created_at,updated_at,last_message_at,last_artifact_at&order=pinned.desc,updated_at.desc`,
  );

  return json({ threads }, 200, corsHeaders());
}

export async function handleAiThreadCreate(request, env) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const payload = await readJson(request);
  const agentSlug = payload?.agentSlug;
  const agent = getAgent(agentSlug);
  if (!agent) {
    throw new HttpError(400, "Agent tidak valid.");
  }

  const thread = await createThread(env, user.id, agentSlug, payload?.title);
  return json({ thread }, 201, corsHeaders());
}

export async function handleAiThreadUpdate(request, env, threadId) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const thread = await fetchThread(env, threadId, user.id);
  if (!thread) {
    throw new HttpError(404, "Thread tidak ditemukan.");
  }

  const payload = await readJson(request);
  const patch = {};

  if (typeof payload?.title === "string" && payload.title.trim()) {
    patch.title = payload.title.trim().slice(0, 120);
  }
  if (typeof payload?.pinned === "boolean") {
    patch.pinned = payload.pinned;
  }
  if (typeof payload?.status === "string") {
    if (!["active", "archived"].includes(payload.status)) {
      throw new HttpError(400, "Status thread tidak valid.");
    }
    patch.status = payload.status;
  }

  if (Object.keys(patch).length === 0) {
    throw new HttpError(400, "Tidak ada perubahan thread.");
  }

  const [updatedThread] = await db(env, `chats?id=eq.${threadId}&user_id=eq.${user.id}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: patch,
  });

  return json({ thread: updatedThread }, 200, corsHeaders());
}

export async function handleAiThreadMessages(request, env, threadId) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const thread = await fetchThread(env, threadId, user.id);
  if (!thread) {
    throw new HttpError(404, "Thread tidak ditemukan.");
  }

  const messages = await fetchThreadMessages(env, threadId);
  return json({ thread, messages }, 200, corsHeaders());
}

export async function handleAiThreadArtifacts(request, env, threadId) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const thread = await fetchThread(env, threadId, user.id);
  if (!thread) {
    throw new HttpError(404, "Thread tidak ditemukan.");
  }

  const artifacts = await fetchThreadArtifacts(env, threadId);
  return json({ artifacts }, 200, corsHeaders());
}

export async function handleAiKnowledgeList(request, env) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const url = new URL(request.url);
  const agentSlug = url.searchParams.get("agent") || undefined;
  const threadId = url.searchParams.get("threadId") || undefined;
  const documents = await fetchKnowledgeDocuments(env, user.id, {
    agentSlug,
    threadId,
  });

  return json({ documents }, 200, corsHeaders());
}

export async function handleAiKnowledgeIngest(request, env) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const payload = await readJson(request);
  const agentSlug = payload?.agentSlug;
  if (!agentSlug || !getAgent(agentSlug)) {
    throw new HttpError(400, "Agent knowledge tidak valid.");
  }

  const document = await createKnowledgeDocument({
    env,
    userId: user.id,
    agentSlug,
    threadId: payload?.threadId || null,
    title: payload?.title,
    text: payload?.text,
    sourceType: payload?.sourceType || "note",
    fileName: payload?.fileName || null,
    mimeType: payload?.mimeType || "text/plain",
    metadata: {
      origin: payload?.origin || "manual_ingest",
    },
  });

  return json({ document }, 201, corsHeaders());
}

export async function handleAiSendMessage(request, env) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);
  const payload = await readJson(request);
  const result = await executeAiTurn({ request, env, user, payload });

  return json(
    {
      threadId: result.threadId,
      messages: result.messages,
      artifacts: result.artifacts,
      artifact: result.artifact,
      reply: result.reply,
      documents: result.documents,
    },
    200,
    corsHeaders(),
  );
}

export async function handleAiSendMessageStream(request, env) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);
  const payload = await readJson(request);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        streamEvent(controller, encoder, "start", { ok: true });
        const result = await executeAiTurn({ request, env, user, payload });
        streamEvent(controller, encoder, "thread", { threadId: result.threadId });

        const segments = result.reply.match(/\S+\s*/g) || [result.reply];
        let fullText = "";
        for (const segment of segments) {
          fullText += segment;
          streamEvent(controller, encoder, "delta", { text: segment, fullText });
        }

        streamEvent(controller, encoder, "done", {
          threadId: result.threadId,
          messages: result.messages,
          artifacts: result.artifacts,
          artifact: result.artifact,
          documents: result.documents,
        });
      } catch (error) {
        const message =
          error instanceof HttpError
            ? error.message
            : "Terjadi kesalahan saat memproses stream AI.";
        streamEvent(controller, encoder, "error", { error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders(),
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
