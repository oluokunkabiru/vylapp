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
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/server.js"]
