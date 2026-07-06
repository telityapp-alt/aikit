import { lazy } from "react";

export const AUTOMATION_REGISTRY = {
  "instagram-profile-intelligence": {
    component: lazy(() => import("./InstagramProfileScanner.jsx")),
    type: "url-collection",
  },
  "instagram-profiles-brightdata": {
    component: lazy(() => import("./InstagramProfileScanner.jsx")),
    type: "url-collection",
  },
};

export function getAutomationEntry(slug) {
  return AUTOMATION_REGISTRY[slug] ?? null;
}

export function getAutomationComponent(slug) {
  return AUTOMATION_REGISTRY[slug]?.component ?? null;
}
