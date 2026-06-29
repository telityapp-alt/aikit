import { getUser, bearer, json, rpc } from "./_supabase.js";

// Runs before every /api/* function. Authenticates via the Supabase JWT,
// then applies a per-user sliding-window rate limit. Webhooks are exempt
// (they authenticate via a provider signature/token instead of a user JWT).
export async function onRequest(context) {
  const { request, next, data, env } = context;
  const url = new URL(request.url);

  if (!url.pathname.startsWith("/api/")) return next();
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });

  // Webhooks: no user session — handled inside the webhook function.
  if (url.pathname.startsWith("/api/webhooks/")) return next();

  const user = await getUser(env, bearer(request));
  if (!user || !user.id) {
    return json({ error: "Tidak terautentikasi." }, 401);
  }
  data.user = user;

  // Rate limit: 60 requests / 60s per user across the API surface.
  try {
    const allowed = await rpc(env, "rate_limit_check", {
      p_user: user.id,
      p_bucket: "api",
      p_limit: 60,
      p_window: 60,
    });
    if (allowed === false) {
      return json({ error: "Terlalu banyak permintaan. Coba lagi sebentar." }, 429);
    }
  } catch (e) {
    // Fail-open: don't block traffic if the limiter itself errors.
    console.error("[aikit] rate limit check failed:", e.message);
  }

  return next();
}
