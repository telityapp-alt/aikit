import { HttpError } from "./http.js";

export function requireEnv(env, key, message = null) {
  const value = env?.[key];
  if (value === undefined || value === null || value === "") {
    throw new HttpError(
      503,
      message || `Konfigurasi server ${key} belum dipasang di environment deployment.`,
    );
  }
  return value;
}

export function requireBinding(env, key, message = null) {
  const value = env?.[key];
  if (!value) {
    throw new HttpError(
      503,
      message || `Binding ${key} belum dipasang di deployment Worker.`,
    );
  }
  return value;
}
