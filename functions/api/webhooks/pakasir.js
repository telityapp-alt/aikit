import { db, rpc, json, audit } from "../../_supabase.js";

// POST /api/webhooks/pakasir
export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Signature / Token Verification
  // In production, you must set PAKASIR_WEBHOOK_SECRET in your Cloudflare environment.
  // Pakasir or payment gateways usually send a specific header for validation.
  const token = request.headers.get("X-Pakasir-Callback-Token");
  if (env.PAKASIR_WEBHOOK_SECRET && token !== env.PAKASIR_WEBHOOK_SECRET) {
    return json({ error: "Unauthorized webhook callback." }, 401);
  }

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return json({ error: "Invalid JSON payload" }, 400);
  }

  const reference = payload?.order_id || payload?.reference_id;
  const status = payload?.status?.toLowerCase();

  if (!reference) {
    return json({ error: "Missing order_id or reference_id" }, 400);
  }

  // 2. Fetch the transaction
  const rows = await db(env, `transactions?reference=eq.${encodeURIComponent(reference)}&select=*`);
  const tx = rows?.[0];

  if (!tx) {
    return json({ received: true, note: "Transaction not found." });
  }

  // 3. Idempotency Check
  if (tx.status === "completed") {
    return json({ received: true, note: "Transaction already processed." });
  }

  const userId = tx.user_id;
  const metadata = tx.metadata || {};
  const type = metadata.type;

  // 4. Handle Failed Status
  if (status === "expired" || status === "failed" || status === "cancelled" || status === "deny") {
    await db(env, `transactions?id=eq.${tx.id}`, {
      method: "PATCH",
      body: { status: "failed" },
    });
    return json({ received: true, note: "Transaction marked as failed." });
  }

  // 5. Handle Success Status
  if (status === "paid" || status === "success" || status === "settlement") {
    // Process based on type
    if (type === "topup") {
      const creditsToAdd = tx.amount;
      
      // ATOMIC UPDATE: Use RPC to prevent race conditions
      await rpc(env, "add_credits", { p_user: userId, p_amount: creditsToAdd }).catch(console.error);
      
      await audit(env, userId, "topup.completed", { reference, amount: creditsToAdd });
      
    } else if (type === "subscription") {
      const tier = metadata.tier || "pro";
      const durationDays = metadata.duration_days || 30;
      
      // Calculate new expiry from today
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);
      
      await db(env, `profiles?id=eq.${userId}`, {
        method: "PATCH",
        body: { 
          subscription_tier: tier,
          subscription_expires_at: expiresAt.toISOString()
        }
      });
      
      await audit(env, userId, "subscription.activated", { tier, durationDays, reference });
    }

    // Mark transaction as completed
    await db(env, `transactions?id=eq.${tx.id}`, {
      method: "PATCH",
      body: { status: "completed" }
    });

    return json({ received: true, note: "Processed successfully" });
  }

  // Unhandled status
  return json({ received: true, note: "Unhandled status", status });
}
