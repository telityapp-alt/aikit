import { HttpError, parseBearer } from "./http.js";
import { requireEnv } from "./env.js";

export async function getUser(env, request) {
  const token = parseBearer(request);
  if (!token) {
    throw new HttpError(401, "Tidak terautentikasi.");
  }

  const supabaseUrl = requireEnv(env, "SUPABASE_URL");
  const serviceRoleKey = requireEnv(env, "SUPABASE_SERVICE_ROLE_KEY");

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: serviceRoleKey,
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

export function clientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    null
  );
}
