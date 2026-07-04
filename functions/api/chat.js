import { db, json, rpc, isSuperAdmin } from "../_supabase.js";

// POST /api/chat  { chatId, message, moduleSlug }
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
  let { chatId, message, moduleSlug } = payload || {};
  if (!message || !message.trim()) {
    return json({ error: "Pesan kosong." }, 400);
  }

  // Fetch module config if moduleSlug is provided
  let systemPrompt = "Kamu adalah Aispy AI Agent, asisten berbahasa Indonesia yang membantu riset pasar, kompetitor, dan business intelligence. Jawab ringkas dan jelas.";
  let modelName = "claude-sonnet-4-6";
  let cost = 1;

  if (moduleSlug) {
    const modules = await db(env, `modules?slug=eq.${encodeURIComponent(moduleSlug)}&select=system_prompt,model,cost_per_chat_msg`);
    if (modules && modules.length > 0) {
      const mod = modules[0];
      if (mod.system_prompt) systemPrompt = mod.system_prompt;
      if (mod.model) modelName = mod.model;
      if (mod.cost_per_chat_msg !== undefined) cost = mod.cost_per_chat_msg;
    }
  }

  const chargedCost = isSuperAdmin(user) ? 0 : cost;

  // Deduct credits
  if (chargedCost > 0) {
    try {
      await rpc(env, "spend_credits", { p_user: user.id, p_amount: chargedCost });
    } catch (e) {
      if (String(e.message).includes("INSUFFICIENT_CREDITS")) {
        return json({ error: "Saldo kredit tidak cukup." }, 402);
      }
      return json({ error: "Gagal memotong kredit: " + e.message }, 500);
    }
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
    
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelName,
          max_tokens: 1024,
          system: systemPrompt,
          messages: anthropicMessages,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }
      const result = await res.json();
      reply = result?.content?.[0]?.text || "(tidak ada respons)";
    } catch (apiErr) {
      // Refund credits on failure
      if (chargedCost > 0) {
        await rpc(env, "add_credits", { p_user: user.id, p_amount: chargedCost }).catch(console.error);
      }
      return json({ error: `AI error: ${String(apiErr.message).slice(0, 200)}` }, 502);
    }
  } else {
    reply =
      "AI Agent siap, tapi ANTHROPIC_API_KEY belum dipasang di environment. Tambahkan key-nya untuk mengaktifkan jawaban nyata.";
    // Refund credits since it's a dry run
    if (chargedCost > 0) {
      await rpc(env, "add_credits", { p_user: user.id, p_amount: chargedCost }).catch(console.error);
    }
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
