# ════════════════════════════════════════════════════════════════════════════
#  VYLAPP FRONTEND DOCKERFILE
#
#  Two stages:
#    development  — Vite dev server (used by docker-compose locally)
#    production   — nginx serving the built static files + reverse proxy
#
#  Proxy pattern is IDENTICAL in both stages:
#    /api/*       → backend (strips /api prefix)
#    /socket.io/* → backend (WebSocket)
#
#  The BACKEND_URL build arg / env var is the single switch:
#    docker build --build-arg BACKEND_URL=https://vylapp.onrender.com .
#  Or at runtime for docker-compose (env var is passed via environment:)
# ════════════════════════════════════════════════════════════════════════════

# ── Development stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
# BACKEND_URL is injected by docker-compose → vite.config.js loadEnv reads it
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Accept BACKEND_URL as build arg so vite.config.js can read it during build
ARG BACKEND_URL=https://vylapp.onrender.com
ENV BACKEND_URL=${BACKEND_URL}

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build


# ── Production stage (nginx) ──────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Install envsubst (part of gettext — needed to inject BACKEND_URL into nginx config)
RUN apk add --no-cache gettext

# Copy built static files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx template (uses ${BACKEND_URL} placeholder)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Remove the default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

EXPOSE 80

# nginx official image automatically runs envsubst on /etc/nginx/templates/*.template
# and writes the result to /etc/nginx/conf.d/ before starting nginx.
# BACKEND_URL must be passed as an env var at container start.
CMD ["nginx", "-g", "daemon off;"]
