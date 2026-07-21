# ── Base Stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# ── Development Stage ─────────────────────────────────────────────────────────
# src/ is bind-mounted over this at runtime (see docker-compose.yml), so the
# generated Prisma client present here is only a fallback for the first boot
# before the bind mount's own src/generated takes over.
FROM base AS development
COPY . .
RUN npx prisma generate
EXPOSE 4000
CMD ["npm", "run", "dev"]

# ── Build Stage (production) ──────────────────────────────────────────────────
FROM base AS builder
COPY . .
RUN npx prisma generate && npm run build

# ── Production Stage ──────────────────────────────────────────────────────────
# The Prisma client is already generated at build time (builder stage above)
# and copied in via dist/generated — running `prisma generate` again here
# would need the schema/CLI in the image for no benefit, so it isn't repeated
# at container start. `prisma migrate deploy` DOES need to run at start (it
# needs a live DB connection) — it's the official non-interactive migration
# runner (no shadow DB, never prompts), reading prisma/schema.prisma +
# prisma/migrations + prisma.config.ts, all copied in below alongside dist/.
# Reference-data seeding (RBAC roles/permissions, forum categories, etc.) is
# a hard gate like migrate — the app has no functioning permission system
# without it. Demo data (fake personas + their vibes/Spaces) is gated behind
# SEED_DEMO_DATA=true — it exists purely to make local dev/demo instances
# immediately populated, and must NEVER run unattended against a real
# production database: real users would see fabricated accounts and posts
# presented as genuine platform activity. Unset (the default, i.e. every
# real production deploy) instead runs clear-demo-data.js — idempotent and
# safe to run on every single deploy (a no-op once the personas are already
# gone) — so the deploy is self-healing: even if SEED_DEMO_DATA was ever
# accidentally left on, or demo data existed from before this gating
# existed, the very next deploy removes it automatically. No manual cleanup
# step required, ever. All three run against already-compiled plain-JS
# dist/db/*.js — no tsx required, it's a devDependency not present in this
# stage's node_modules. Each phase gets its own echo marker so the sequence
# is easy to follow in the platform's deploy log stream.
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma
COPY prisma.config.ts ./
EXPOSE 4000
CMD ["sh", "-c", "echo '[deploy] Running database migrations...' && npx prisma migrate deploy && echo '[deploy] Seeding core reference data...' && node dist/db/seedReferenceData.js && if [ \"$SEED_DEMO_DATA\" = \"true\" ]; then echo '[deploy] SEED_DEMO_DATA=true — seeding demo data...' && (node dist/db/seed.js || echo '[deploy] Seed step failed — continuing to start the server anyway, demo data is not required for the app to run'); else echo '[deploy] SEED_DEMO_DATA not set — ensuring no demo data exists (safe no-op if already clean)...' && (node dist/db/clear-demo-data.js || echo '[deploy] Demo-data cleanup step failed — continuing to start the server anyway'); fi && echo '[deploy] Starting server...' && node dist/server.js"]
