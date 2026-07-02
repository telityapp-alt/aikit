import { lazy } from "react";

/**
 * Module Registry — slug → { component, type, category, entities, icon }
 *
 * type:
 *   'report'   — runs an async job, stores results in a report table
 *   'stateful' — persists freeform state per-user via module_instances
 *   'entity'   — owns/manages entity backbone records (contacts, campaigns, etc)
 *   'hybrid'   — combines report + stateful (e.g. runs a job AND has local state)
 *
 * entities:
 *   Which entity backbone tables this module reads/writes.
 *   Used by the dashboard to show "related modules" and by Phase 5 bridge actions.
 *
 * category:
 *   Groups modules in the dashboard sidebar/catalog.
 *
 * icon:
 *   Lucide icon name (string). Host component resolves the actual icon.
 */
export const MODULE_REGISTRY = {
  // ── Stateful ──────────────────────────────────────────────────────────────
  "keuangan-pribadi": {
    component: lazy(() => import("./KeuanganPribadi.jsx")),
    type: "stateful",
    category: "keuangan",
    entities: [],
    icon: "wallet",
  },

  // ── Entity (Marketing Core) — Phase 2–4, components pending ────────────────
  "contact-manager": {
    component: lazy(() => import("./ContactManager/index.jsx")),
    type: "entity",
    category: "marketing",
    entities: ["contacts"],
    icon: "users",
  },
  "campaign-manager": {
    component: lazy(() => import("./CampaignManager/index.jsx")),
    type: "entity",
    category: "marketing",
    entities: ["campaigns", "contacts"],
    icon: "megaphone",
  },
  "content-calendar": {
    component: lazy(() => import("./ContentCalendar/index.jsx")),
    type: "entity",
    category: "marketing",
    entities: ["content_posts", "campaigns"],
    icon: "calendar-days",
  },

  // ── Report (Intelligence) ─────────────────────────────────────────────────
  "competitor-analyzer": {
    component: lazy(() => import("./CompetitorAnalyzer.jsx")),
    type: "report",
    category: "intelligence",
    entities: ["contacts"],
    icon: "search",
  },
  "competitor-analyzer-demo": {
    component: lazy(() => import("./CompetitorAnalyzerDemo.jsx")),
    type: "report",
    category: "intelligence",
    entities: [],
    icon: "search",
  },
  "tiktok-profile-intelligence": {
    component: lazy(() => import("./TikTokProfileIntelligence.jsx")),
    type: "report",
    category: "intelligence",
    entities: ["contacts"],
    icon: "video",
  },
  "instagram-profile-intelligence": {
    component: lazy(() => import("./InstagramProfileIntelligence.jsx")),
    type: "report",
    category: "intelligence",
    entities: ["contacts"],
    icon: "instagram",
  },
  "tiktok-ads-spy": {
    component: lazy(() => import("./TikTokAdsSpy.jsx")),
    type: "report",
    category: "intelligence",
    entities: ["campaigns"],
    icon: "eye",
  },
  "meta-ads-spy": {
    component: lazy(() => import("./MetaAdsSpy.jsx")),
    type: "report",
    category: "intelligence",
    entities: ["campaigns"],
    icon: "eye",
  },
};

/**
 * Returns the registry entry for a slug, or null if not registered.
 * @param {string} slug
 * @returns {{ component, type, category, entities, icon } | null}
 */
export function getModuleEntry(slug) {
  return MODULE_REGISTRY[slug] ?? null;
}

/**
 * Returns the lazy component for a slug, or null.
 * Preserves the original API surface used by existing host components.
 * @param {string} slug
 * @returns {React.LazyExoticComponent | null}
 */
export function getModuleComponent(slug) {
  return MODULE_REGISTRY[slug]?.component ?? null;
}

/**
 * Returns all slugs that reference a given entity table.
 * Useful for "related modules" suggestions in the dashboard.
 * @param {string} entityTable  e.g. 'contacts'
 * @returns {string[]}
 */
export function getModulesByEntity(entityTable) {
  return Object.entries(MODULE_REGISTRY)
    .filter(([, entry]) => entry.entities.includes(entityTable))
    .map(([slug]) => slug);
}
