import { db, rpc, json, audit } from "../../_supabase.js";

// POST /api/webhooks/xendit
// Exempt from the JWT middleware — authenticated via Xendit's callback token.
// On a paid invoice, mark the transaction completed and credit the user.
export async function onRequestPost(context) {
  const { request, env } = context;

  // Verify the callback token (set XENDIT_CALLBACK_TOKEN in env).
  const token = request.headers.get("x-callback-token");
  if (!env.XENDIT_CALLBACK_TOKEN || token !== env.XENDIT_CALLBACK_TOKEN) {
    return json({ error: "Invalid callback token." }, 401);
  }

  let event;
  try {
    event = await request.json();
  } catch {
    return json({ error: "Invalid body." }, 400);
  }

  // Xendit invoice callback uses external_id (our reference) + status.
  const reference = event.external_id;
  const status = (event.status || "").toUpperCase();
  if (!reference) return json({ error: "Missing external_id." }, 400);

  const rows = await db(
    env,
    `transactions?reference=eq.${encodeURIComponent(reference)}&select=*`,
  );
  const tx = rows?.[0];
  if (!tx) return json({ error: "Transaction not found." }, 404);

  // Idempotency: ignore if already completed.
  if (tx.status === "completed") return json({ ok: true, already: true });

  if (status === "PAID" || status === "SETTLED") {
    await db(env, `transactions?id=eq.${tx.id}`, {
      method: "PATCH",
      body: { status: "completed" },
    });
    await rpc(env, "add_credits", { p_user: tx.user_id, p_amount: tx.amount });
    await audit(env, tx.user_id, "topup.completed", {
      reference,
      amount: tx.amount,
    });
    return json({ ok: true });
  }

  if (status === "EXPIRED" || status === "FAILED") {
    await db(env, `transactions?id=eq.${tx.id}`, {
      method: "PATCH",
      body: { status: "failed" },
    });
    return json({ ok: true });
  }

  return json({ ok: true, ignored: status });
}
