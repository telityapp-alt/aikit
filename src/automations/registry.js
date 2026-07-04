import { lazy } from "react";

export const AUTOMATION_REGISTRY = {
  "instagram-profiles-brightdata": {
    component: lazy(() => import("./InstagramProfilesBrightData.jsx")),
    provider: "brightdata",
    type: "url-collection",
  },
};

export function getAutomationEntry(slug) {
  return AUTOMATION_REGISTRY[slug] ?? null;
}

export function getAutomationComponent(slug) {
  return AUTOMATION_REGISTRY[slug]?.component ?? null;
}
