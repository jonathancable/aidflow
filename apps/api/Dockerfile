# apps/api/Dockerfile
# ── Stage 1: Build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl
RUN npm install -g pnpm@9

WORKDIR /app
# Copy workspace manifests first — Docker layer cache
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install ALL deps (including dev — needed for tsc)
RUN pnpm install --frozen-lockfile
 
# Copy source
COPY packages ./packages
COPY apps/api  ./apps/api
 
# Build shared package first (api depends on it)
RUN pnpm --filter @aidflow/shared run build

# Generate Prisma client — run from apps/api so it uses the project's own prisma binary
RUN cd apps/api && ./node_modules/.bin/prisma generate

# Compile TypeScript → JavaScript
RUN pnpm --filter @aidflow/api run build
 
# ── Stage 2: Production image ─────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache openssl

# Create non-root user — production containers must NOT run as root
RUN addgroup -S aidflow && adduser -S aidflow -G aidflow

WORKDIR /app

# Copy node_modules from builder — avoids re-running pnpm install with
# workspace packages that aren't fully present in the production stage
COPY --from=builder /app/node_modules          ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# Copy compiled output and Prisma artefacts from builder
COPY --from=builder /app/apps/api/dist           ./apps/api/dist
COPY --from=builder /app/apps/api/src/generated  ./apps/api/dist/generated
COPY --from=builder /app/apps/api/prisma         ./apps/api/prisma
COPY --from=builder /app/packages/shared/dist    ./packages/shared/dist

# Give aidflow user ownership of everything (required for prisma migrate at runtime)
RUN chown -R aidflow:aidflow /app

# Switch to non-root user
USER aidflow
 
EXPOSE 4000
 
# Run migrations then start the server
CMD ["sh", "-c", "node_modules/.pnpm/node_modules/.bin/prisma migrate deploy --schema=apps/api/prisma/schema.prisma && node apps/api/dist/index.js"]
