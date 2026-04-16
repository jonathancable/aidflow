# apps/web/Dockerfile
# ── Stage 1: Build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps/web ./apps/web

# Build shared package first
RUN pnpm --filter @aidflow/shared run build

# Build Vite production bundle
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm --filter @aidflow/web run build

# ── Stage 2: Serve with nginx ─────────────────────────────────────
FROM nginx:1.27-alpine AS production

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# SPA routing — all paths serve index.html; nginx forwards /api/* to the API
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
