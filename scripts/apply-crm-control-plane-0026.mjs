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
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = $1
    ) as exists`,
    [tableName],
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
    const profilesReady = await tableExists(client, "profiles");
    if (!profilesReady) {
      throw new Error("Profiles table belum tersedia.");
    }

    const sql = await readFile(
      new URL("../supabase/migrations/0026_crm_control_plane_phase6_phase8.sql", import.meta.url),
      "utf8",
    );

    console.log("Applying 0026_crm_control_plane_phase6_phase8.sql ...");
    await client.query(sql);
    console.log("CRM control-plane migration applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
