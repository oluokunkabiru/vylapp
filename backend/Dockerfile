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
# at container start. Migrate + seed DO need to run at start (they need a
# live DB connection), against the already-compiled plain-JS dist/db/*.js —
# no tsx required, it's a devDependency not present in this stage's
# node_modules. Each phase gets its own echo marker so the sequence is easy
# to follow in the platform's deploy log stream.
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 4000
CMD ["sh", "-c", "echo '[deploy] Running database migrations...' && node dist/db/migrate.js && echo '[deploy] Seeding demo data...' && (node dist/db/seed.js || echo '[deploy] Seed step failed — continuing to start the server anyway, demo data is not required for the app to run') && echo '[deploy] Starting server...' && node dist/server.js"]
