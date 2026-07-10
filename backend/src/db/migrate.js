// Applies all schema files in order. Safe to re-run — all CREATE statements
// use IF NOT EXISTS; INSERT statements use ON CONFLICT DO NOTHING.
//
// Migration order matters:
//   1. schema.sql             — core tables (users, vibes, spaces, etc.)
//   2. schema_translation.sql — translation cache/usage (depends on users, vibes)
//   3. schema_learn.sql       — Learn pillar (depends on users, courses)
//   4. schema_forum.sql       — Forum (depends on users)
//   5. schema_rbac.sql        — RBAC (depends on users, forum_categories)
//
// Each file is applied in a single transaction. If a file fails, it rolls
// back that file only — previously applied files are committed.

const fs   = require("fs");
const path = require("path");
const { Pool } = require("pg");
const env  = require("../config/env");

const MIGRATIONS = [
  "schema.sql",
  "schema_translation.sql",
  "schema_learn.sql",
  "schema_forum.sql",
  "schema_rbac.sql",
];

async function migrate() {
  const pool = new Pool({
    connectionString: env.databaseUrl,
    ssl: env.pgSsl ? { rejectUnauthorized: false } : false,
  });

  console.log("[migrate] Checking if database is already initialized...");
  const clientCheck = await pool.connect();
  try {
    const { rows } = await clientCheck.query(
      "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users')"
    );
    if (rows[0].exists) {
      console.log("[migrate] Database already initialized. Skipping migrations.");
      process.exit(0);
    }
  } catch (err) {
    console.warn("[migrate] Warning checking database state:", err.message);
  } finally {
    clientCheck.release();
  }

  console.log("[migrate] Starting migration sequence...");
  let hasError = false;

  for (const filename of MIGRATIONS) {
    const filepath = path.join(__dirname, filename);
    if (!fs.existsSync(filepath)) {
      console.warn(`[migrate] Skipping ${filename} — file not found`);
      continue;
    }
    const sql = fs.readFileSync(filepath, "utf8");
    console.log(`[migrate] Applying ${filename}...`);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("COMMIT");
      console.log(`[migrate] ✓ ${filename}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`[migrate] ✗ ${filename}:`, err.message);
      hasError = true;
      break; // stop on first failure — subsequent files may depend on this one
    } finally {
      client.release();
    }
  }

  await pool.end();
  if (hasError) {
    console.error("[migrate] Migration failed. Database may be in partial state.");
    process.exitCode = 1;
  } else {
    console.log("[migrate] All migrations applied successfully.");
  }
}

migrate();
