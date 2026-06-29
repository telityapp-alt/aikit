import { db, rpc, json, audit, clientIp } from "../_supabase.js";

// POST /api/runs  { slug, input }
// Async model: validate → charge credits → create run → return immediately
// (status "running") while processing continues via waitUntil. The client
// polls the `runs` row (RLS-scoped) for status/output. Credits are refunded
// if processing fails.
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
  const { slug, input = {} } = payload || {};
  if (!slug) return json({ error: "slug wajib diisi." }, 400);

  const rows = await db(
    env,
    `automations?slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&select=*`,
  );
  const automation = rows?.[0];
  if (!automation) return json({ error: "Automation tidak ditemukan." }, 404);

  const cost = automation.cost_per_run || 0;

  if (cost > 0) {
    try {
      await rpc(env, "spend_credits", { p_user: user.id, p_amount: cost });
    } catch (e) {
      if (String(e.message).includes("INSUFFICIENT_CREDITS")) {
        return json({ error: "Saldo kredit tidak cukup." }, 402);
      }
      throw e;
    }
  }

  const [run] = await db(env, "runs", {
    method: "POST",
    prefer: "return=representation",
    body: {
      user_id: user.id,
      automation_id: automation.id,
      automation_slug: slug,
      title: automation.title,
      status: "running",
      input,
      credits_spent: cost,
    },
  });

  await audit(env, user.id, "run.created", { slug, run_id: run.id, cost }, ip);

  // Continue processing after the response is sent.
  context.waitUntil(processRun(env, run, automation, input, user.id, cost, ip));

  return json({ run }, 202);
}

async function processRun(env, run, automation, input, userId, cost, ip) {
  try {
    // ── Provider call (stub) ──────────────────────────────────
    // TODO: call ScrapeCreators + Anthropic using env keys (server-only).
    // Simulated latency so the async/polling flow is exercised end-to-end.
    await new Promise((r) => setTimeout(r, 1200));

    const output = {
      note:
        "Run selesai. Integrasi provider (ScrapeCreators/Claude) belum aktif — output ini placeholder.",
      automation: automation.slug,
      echo: input,
    };

    await db(env, `runs?id=eq.${run.id}`, {
      method: "PATCH",
      body: { status: "completed", output, completed_at: new Date().toISOString() },
    });
    await audit(env, userId, "run.completed", { run_id: run.id }, ip);
  } catch (e) {
    // Refund credits and mark failed.
    if (cost > 0) {
      try {
        await rpc(env, "add_credits", { p_user: userId, p_amount: cost });
      } catch (re) {
        console.error("[aikit] refund failed:", re.message);
      }
    }
    await db(env, `runs?id=eq.${run.id}`, {
      method: "PATCH",
      body: {
        status: "failed",
        error: String(e.message).slice(0, 500),
        completed_at: new Date().toISOString(),
      },
    });
    await audit(env, userId, "run.failed", { run_id: run.id, error: e.message }, ip);
  }
}
