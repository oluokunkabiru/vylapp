# ── Base Stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# ── Development Stage ─────────────────────────────────────────────────────────
FROM base AS development
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]

# ── Production Stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["node", "src/server.js"]
