import { db, json, audit, clientIp } from "../_supabase.js";

const PLANS = {
  basic: { amount: 50000, type: "topup", description: "Top-up 50.000 kredit" },
  standard: { amount: 100000, type: "topup", description: "Top-up 100.000 kredit" },
  sultan: { amount: 250000, type: "topup", description: "Top-up 250.000 kredit" },
  pro_monthly: { amount: 99000, type: "subscription", tier: "pro", duration_days: 30, description: "Langganan Pro (1 Bulan)" },
};

// POST /api/topup  { plan: "basic" }
// Creates a pending payment link via Pakasir API using a strict backend plan map.
export async function onRequestPost(context) {
  const { request, data, env } = context;
  const user = data.user;
  const ip = clientIp(request);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Body tidak valid." }, 400);
  }
  
  const planId = payload?.plan;
  const selectedPlan = PLANS[planId];

  if (!selectedPlan) {
    return json({ error: "Paket tidak valid." }, 400);
  }

  const { amount, type, description, tier, duration_days } = selectedPlan;
  const metadata = type === "subscription" 
    ? { type, tier, duration_days, expected_amount: amount } 
    : { type, expected_amount: amount };

  const reference = `${type}_${user.id.slice(0, 8)}_${Date.now()}`;
  let invoiceUrl;
  let live = false;

  if (env.PAKASIR_API_KEY) {
    // Pakasir API Integration
    const res = await fetch("https://api.pakasir.com/v1/transaction", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${env.PAKASIR_API_KEY}`, 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        project_slug: env.PAKASIR_PROJECT_SLUG || "default",
        order_id: reference,
        amount: amount,
        customer_name: user.full_name || "Customer",
        customer_email: user.email,
        description: description,
        return_url: `${new URL(request.url).origin}/dashboard/tagihan`
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return json({ error: `Pakasir error: ${t.slice(0, 200)}` }, 502);
    }
    const inv = await res.json();
    invoiceUrl = inv?.data?.payment_url || inv?.payment_url;
    live = true;
  } else {
    invoiceUrl = `https://checkout.pakasir.example/stub/${reference}`;
  }

  const [tx] = await db(env, "transactions", {
    method: "POST",
    prefer: "return=representation",
    body: {
      user_id: user.id,
      kind: type === "topup" ? "topup" : "spend",
      amount: amount, 
      status: "pending",
      provider: "pakasir",
      reference,
      invoice_url: invoiceUrl,
      metadata: { ...metadata, live },
    },
  });

  await audit(env, user.id, "payment.created", { reference, planId, amount, type, live }, ip);

  return json({
    transaction: tx,
    invoiceUrl,
    live,
    note: live
      ? "Link pembayaran Pakasir dibuat. Selesaikan pembayaran Anda."
      : "Stub pembayaran — set PAKASIR_API_KEY untuk mengaktifkan gateway nyata.",
  });
}

