# Shared image for both the API listener and the worker — docker-compose.yml

FROM node:22-bookworm-slim AS base
RUN apt-get update -y && apt-get install -y --no-install-recommends \
    openssl \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    libexpat1 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

FROM deps AS builder
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Final runtime image: a fresh prod-only install (no tsx/typescript/eslint)
# plus the already-generated Prisma client and compiled dist/ layered in.
FROM base AS runner
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY prisma ./prisma
COPY --from=builder /app/dist ./dist

# Generated QR images/zips — mounted as a volume in compose so the api
RUN mkdir -p /app/storage

EXPOSE 4000
CMD ["node", "dist/server.js"]
