import { lazy } from "react";

/**
 * Module Registry maps module slugs to their dashboard component metadata.
 */
export const MODULE_REGISTRY = {
  "keuangan-pribadi": {
    component: lazy(() => import("./KeuanganPribadi.jsx")),
    type: "stateful",
    category: "keuangan",
    entities: [],
    icon: "wallet",
  },
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
};

export function getModuleEntry(slug) {
  return MODULE_REGISTRY[slug] ?? null;
}

export function getModuleComponent(slug) {
  return MODULE_REGISTRY[slug]?.component ?? null;
}

export function getModulesByEntity(entityTable) {
  return Object.entries(MODULE_REGISTRY)
    .filter(([, entry]) => entry.entities.includes(entityTable))
    .map(([slug]) => slug);
}
