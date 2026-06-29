import { db, json } from "../_supabase.js";

// POST /api/chat  { chatId, message }
// Persists the user's message, calls Anthropic for a reply, persists the reply.
// Falls back to a clear placeholder when ANTHROPIC_API_KEY is not set.
export async function onRequestPost(context) {
  const { request, data, env } = context;
  const user = data.user;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Body tidak valid." }, 400);
  }
  let { chatId, message } = payload || {};
  if (!message || !message.trim()) {
    return json({ error: "Pesan kosong." }, 400);
  }

  // Create a chat if none supplied.
  if (!chatId) {
    const [chat] = await db(env, "chats", {
      method: "POST",
      prefer: "return=representation",
      body: {
        user_id: user.id,
        title: message.trim().slice(0, 40),
      },
    });
    chatId = chat.id;
  }

  // Store user message.
  await db(env, "messages", {
    method: "POST",
    body: { chat_id: chatId, user_id: user.id, role: "user", content: message },
  });

  // Build reply.
  let reply;
  if (env.ANTHROPIC_API_KEY) {
    const history = await db(
      env,
      `messages?chat_id=eq.${chatId}&order=created_at.asc&select=role,content`,
    );
    const anthropicMessages = history.map((m) => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.content,
    }));
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system:
          "Kamu adalah aikit AI Agent, asisten berbahasa Indonesia yang membantu produktivitas, bisnis, dan konten. Jawab ringkas dan jelas.",
        messages: anthropicMessages,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return json({ error: `AI error: ${errText.slice(0, 200)}` }, 502);
    }
    const result = await res.json();
    reply = result?.content?.[0]?.text || "(tidak ada respons)";
  } else {
    reply =
      "AI Agent siap, tapi ANTHROPIC_API_KEY belum dipasang di environment. Tambahkan key-nya untuk mengaktifkan jawaban nyata.";
  }

  // Store AI reply.
  const [aiMsg] = await db(env, "messages", {
    method: "POST",
    prefer: "return=representation",
    body: { chat_id: chatId, user_id: user.id, role: "ai", content: reply },
  });

  // Touch chat updated_at.
  await db(env, `chats?id=eq.${chatId}`, {
    method: "PATCH",
    body: { updated_at: new Date().toISOString() },
  });

  return json({ chatId, reply, messageId: aiMsg.id });
}
