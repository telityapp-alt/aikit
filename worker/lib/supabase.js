import { HttpError, parseBearer } from "./http.js";

export async function getUser(env, request) {
  const token = parseBearer(request);
  if (!token) {
    throw new HttpError(401, "Tidak terautentikasi.");
  }

  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
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
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.text();
  const data = payload ? JSON.parse(payload) : null;
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `DB error ${response.status}`);
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
