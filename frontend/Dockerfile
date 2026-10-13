# syntax=docker/dockerfile:1

# ---------- Stage 1: build the static React bundle with Node ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm test && npm run build

# ---------- Stage 2: serve it with unprivileged Nginx (no Node, no build tools) ----------
FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime

LABEL org.opencontainers.image.title="medislot-frontend" \
      org.opencontainers.image.description="MediSlot React dashboard served by Nginx" \
      org.opencontainers.image.licenses="MIT"

# Patch OS packages so the Trivy gate stays green; the base image then drops back to the nginx user.
USER root
RUN apk upgrade --no-cache
USER 101

ENV BACKEND_URL=http://backend:8000

COPY --chown=101:101 nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html

# Non-root containers cannot bind to ports < 1024, so Nginx listens on 8080.
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
