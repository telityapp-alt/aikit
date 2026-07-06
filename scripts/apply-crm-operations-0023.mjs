import { readFile } from "node:fs/promises";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

const ref =
  process.env.SUPABASE_PROJECT_REF ||
  (() => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const match = url.match(/^https:\/\/([^.]+)\.supabase\.co/i);
    return match?.[1] || "";
  })();

const password = process.env.PASSWORD || process.env.SUPABASE_DB_PASSWORD || "";

if (!ref) {
  throw new Error("Missing SUPABASE project ref or SUPABASE_URL.");
}

if (!password) {
  throw new Error("Missing PASSWORD / SUPABASE_DB_PASSWORD.");
}

const connectionString = `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;

async function tableExists(client, tableName) {
  const result = await client.query(
    `select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = $1
    ) as exists`,
    [tableName],
  );
  return result.rows[0]?.exists === true;
}

async function functionExists(client, functionName) {
  const result = await client.query(
    `select exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = $1
    ) as exists`,
    [functionName],
  );
  return result.rows[0]?.exists === true;
}

async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  console.log(`Connecting to Supabase project ${ref}...`);
  await client.connect();

  try {
    const peopleReady = await tableExists(client, "crm_people");
    const orgReady = await tableExists(client, "crm_organizations");
    const activitiesReady = await tableExists(client, "activities");
    const normalizeReady = await functionExists(client, "crm_normalize_text");

    if (!peopleReady || !orgReady) {
      throw new Error(
        "CRM foundation tables belum ada. Jalankan 0022_crm_foundation_phase0_phase1.sql dulu.",
      );
    }

    if (!activitiesReady) {
      throw new Error(
        "Table public.activities belum ada. Pastikan marketing operations foundation sudah aktif dulu.",
      );
    }

    if (!normalizeReady) {
      throw new Error(
        "Function public.crm_normalize_text belum ada. Pastikan migration 0022 sudah applied.",
      );
    }

    const sql = await readFile(
      new URL("../supabase/migrations/0023_crm_operations_phase5_phase6.sql", import.meta.url),
      "utf8",
    );

    console.log("Applying 0023_crm_operations_phase5_phase6.sql ...");
    await client.query(sql);
    console.log("CRM operations migration applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
