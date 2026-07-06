// Adds demo content on top of the personas already seeded by schema.sql
// (Aisha, Marcus, Jade, Remi, Tanvi, Leon, Sena) — vibes, Spaces, and a
// known login password, so the backend is immediately demoable against
// the vylapp-instagram.jsx frontend without any manual data entry.
const { Pool } = require("pg");
const env = require("../config/env");
const { hashPassword } = require("../utils/crypto");

const DEMO_PASSWORD = "VylappDemo123!";

const USERS = {
  aisha: "00000000-0000-0000-0001-000000000001",
  marcus: "00000000-0000-0000-0001-000000000002",
  jade: "00000000-0000-0000-0001-000000000003",
  remi: "00000000-0000-0000-0001-000000000004",
  tanvi: "00000000-0000-0000-0001-000000000005",
  leon: "00000000-0000-0000-0001-000000000006",
  sena: "00000000-0000-0000-0001-000000000007",
};

async function seed() {
  const pool = new Pool({ connectionString: env.databaseUrl, ssl: env.pgSsl ? { rejectUnauthorized: false } : false });

  console.log("[seed] setting known demo password for all seed personas ...");
  const hash = hashPassword(DEMO_PASSWORD);
  await pool.query(`UPDATE users SET password_hash = $1 WHERE id::text LIKE '00000000-0000-0000-0001-%'`, [hash]);

  console.log("[seed] inserting demo vibes ...");
  const vibes = [
    { user: USERS.aisha, cat: "TECH_VIBES", content: "Just open-sourced our community governance toolkit, built for Web3 DAOs but it works for any group making decisions together. Three months of building with Tech Vibers kept me accountable.", tags: ["opensource", "daos"], badge: "GLOBAL IMPACT" },
    { user: USERS.remi, cat: "GLOBAL_CONNECT", content: "We just reached 10,000 farmers using our AI crop advisory tool across 5 African countries. This idea started as a Global Connect thread 18 months ago.", tags: ["agritech", "africa"], badge: null },
    { user: USERS.jade, cat: "CREATIVE_LEARN", content: "Dropping a 12-piece generative art collection tonight, every piece reacts to real-time climate data. Preview at 9PM in the Creative Learn Space.", tags: ["genart", "climateart"], badge: null, event: { title: "AI x Climate Art — Collector Preview", time: "Tonight, 9PM" } },
    { user: USERS.tanvi, cat: "HUMAN_POTENTIAL", content: "Hot take: the best learning system is the one your community holds you accountable to. None of the apps worked until I started sharing weekly reviews.", tags: ["learning", "accountability"], badge: null },
  ];
  for (const v of vibes) {
    await pool.query(
      `INSERT INTO vibes (user_id, content, category, tags, impact_badge, event_title, event_time, likes_count, reposts_count, replies_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [v.user, v.content, v.cat, v.tags, v.badge, v.event?.title || null, v.event?.time || null,
       Math.floor(400 + Math.random() * 1800), Math.floor(50 + Math.random() * 400), Math.floor(20 + Math.random() * 300)]
    );
  }

  console.log("[seed] inserting demo Spaces ...");
  const spaces = [
    { host: USERS.leon, title: "Building Your Second Brain in 2026", cat: "HUMAN_POTENTIAL", status: "live", listeners: 1840 },
    { host: USERS.aisha, title: "Web3 DAO Governance, Deep Vibe", cat: "TECH_VIBES", status: "live", listeners: 423 },
    { host: USERS.jade, title: "AI Art & Climate Data Preview", cat: "CREATIVE_LEARN", status: "scheduled", listeners: 0 },
    { host: USERS.remi, title: "African AgriTech: Scale & Impact", cat: "GLOBAL_CONNECT", status: "scheduled", listeners: 0 },
  ];
  for (const s of spaces) {
    await pool.query(
      `INSERT INTO spaces (host_id, title, category, status, listeners_count, peak_listeners, started_at, scheduled_for)
       VALUES ($1,$2,$3,$4,$5,$5,$6,$7)`,
      [s.host, s.title, s.cat, s.status, s.listeners,
       s.status === "live" ? new Date() : null,
       s.status === "scheduled" ? new Date(Date.now() + 3600000) : null]
    );
  }

  console.log("[seed] marking Jade as a creator with a subscription tier ...");
  await pool.query(`UPDATE users SET is_creator = TRUE WHERE id = $1`, [USERS.jade]);
  await pool.query(
    `INSERT INTO creator_profiles (user_id, categories) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
    [USERS.jade, ["creative", "human"]]
  );
  await pool.query(
    `INSERT INTO creator_subscription_tiers (creator_id, name, description, price_usd, perks)
     VALUES ($1, 'Studio Circle', 'Early access to drops + monthly critique session', 8, $2)
     ON CONFLICT DO NOTHING`,
    [USERS.jade, ["Early access", "Monthly critique", "Discord access"]]
  );

  console.log(`[seed] done. Demo login password for any seed user: ${DEMO_PASSWORD}`);
  console.log("[seed] e.g. POST /auth/login { emailOrHandle: 'aisha.k', password: '" + DEMO_PASSWORD + "' }");
  await pool.end();
}

seed().catch(err => { console.error("[seed] failed:", err); process.exit(1); });
