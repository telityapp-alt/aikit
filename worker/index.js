import { corsHeaders, handleError, HttpError, json, readJson } from "./lib/http.js";
import { requireBinding } from "./lib/env.js";
import { audit, clientIp, db, getUser, rpc } from "./lib/supabase.js";
import {
  createCompetitorReportRun,
  processCompetitorRun,
  validateCompetitorInput,
} from "./modules/instagram-competitor.js";
import {
  createTikTokProfileRun,
  processTikTokProfileRun,
  validateTikTokInput,
} from "./modules/tiktok-profile-intelligence.js";
import {
  createInstagramProfileRun,
  processInstagramProfileRun,
  validateInstagramInput,
} from "./modules/instagram-profile-intelligence.js";
import {
  createTikTokAdsRun,
  processTikTokAdsRun,
  validateTikTokAdsInput,
} from "./modules/tiktok-ads-spy.js";
import {
  createMetaAdsRun,
  processMetaAdsRun,
  validateMetaAdsInput,
} from "./modules/meta-ads-spy.js";
import {
  handleAiKnowledgeIngest,
  handleAiKnowledgeList,
  handleAiSendMessage,
  handleAiSendMessageStream,
  handleAiThreadArtifacts,
  handleAiThreadCreate,
  handleAiThreadMessages,
  handleAiThreadUpdate,
  handleAiThreadsList,
} from "./ai/routes.js";

const API_RATE_LIMIT = {
  bucket: "api",
  limit: 60,
  window: 60,
};

async function rateLimit(env, userId) {
  try {
    const allowed = await rpc(env, "rate_limit_check", {
      p_user: userId,
      p_bucket: API_RATE_LIMIT.bucket,
      p_limit: API_RATE_LIMIT.limit,
      p_window: API_RATE_LIMIT.window,
    });
    if (allowed === false) {
      throw new HttpError(429, "Terlalu banyak permintaan. Coba lagi sebentar.");
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error("[worker] rate limit check failed", error);
  }
}

async function createRun(env, user, slug, input, ip) {
  const automationRows = await db(
    env,
    `automations?slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&select=*`,
  );
  const automation = automationRows?.[0];
  if (!automation) {
    throw new HttpError(404, "Automation tidak ditemukan.");
  }

  const cost = automation.cost_per_run || 0;
  if (cost > 0) {
    try {
      await rpc(env, "spend_credits", {
        p_user: user.id,
        p_amount: cost,
      });
    } catch (error) {
      if (String(error.message).includes("INSUFFICIENT_CREDITS")) {
        throw new HttpError(402, "Saldo kredit tidak cukup.");
      }
      throw error;
    }
  }

  const [run] = await db(env, "runs", {
    method: "POST",
    prefer: "return=representation",
    body: {
      user_id: user.id,
      automation_id: automation.id,
      automation_slug: automation.slug,
      title: automation.title,
      status: "queued",
      input,
      credits_spent: cost,
    },
  });

  await audit(env, user.id, "run.created", { slug, run_id: run.id, cost }, ip);
  return run;
}

async function handleRunRequest(request, env) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const payload = await readJson(request);
  const slug = payload?.slug;
  if (!slug) {
    throw new HttpError(400, "slug wajib diisi.");
  }

  const ip = clientIp(request);
  if (slug === "competitor-analyzer") {
    requireBinding(
      env,
      "RUN_QUEUE",
      "Binding RUN_QUEUE belum dipasang di deployment Worker production.",
    );
    const input = validateCompetitorInput(payload.input);
    const run = await createRun(env, user, slug, input, ip);
    const report = await createCompetitorReportRun(env, { user, run, input });

    await env.RUN_QUEUE.send({
      kind: "instagram-competitor-report",
      runId: run.id,
      reportId: report.id,
      userId: user.id,
    });

    return json({ run, report }, 202, corsHeaders());
  }

  if (slug === "tiktok-profile-intelligence") {
    requireBinding(
      env,
      "RUN_QUEUE",
      "Binding RUN_QUEUE belum dipasang di deployment Worker production.",
    );
    const input = validateTikTokInput(payload.input);
    const run = await createRun(env, user, slug, input, ip);
    const report = await createTikTokProfileRun(env, { user, run, input });

    await env.RUN_QUEUE.send({
      kind: "tiktok-profile-intelligence",
      runId: run.id,
      reportId: report.id,
      userId: user.id,
    });

    return json({ run, report }, 202, corsHeaders());
  }

  if (slug === "instagram-profile-intelligence") {
    requireBinding(
      env,
      "RUN_QUEUE",
      "Binding RUN_QUEUE belum dipasang di deployment Worker production.",
    );
    const input = validateInstagramInput(payload.input);
    const run = await createRun(env, user, slug, input, ip);
    const report = await createInstagramProfileRun(env, { user, run, input });

    await env.RUN_QUEUE.send({
      kind: "instagram-profile-intelligence",
      runId: run.id,
      reportId: report.id,
      userId: user.id,
    });

    return json({ run, report }, 202, corsHeaders());
  }

  if (slug === "tiktok-ads-spy") {
    requireBinding(
      env,
      "RUN_QUEUE",
      "Binding RUN_QUEUE belum dipasang di deployment Worker production.",
    );
    const input = validateTikTokAdsInput(payload.input);
    const run = await createRun(env, user, slug, input, ip);
    const report = await createTikTokAdsRun(env, { user, run, input });

    await env.RUN_QUEUE.send({
      kind: "tiktok-ads-spy",
      runId: run.id,
      reportId: report.id,
      userId: user.id,
    });

    return json({ run, report }, 202, corsHeaders());
  }

  if (slug === "meta-ads-spy") {
    requireBinding(
      env,
      "RUN_QUEUE",
      "Binding RUN_QUEUE belum dipasang di deployment Worker production.",
    );
    const input = validateMetaAdsInput(payload.input);
    const run = await createRun(env, user, slug, input, ip);
    const report = await createMetaAdsRun(env, { user, run, input });

    await env.RUN_QUEUE.send({
      kind: "meta-ads-spy",
      runId: run.id,
      reportId: report.id,
      userId: user.id,
    });

    return json({ run, report }, 202, corsHeaders());
  }

  throw new HttpError(400, `Slug ${slug} belum didukung oleh Worker.`);
}

async function handleChatRequest(request, env) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const payload = await readJson(request);
  let { chatId, message, moduleSlug } = payload || {};
  if (!message || !message.trim()) {
    throw new HttpError(400, "Pesan kosong.");
  }

  let systemPrompt =
    "Kamu adalah aikit AI Agent, asisten berbahasa Indonesia yang membantu produktivitas, bisnis, dan konten. Jawab ringkas dan jelas.";
  let modelName = env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
  let cost = 1;

  if (moduleSlug) {
    const modules = await db(
      env,
      `modules?slug=eq.${encodeURIComponent(moduleSlug)}&select=system_prompt,model,cost_per_chat_msg`,
    );
    if (modules?.[0]) {
      systemPrompt = modules[0].system_prompt || systemPrompt;
      modelName = modules[0].model || modelName;
      cost = modules[0].cost_per_chat_msg ?? cost;
    }
  }

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

  await db(env, "messages", {
    method: "POST",
    body: {
      chat_id: chatId,
      user_id: user.id,
      role: "user",
      content: message,
    },
  });

  let reply;
  if (env.ANTHROPIC_API_KEY) {
    const history = await db(
      env,
      `messages?chat_id=eq.${chatId}&order=created_at.asc&select=role,content`,
    );
    const anthropicMessages = history.map((entry) => ({
      role: entry.role === "ai" ? "assistant" : "user",
      content: entry.content,
    }));

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: modelName,
          max_tokens: 1024,
          system: systemPrompt,
          messages: anthropicMessages,
        }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const result = await response.json();
      reply = result?.content?.[0]?.text || "(tidak ada respons)";
    } catch (error) {
      if (cost > 0) {
        await rpc(env, "add_credits", { p_user: user.id, p_amount: cost }).catch(
          console.error,
        );
      }
      throw new HttpError(502, `AI error: ${String(error.message).slice(0, 200)}`);
    }
  } else {
    reply =
      "AI Agent siap, tapi ANTHROPIC_API_KEY belum dipasang di environment Worker.";
    if (cost > 0) {
      await rpc(env, "add_credits", { p_user: user.id, p_amount: cost }).catch(
        console.error,
      );
    }
  }

  const [aiMessage] = await db(env, "messages", {
    method: "POST",
    prefer: "return=representation",
    body: {
      chat_id: chatId,
      user_id: user.id,
      role: "ai",
      content: reply,
    },
  });

  await db(env, `chats?id=eq.${chatId}`, {
    method: "PATCH",
    body: { updated_at: new Date().toISOString() },
  });

  return json(
    { chatId, reply, messageId: aiMessage.id },
    200,
    corsHeaders(),
  );
}

async function handleTopupRequest(request, env) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const payload = await readJson(request);
  const amount = Number(payload?.amount);
  if (!amount || amount <= 0) {
    throw new HttpError(400, "Jumlah top-up tidak valid.");
  }

  const reference = `topup_${user.id.slice(0, 8)}_${Date.now()}`;
  let invoiceUrl;
  let live = false;

  if (env.XENDIT_SECRET_KEY) {
    const auth = btoa(`${env.XENDIT_SECRET_KEY}:`);
    const response = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_id: reference,
        amount,
        payer_email: user.email,
        description: `Top-up ${amount} kredit aikit`,
        success_redirect_url: `${new URL(request.url).origin}/dashboard/tagihan`,
      }),
    });
    if (!response.ok) {
      throw new HttpError(502, `Xendit error: ${(await response.text()).slice(0, 200)}`);
    }
    const invoice = await response.json();
    invoiceUrl = invoice.invoice_url;
    live = true;
  } else {
    invoiceUrl = `https://checkout.example/stub/${reference}`;
  }

  const [transaction] = await db(env, "transactions", {
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

  await audit(env, user.id, "topup.created", { reference, amount, live }, clientIp(request));

  return json(
    {
      transaction,
      invoiceUrl,
      live,
      note: live
        ? "Invoice Xendit dibuat. Selesaikan pembayaran untuk menambah kredit."
        : "Stub pembayaran — set XENDIT_SECRET_KEY untuk mengaktifkan gateway nyata.",
    },
    200,
    corsHeaders(),
  );
}

async function handleXenditWebhook(request, env) {
  const token = request.headers.get("x-callback-token");
  if (!env.XENDIT_CALLBACK_TOKEN || token !== env.XENDIT_CALLBACK_TOKEN) {
    throw new HttpError(401, "Invalid callback token.");
  }

  const event = await readJson(request);
  const reference = event.external_id;
  const status = String(event.status || "").toUpperCase();
  if (!reference) {
    throw new HttpError(400, "Missing external_id.");
  }

  const rows = await db(
    env,
    `transactions?reference=eq.${encodeURIComponent(reference)}&select=*`,
  );
  const transaction = rows?.[0];
  if (!transaction) {
    throw new HttpError(404, "Transaction not found.");
  }

  if (transaction.status === "completed") {
    return json({ ok: true, already: true }, 200, corsHeaders());
  }

  if (status === "PAID" || status === "SETTLED") {
    await db(env, `transactions?id=eq.${transaction.id}`, {
      method: "PATCH",
      body: { status: "completed" },
    });
    await rpc(env, "add_credits", {
      p_user: transaction.user_id,
      p_amount: transaction.amount,
    });
    await audit(env, transaction.user_id, "topup.completed", {
      reference,
      amount: transaction.amount,
    });
    return json({ ok: true }, 200, corsHeaders());
  }

  if (status === "EXPIRED" || status === "FAILED") {
    await db(env, `transactions?id=eq.${transaction.id}`, {
      method: "PATCH",
      body: { status: "failed" },
    });
  }

  return json({ ok: true, ignored: status }, 200, corsHeaders());
}

async function listReports(request, env) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const reports = await db(
    env,
    `instagram_competitor_reports?user_id=eq.${user.id}&select=id,run_id,instagram_handle,source_tab,date_from,date_to,status,summary,created_at,completed_at,updated_at,excel_artifact_id&order=created_at.desc&limit=25`,
  );

  return json({ reports }, 200, corsHeaders());
}

async function getReportDetail(request, env, reportId) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const [report] = await db(
    env,
    `instagram_competitor_reports?id=eq.${reportId}&user_id=eq.${user.id}&select=*`,
  );
  if (!report) {
    throw new HttpError(404, "Report tidak ditemukan.");
  }

  const items = await db(
    env,
    `instagram_competitor_report_items?report_id=eq.${reportId}&select=*&order=rank_position.asc`,
  );
  const events = await db(
    env,
    `instagram_report_events?report_id=eq.${reportId}&select=stage,status,message,payload,created_at&order=created_at.asc`,
  );
  const contentItemIds = items
    .map((item) => item.content_item_id)
    .filter(Boolean);
  const comments =
    contentItemIds.length > 0
      ? await db(
          env,
          `platform_content_comments?content_item_id=in.(${contentItemIds.join(",")})&select=content_item_id,author_handle,text,published_at,metrics&limit=250`,
        )
      : [];

  return json(
    {
      report,
      items,
      events,
      comments,
    },
    200,
    corsHeaders(),
  );
}

async function downloadReport(request, env, reportId) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const [report] = await db(
    env,
    `instagram_competitor_reports?id=eq.${reportId}&user_id=eq.${user.id}&select=id,instagram_handle,excel_artifact_id`,
  );
  if (!report?.excel_artifact_id) {
    throw new HttpError(404, "File Excel belum tersedia.");
  }

  const [artifact] = await db(
    env,
    `generated_artifacts?id=eq.${report.excel_artifact_id}&select=*`,
  );
  if (!artifact?.path) {
    throw new HttpError(404, "Artifact tidak ditemukan.");
  }

  const object = await env.REPORTS_BUCKET.get(artifact.path);
  if (!object) {
    throw new HttpError(404, "File report tidak ditemukan di storage.");
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, no-store");

  return new Response(object.body, { headers });
}

async function listTikTokReports(request, env) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const reports = await db(
    env,
    `tiktok_profile_reports?user_id=eq.${user.id}&select=id,run_id,tiktok_handle,status,date_from,date_to,filters,summary,created_at,completed_at,updated_at,artifact_id&order=created_at.desc&limit=25`,
  );

  return json({ reports }, 200, corsHeaders());
}

async function getTikTokReportDetail(request, env, reportId) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const [report] = await db(
    env,
    `tiktok_profile_reports?id=eq.${reportId}&user_id=eq.${user.id}&select=*`,
  );
  if (!report) {
    throw new HttpError(404, "Report TikTok tidak ditemukan.");
  }

  const items = await db(
    env,
    `tiktok_profile_report_items?report_id=eq.${reportId}&select=*&order=rank_position.asc`,
  );
  const events = await db(
    env,
    `tiktok_report_events?report_id=eq.${reportId}&select=stage,status,message,payload,created_at&order=created_at.asc`,
  );

  return json(
    {
      report,
      items,
      events,
    },
    200,
    corsHeaders(),
  );
}

async function downloadTikTokReport(request, env, reportId) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const [report] = await db(
    env,
    `tiktok_profile_reports?id=eq.${reportId}&user_id=eq.${user.id}&select=id,tiktok_handle,artifact_id`,
  );
  if (!report?.artifact_id) {
    throw new HttpError(404, "File TikTok report belum tersedia.");
  }

  const [artifact] = await db(
    env,
    `generated_artifacts?id=eq.${report.artifact_id}&select=*`,
  );
  if (!artifact?.path) {
    throw new HttpError(404, "Artifact TikTok tidak ditemukan.");
  }

  const object = await env.REPORTS_BUCKET.get(artifact.path);
  if (!object) {
    throw new HttpError(404, "File TikTok report tidak ditemukan di storage.");
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, no-store");

  return new Response(object.body, { headers });
}

async function listInstagramReports(request, env) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const reports = await db(
    env,
    `instagram_profile_reports?user_id=eq.${user.id}&select=id,run_id,instagram_handle,status,date_from,date_to,filters,summary,created_at,completed_at,updated_at,artifact_id&order=created_at.desc&limit=25`,
  );

  return json({ reports }, 200, corsHeaders());
}

async function getInstagramReportDetail(request, env, reportId) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const [report] = await db(
    env,
    `instagram_profile_reports?id=eq.${reportId}&user_id=eq.${user.id}&select=*`,
  );
  if (!report) {
    throw new HttpError(404, "Report Instagram tidak ditemukan.");
  }

  const items = await db(
    env,
    `instagram_profile_report_items?report_id=eq.${reportId}&select=*&order=rank_position.asc`,
  );
  const events = await db(
    env,
    `instagram_pi_events?report_id=eq.${reportId}&select=stage,status,message,payload,created_at&order=created_at.asc`,
  );

  return json({ report, items, events }, 200, corsHeaders());
}

async function downloadInstagramReport(request, env, reportId) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const [report] = await db(
    env,
    `instagram_profile_reports?id=eq.${reportId}&user_id=eq.${user.id}&select=id,instagram_handle,artifact_id`,
  );
  if (!report?.artifact_id) {
    throw new HttpError(404, "File Instagram report belum tersedia.");
  }

  const [artifact] = await db(
    env,
    `generated_artifacts?id=eq.${report.artifact_id}&select=*`,
  );
  if (!artifact?.path) {
    throw new HttpError(404, "Artifact Instagram tidak ditemukan.");
  }

  const object = await env.REPORTS_BUCKET.get(artifact.path);
  if (!object) {
    throw new HttpError(404, "File Instagram report tidak ditemukan di storage.");
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, no-store");

  return new Response(object.body, { headers });
}

async function listTikTokAdsReports(request, env) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const reports = await db(
    env,
    `tiktok_ads_reports?user_id=eq.${user.id}&select=id,run_id,query,region,status,date_from,date_to,filters,summary,created_at,completed_at,updated_at,artifact_id&order=created_at.desc&limit=25`,
  );

  return json({ reports }, 200, corsHeaders());
}

async function getTikTokAdsReportDetail(request, env, reportId) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const [report] = await db(
    env,
    `tiktok_ads_reports?id=eq.${reportId}&user_id=eq.${user.id}&select=*`,
  );
  if (!report) {
    throw new HttpError(404, "Report TikTok Ads tidak ditemukan.");
  }

  const items = await db(
    env,
    `tiktok_ads_report_items?report_id=eq.${reportId}&select=*&order=rank_position.asc`,
  );
  const events = await db(
    env,
    `tiktok_ads_events?report_id=eq.${reportId}&select=stage,status,message,payload,created_at&order=created_at.asc`,
  );

  return json({ report, items, events }, 200, corsHeaders());
}

async function downloadTikTokAdsReport(request, env, reportId) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const [report] = await db(
    env,
    `tiktok_ads_reports?id=eq.${reportId}&user_id=eq.${user.id}&select=id,query,artifact_id`,
  );
  if (!report?.artifact_id) {
    throw new HttpError(404, "File TikTok Ads report belum tersedia.");
  }

  const [artifact] = await db(env, `generated_artifacts?id=eq.${report.artifact_id}&select=*`);
  if (!artifact?.path) {
    throw new HttpError(404, "Artifact TikTok Ads tidak ditemukan.");
  }

  const object = await env.REPORTS_BUCKET.get(artifact.path);
  if (!object) {
    throw new HttpError(404, "File TikTok Ads report tidak ditemukan di storage.");
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, no-store");

  return new Response(object.body, { headers });
}

async function listMetaAdsReports(request, env) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const reports = await db(
    env,
    `meta_ads_reports?user_id=eq.${user.id}&select=id,run_id,query,country,status,date_from,date_to,filters,summary,created_at,completed_at,updated_at,artifact_id&order=created_at.desc&limit=25`,
  );

  return json({ reports }, 200, corsHeaders());
}

async function getMetaAdsReportDetail(request, env, reportId) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const [report] = await db(
    env,
    `meta_ads_reports?id=eq.${reportId}&user_id=eq.${user.id}&select=*`,
  );
  if (!report) {
    throw new HttpError(404, "Report Meta Ads tidak ditemukan.");
  }

  const items = await db(
    env,
    `meta_ads_report_items?report_id=eq.${reportId}&select=*&order=rank_position.asc`,
  );
  const events = await db(
    env,
    `meta_ads_events?report_id=eq.${reportId}&select=stage,status,message,payload,created_at&order=created_at.asc`,
  );

  return json({ report, items, events }, 200, corsHeaders());
}

async function downloadMetaAdsReport(request, env, reportId) {
  const user = await getUser(env, request);
  await rateLimit(env, user.id);

  const [report] = await db(
    env,
    `meta_ads_reports?id=eq.${reportId}&user_id=eq.${user.id}&select=id,query,artifact_id`,
  );
  if (!report?.artifact_id) {
    throw new HttpError(404, "File Meta Ads report belum tersedia.");
  }

  const [artifact] = await db(env, `generated_artifacts?id=eq.${report.artifact_id}&select=*`);
  if (!artifact?.path) {
    throw new HttpError(404, "Artifact Meta Ads tidak ditemukan.");
  }

  const object = await env.REPORTS_BUCKET.get(artifact.path);
  if (!object) {
    throw new HttpError(404, "File Meta Ads report tidak ditemukan di storage.");
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, no-store");

  return new Response(object.body, { headers });
}

function isApiPath(pathname) {
  return pathname.startsWith("/api/");
}

async function handleApi(request, env) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (url.pathname === "/api/runs" && request.method === "POST") {
    return handleRunRequest(request, env);
  }

  if (url.pathname === "/api/chat" && request.method === "POST") {
    return handleChatRequest(request, env);
  }

  if (url.pathname === "/api/ai/threads" && request.method === "GET") {
    return handleAiThreadsList(request, env);
  }

  if (url.pathname === "/api/ai/threads" && request.method === "POST") {
    return handleAiThreadCreate(request, env);
  }

  if (url.pathname === "/api/ai/messages" && request.method === "POST") {
    return handleAiSendMessage(request, env);
  }

  if (url.pathname === "/api/ai/messages/stream" && request.method === "POST") {
    return handleAiSendMessageStream(request, env);
  }

  if (url.pathname === "/api/ai/knowledge" && request.method === "GET") {
    return handleAiKnowledgeList(request, env);
  }

  if (url.pathname === "/api/ai/knowledge" && request.method === "POST") {
    return handleAiKnowledgeIngest(request, env);
  }

  const aiThreadMessagesMatch = url.pathname.match(/^\/api\/ai\/threads\/([^/]+)\/messages$/);
  if (aiThreadMessagesMatch && request.method === "GET") {
    return handleAiThreadMessages(request, env, aiThreadMessagesMatch[1]);
  }

  const aiThreadUpdateMatch = url.pathname.match(/^\/api\/ai\/threads\/([^/]+)$/);
  if (aiThreadUpdateMatch && request.method === "PATCH") {
    return handleAiThreadUpdate(request, env, aiThreadUpdateMatch[1]);
  }

  const aiThreadArtifactsMatch = url.pathname.match(/^\/api\/ai\/threads\/([^/]+)\/artifacts$/);
  if (aiThreadArtifactsMatch && request.method === "GET") {
    return handleAiThreadArtifacts(request, env, aiThreadArtifactsMatch[1]);
  }

  if (url.pathname === "/api/topup" && request.method === "POST") {
    return handleTopupRequest(request, env);
  }

  if (url.pathname === "/api/webhooks/xendit" && request.method === "POST") {
    return handleXenditWebhook(request, env);
  }

  if (url.pathname === "/api/instagram-competitor-reports" && request.method === "GET") {
    return listReports(request, env);
  }

  if (url.pathname === "/api/tiktok-profile-reports" && request.method === "GET") {
    return listTikTokReports(request, env);
  }

  if (url.pathname === "/api/instagram-profile-reports" && request.method === "GET") {
    return listInstagramReports(request, env);
  }

  const igReportDetailMatch = url.pathname.match(
    /^\/api\/instagram-profile-reports\/([^/]+)$/,
  );
  if (igReportDetailMatch && request.method === "GET") {
    return getInstagramReportDetail(request, env, igReportDetailMatch[1]);
  }

  const igReportDownloadMatch = url.pathname.match(
    /^\/api\/instagram-profile-reports\/([^/]+)\/download$/,
  );
  if (igReportDownloadMatch && request.method === "GET") {
    return downloadInstagramReport(request, env, igReportDownloadMatch[1]);
  }

  if (url.pathname === "/api/tiktok-ads-reports" && request.method === "GET") {
    return listTikTokAdsReports(request, env);
  }

  const adsReportDetailMatch = url.pathname.match(/^\/api\/tiktok-ads-reports\/([^/]+)$/);
  if (adsReportDetailMatch && request.method === "GET") {
    return getTikTokAdsReportDetail(request, env, adsReportDetailMatch[1]);
  }

  const adsReportDownloadMatch = url.pathname.match(
    /^\/api\/tiktok-ads-reports\/([^/]+)\/download$/,
  );
  if (adsReportDownloadMatch && request.method === "GET") {
    return downloadTikTokAdsReport(request, env, adsReportDownloadMatch[1]);
  }

  if (url.pathname === "/api/meta-ads-reports" && request.method === "GET") {
    return listMetaAdsReports(request, env);
  }

  const metaAdsDetailMatch = url.pathname.match(/^\/api\/meta-ads-reports\/([^/]+)$/);
  if (metaAdsDetailMatch && request.method === "GET") {
    return getMetaAdsReportDetail(request, env, metaAdsDetailMatch[1]);
  }

  const metaAdsDownloadMatch = url.pathname.match(/^\/api\/meta-ads-reports\/([^/]+)\/download$/);
  if (metaAdsDownloadMatch && request.method === "GET") {
    return downloadMetaAdsReport(request, env, metaAdsDownloadMatch[1]);
  }

  const reportDetailMatch = url.pathname.match(
    /^\/api\/instagram-competitor-reports\/([^/]+)$/,
  );
  if (reportDetailMatch && request.method === "GET") {
    return getReportDetail(request, env, reportDetailMatch[1]);
  }

  const reportDownloadMatch = url.pathname.match(
    /^\/api\/instagram-competitor-reports\/([^/]+)\/download$/,
  );
  if (reportDownloadMatch && request.method === "GET") {
    return downloadReport(request, env, reportDownloadMatch[1]);
  }

  const tiktokReportDetailMatch = url.pathname.match(
    /^\/api\/tiktok-profile-reports\/([^/]+)$/,
  );
  if (tiktokReportDetailMatch && request.method === "GET") {
    return getTikTokReportDetail(request, env, tiktokReportDetailMatch[1]);
  }

  const tiktokReportDownloadMatch = url.pathname.match(
    /^\/api\/tiktok-profile-reports\/([^/]+)\/download$/,
  );
  if (tiktokReportDownloadMatch && request.method === "GET") {
    return downloadTikTokReport(request, env, tiktokReportDownloadMatch[1]);
  }

  throw new HttpError(404, "API route tidak ditemukan.");
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (isApiPath(url.pathname)) {
        return await handleApi(request, env);
      }

      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }

      const spaUrl = new URL(request.url);
      spaUrl.pathname = "/index.html";
      return env.ASSETS.fetch(new Request(spaUrl.toString(), request));
    } catch (error) {
      return handleError(error);
    }
  },

  async queue(batch, env) {
    for (const message of batch.messages) {
      try {
        if (message.body?.kind === "instagram-competitor-report") {
          await processCompetitorRun(env, message.body);
        }
        if (message.body?.kind === "tiktok-profile-intelligence") {
          await processTikTokProfileRun(env, message.body);
        }
        if (message.body?.kind === "instagram-profile-intelligence") {
          await processInstagramProfileRun(env, message.body);
        }
        if (message.body?.kind === "tiktok-ads-spy") {
          await processTikTokAdsRun(env, message.body);
        }
        if (message.body?.kind === "meta-ads-spy") {
          await processMetaAdsRun(env, message.body);
        }
        message.ack();
      } catch (error) {
        console.error("[worker] queue job failed", error);
        message.retry();
      }
    }
  },
};
