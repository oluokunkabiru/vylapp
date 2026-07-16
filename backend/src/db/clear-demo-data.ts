// Removes the seed personas (Aisha, Marcus, Jade, Remi, Tanvi, Leon, Sena —
// id prefix '00000000-0000-0000-0001-') and everything they authored
// (vibes, Spaces, Learn courses/lessons, creator tiers, etc.), leaving real
// user data untouched. Safe to re-run — every step is a no-op once the
// personas are already gone.
//
// A few tables reference courses/users with ON DELETE RESTRICT instead of
// CASCADE (courses -> educator_profiles, certificates, community_moderators
// assigned_by), so those have to be cleared in dependency order before the
// user rows themselves can be deleted.
import { Pool } from "pg";
import env from "../config/env";

const PERSONA_IDS = [
  "00000000-0000-0000-0001-000000000001", // aisha
  "00000000-0000-0000-0001-000000000002", // marcus
  "00000000-0000-0000-0001-000000000003", // jade
  "00000000-0000-0000-0001-000000000004", // remi
  "00000000-0000-0000-0001-000000000005", // tanvi
  "00000000-0000-0000-0001-000000000006", // leon
  "00000000-0000-0000-0001-000000000007", // sena
];

async function clearDemoData() {
  const pool = new Pool({ connectionString: env.databaseUrl, ssl: env.pgSsl ? { rejectUnauthorized: false } : false });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log("[clear-demo-data] removing certificates tied to demo courses/educators ...");
    await client.query(
      `DELETE FROM certificates
       WHERE user_id = ANY($1::uuid[])
          OR course_id IN (
               SELECT c.id FROM courses c
               JOIN educator_profiles ep ON ep.id = c.educator_id
               WHERE ep.user_id = ANY($1::uuid[])
             )`,
      [PERSONA_IDS]
    );

    console.log("[clear-demo-data] removing community moderator grants issued by demo personas ...");
    await client.query(`DELETE FROM community_moderators WHERE assigned_by = ANY($1::uuid[])`, [PERSONA_IDS]);

    console.log("[clear-demo-data] removing demo Learn courses (cascades lessons, checkpoints, enrolments) ...");
    const { rowCount: coursesDeleted } = await client.query(
      `DELETE FROM courses
       WHERE educator_id IN (SELECT id FROM educator_profiles WHERE user_id = ANY($1::uuid[]))`,
      [PERSONA_IDS]
    );

    console.log("[clear-demo-data] removing demo educator profiles ...");
    await client.query(`DELETE FROM educator_profiles WHERE user_id = ANY($1::uuid[])`, [PERSONA_IDS]);

    console.log("[clear-demo-data] removing demo personas (cascades vibes, Spaces, creator tiers, connections, etc.) ...");
    const { rowCount: usersDeleted } = await client.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [PERSONA_IDS]);

    await client.query("COMMIT");
    console.log(`[clear-demo-data] done. Removed ${usersDeleted} demo user(s) and ${coursesDeleted} demo course(s).`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

clearDemoData().catch(err => { console.error("[clear-demo-data] failed:", err); process.exit(1); });
