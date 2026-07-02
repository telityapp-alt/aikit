import { lazy } from "react";

// Maps a module slug → its mini-app component. Modules not yet built render a
// consistent "coming soon" placeholder (handled by the host).
export const MODULE_REGISTRY = {
  "keuangan-pribadi": lazy(() => import("./KeuanganPribadi.jsx")),
  "competitor-analyzer": lazy(() => import("./CompetitorAnalyzer.jsx")),
  "competitor-analyzer-demo": lazy(() => import("./CompetitorAnalyzerDemo.jsx")),
  "tiktok-profile-intelligence": lazy(() => import("./TikTokProfileIntelligence.jsx")),
  "instagram-profile-intelligence": lazy(() =>
    import("./InstagramProfileIntelligence.jsx"),
  ),
  "tiktok-ads-spy": lazy(() => import("./TikTokAdsSpy.jsx")),
  "meta-ads-spy": lazy(() => import("./MetaAdsSpy.jsx")),
};

export function getModuleComponent(slug) {
  return MODULE_REGISTRY[slug] || null;
}
