import { HttpError, parseBearer } from "./http.js";
import { requireEnv } from "./env.js";

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

export async function getUser(env, request) {
  const token = parseBearer(request);
  if (!token) {
    throw new HttpError(401, "Tidak terautentikasi.");
  }

  const supabaseUrl = requireEnv(env, "SUPABASE_URL");
  const authKey = getSupabaseAuthKey(env);
  if (!authKey) {
    throw new HttpError(
      503,
      "Konfigurasi server SUPABASE_PUBLISHABLE_KEY belum dipasang di environment deployment.",
    );
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: authKey,
    },
  });

  if (!response.ok) {
    throw new HttpError(401, "Tidak terautentikasi.");
  }

  const user = await response.json();
  if (!user?.id) {
    throw new HttpError(401, "Tidak terautentikasi.");
  }

  return user;
}

export async function db(env, path, { method = "GET", body, prefer } = {}) {
  const supabaseUrl = requireEnv(env, "SUPABASE_URL");
  const serviceRoleKey = requireEnv(env, "SUPABASE_SERVICE_ROLE_KEY");

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.text();
  const data = payload ? JSON.parse(payload) : null;
  if (!response.ok) {
    throw new Error(
      `DB ${method} ${path}: ${data?.message || data?.error || `HTTP ${response.status}`}`,
    );
  }
  return data;
}

export async function rpc(env, fn, args) {
  return db(env, `rpc/${fn}`, { method: "POST", body: args });
}

function getAutomationRestConfig(env) {
  const supabaseUrl = env.AUTOMATION_SUPABASE_URL || env.SUPABASE_URL;
  const serviceRoleKey =
    env.AUTOMATION_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new HttpError(
      503,
      "Konfigurasi automation Supabase belum lengkap. Pasang AUTOMATION_SUPABASE_URL dan AUTOMATION_SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return { supabaseUrl, serviceRoleKey };
}

export async function automationDb(env, path, { method = "GET", body, prefer } = {}) {
  const { supabaseUrl, serviceRoleKey } = getAutomationRestConfig(env);

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.text();
  const data = payload ? JSON.parse(payload) : null;
  if (!response.ok) {
    throw new Error(
      `Automation DB ${method} ${path}: ${data?.message || data?.error || `HTTP ${response.status}`}`,
    );
  }
  return data;
}

export async function automationRpc(env, fn, args) {
  return automationDb(env, `rpc/${fn}`, { method: "POST", body: args });
}

export async function audit(env, userId, action, metadata = {}, ip = null) {
  try {
    await db(env, "audit_logs", {
      method: "POST",
      body: {
        user_id: userId,
        action,
        metadata,
        ip,
      },
    });
  } catch (error) {
    console.error("[worker] audit failed", error);
  }
}

export async function automationAudit(env, workspaceUserId, action, metadata = {}, ip = null) {
  try {
    await automationDb(env, "automation_audit_logs", {
      method: "POST",
      body: {
        workspace_user_id: workspaceUserId,
        action,
        metadata,
        ip,
      },
    });
  } catch (error) {
    console.error("[worker] automation audit failed", error);
  }
}

export function clientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    null
  );
}
