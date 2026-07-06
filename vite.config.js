import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Only enable the local API proxy for the dedicated full-stack dev flow.
// Plain `npm run dev` should not silently proxy to a Worker that may not exist.
const localApiProxy = process.env.VITE_LOCAL_API_PROXY || null;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    historyApiFallback: true,
    proxy: localApiProxy
      ? {
          "/api": {
            target: localApiProxy,
            changeOrigin: true,
          },
        }
      : undefined,
  },
  define: {
    // Publishable keys: safe to embed in the client bundle.
    // Fallback to hardcoded values so `vite build` always succeeds even
    // when .env is absent (e.g. CI, Cloudflare build pipeline).
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
      process.env.VITE_SUPABASE_URL ||
        "https://lftgaziycyvxqtlwvxgi.supabase.co",
    ),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        "sb_publishable_pli5g34Fg5iAgNnYduBPdA_1nYW93CO",
    ),
  },
});
