// Shared helpers for Cloudflare Pages Functions (server-side, secrets only).
// Underscore-prefixed → excluded from routing.

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getSupabaseAuthKey(env) {
  return (
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    null
  );
}

export function isSuperAdmin(user) {
  const role =
    user?.app_metadata?.role ||
    user?.user_metadata?.role ||
    user?.app_metadata?.app_role ||
    user?.user_metadata?.app_role ||
    null;

  return role === "super_admin";
}

// Verify a Supabase access token and return the authenticated user (or null).
export async function getUser(env, token) {
  if (!token) return null;
  const authKey = getSupabaseAuthKey(env);
  if (!authKey) return null;
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: authKey,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

// Service-role REST helper (bypasses RLS — server only).
export async function db(env, path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.message || `DB error ${res.status}`);
  }
  return data;
}

// Call a Postgres RPC via PostgREST.
export async function rpc(env, fn, args) {
  return db(env, `rpc/${fn}`, { method: "POST", body: args });
}

function getAutomationRestConfig(env) {
  const supabaseUrl = env.AUTOMATION_SUPABASE_URL || env.SUPABASE_URL;
  const serviceRoleKey =
    env.AUTOMATION_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Automation Supabase belum dikonfigurasi. Pasang AUTOMATION_SUPABASE_URL dan AUTOMATION_SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return { supabaseUrl, serviceRoleKey };
}

export async function automationDb(env, path, { method = "GET", body, prefer } = {}) {
  const { supabaseUrl, serviceRoleKey } = getAutomationRestConfig(env);
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.message || `Automation DB error ${res.status}`);
  }
  return data;
}

export async function automationRpc(env, fn, args) {
  return automationDb(env, `rpc/${fn}`, { method: "POST", body: args });
}

export function bearer(request) {
  const h = request.headers.get("Authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

export function clientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    null
  );
}

// Best-effort audit log; never throws (audit must not break the request).
export async function audit(env, userId, action, metadata = {}, ip = null) {
  try {
    await db(env, "audit_logs", {
      method: "POST",
      body: { user_id: userId, action, metadata, ip },
    });
  } catch (e) {
    console.error("[aikit] audit failed:", e.message);
  }
}

export async function automationAudit(env, workspaceUserId, action, metadata = {}, ip = null) {
  try {
    await automationDb(env, "automation_audit_logs", {
      method: "POST",
      body: { workspace_user_id: workspaceUserId, action, metadata, ip },
    });
  } catch (e) {
    console.error("[aikit] automation audit failed:", e.message);
  }
}
