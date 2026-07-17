// Applies schema files in order, tracking which ones have already run in a
// schema_migrations table so it's safe to run on every container start.
//
// NOTE: this does NOT mean every individual file is idempotent on its own —
// schema.sql in particular uses bare `CREATE TYPE`, which errors if re-run
// against a database that already has it. Tracking applied filenames (rather
// than blindly re-running everything, or skipping everything once `users`
// exists) is what lets new files added later — like schema_founding.sql —
// actually get picked up without re-executing ones that already succeeded.
//
// Migration order matters:
//   1. schema.sql             — core tables (users, vibes, spaces, etc.)
//   2. schema_translation.sql — translation cache/usage (depends on users, vibes)
//   3. schema_location.sql    — structured current/heritage location (depends on users)
//   4. schema_founding.sql    — founding-member flag (depends on users)
//   5. schema_learn.sql       — Learn pillar (depends on users, courses)
//   6. schema_forum.sql       — Forum (depends on users)
//   7. schema_rbac.sql        — RBAC (depends on users, forum_categories)
//
// Each file is applied in a single transaction. If a file fails, it rolls
// back that file only — previously applied files are committed.

import fs from "fs";
import path from "path";
import { Pool } from "pg";
import env from "../config/env";

const MIGRATIONS = [
  "schema.sql",
  "schema_translation.sql",
  "schema_location.sql",
  "schema_founding.sql",
  "schema_learn.sql",
  "schema_forum.sql",
  "schema_rbac.sql",
];

async function migrate() {
  const pool = new Pool({
    connectionString: env.databaseUrl,
    ssl: env.pgSsl ? { rejectUnauthorized: false } : false,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  console.log("[migrate] ── starting migration sequence ───────────────────────");
  let hasError = false;

  for (const filename of MIGRATIONS) {
    const { rows: already } = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE filename = $1", [filename]
    );
    if (already.length) {
      console.log(`[migrate] Skipping ${filename} — already applied`);
      continue;
    }

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
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
      await client.query("COMMIT");
      console.log(`[migrate] ✓ ${filename}`);
    } catch (err: any) {
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
    console.log("[migrate] ── migration sequence complete ───────────────────────");
  }
}

migrate();
