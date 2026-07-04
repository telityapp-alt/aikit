/**
 * Drops ONLY legacy automation tables from the old app Supabase project.
 * Requires:
 * - SUPABASE_PAT
 * Uses the existing project ref for the current app Supabase.
 */

import fs from "node:fs/promises";
import path from "node:path";

const PAT = process.env.SUPABASE_PAT || "";
const PROJECT_REF = "lftgaziycyvxqtlwvxgi";
const SQL_FILE = path.resolve(
  process.cwd(),
  "supabase/migrations/0019_drop_legacy_automation_from_old_supabase.sql",
);

if (!PAT) {
  throw new Error("SUPABASE_PAT belum diset. Stop supaya tidak improvisasi.");
}

async function query(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  const sql = await fs.readFile(SQL_FILE, "utf8");
  console.log(`Applying destructive automation cleanup to project ${PROJECT_REF}...`);
  await query(sql);
  console.log("Legacy automation tables dropped successfully.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
