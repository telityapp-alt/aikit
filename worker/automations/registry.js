import { instagramProfilesBrightData } from "./instagramProfilesBrightData.js";

export const AUTOMATION_EXECUTORS = {
  [instagramProfilesBrightData.slug]: instagramProfilesBrightData,
};

export function getAutomationExecutor(slug) {
  return AUTOMATION_EXECUTORS[slug] ?? null;
}
