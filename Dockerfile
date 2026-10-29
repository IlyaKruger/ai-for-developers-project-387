# ── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# Empty base URL → SDK uses same-origin relative paths (served by backend)
RUN VITE_API_BASE_URL="" npm run build

# ── Stage 2: Compile backend TypeScript ──────────────────────────────────────
FROM node:20-alpine AS backend-build
WORKDIR /build/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# ── Stage 3: Production image ─────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
# Production dependencies only
COPY backend/package*.json ./
RUN npm ci --omit=dev
# Compiled backend
COPY --from=backend-build /build/backend/dist ./dist
# Frontend static files served by Hono
COPY --from=frontend-build /build/frontend/dist ./public
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/index.js"]
