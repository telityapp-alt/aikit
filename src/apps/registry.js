import { lazy } from "react";

export const APP_REGISTRY = {
  crm: {
    component: lazy(() => import("./crm/index.jsx")),
    title: "CRM Foundation",
    description:
      "Shared relationship backbone untuk people, organizations, leads, deals, dan aktivitas lintas module.",
    category: "Foundation",
    pricing: "Free",
    users: 0,
    icon: "network",
    image: null,
  },
};

export const APP_CARDS = Object.entries(APP_REGISTRY).map(([slug, entry]) => ({
  id: slug,
  title: entry.title,
  desc: entry.description,
  category: entry.category,
  pricing: entry.pricing,
  users: entry.users,
  image: entry.image,
}));

export function getAppEntry(slug) {
  return APP_REGISTRY[slug] ?? null;
}

export function getAppComponent(slug) {
  return APP_REGISTRY[slug]?.component ?? null;
}
