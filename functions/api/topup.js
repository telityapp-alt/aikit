import { db, json, audit, clientIp } from "../_supabase.js";

// POST /api/topup  { amount }
// Creates a pending credit top-up. If XENDIT_SECRET_KEY is set, opens a real
// Xendit invoice; otherwise returns a stub invoice URL. Credits are granted
// only when the Xendit webhook confirms payment (see webhooks/xendit.js).
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
  const amount = Number(payload?.amount);
  if (!amount || amount <= 0) {
    return json({ error: "Jumlah top-up tidak valid." }, 400);
  }

  const reference = `topup_${user.id.slice(0, 8)}_${Date.now()}`;
  let invoiceUrl;
  let live = false;

  if (env.XENDIT_SECRET_KEY) {
    // Real Xendit invoice (1 credit = Rp1 for simplicity).
    const auth = btoa(`${env.XENDIT_SECRET_KEY}:`);
    const res = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        external_id: reference,
        amount,
        payer_email: user.email,
        description: `Top-up ${amount} kredit Aispy`,
        success_redirect_url: `${new URL(request.url).origin}/dashboard/tagihan`,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return json({ error: `Xendit error: ${t.slice(0, 200)}` }, 502);
    }
    const inv = await res.json();
    invoiceUrl = inv.invoice_url;
    live = true;
  } else {
    invoiceUrl = `https://checkout.example/stub/${reference}`;
  }

  const [tx] = await db(env, "transactions", {
    method: "POST",
    prefer: "return=representation",
    body: {
      user_id: user.id,
      kind: "topup",
      amount,
      status: "pending",
      provider: "xendit",
      reference,
      invoice_url: invoiceUrl,
      metadata: { live },
    },
  });

  await audit(env, user.id, "topup.created", { reference, amount, live }, ip);

  return json({
    transaction: tx,
    invoiceUrl,
    live,
    note: live
      ? "Invoice Xendit dibuat. Selesaikan pembayaran untuk menambah kredit."
      : "Stub pembayaran — set XENDIT_SECRET_KEY untuk mengaktifkan gateway nyata.",
  });
}
