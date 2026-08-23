FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS builder
WORKDIR /app
COPY . .
RUN npm run build

# adapter-node output (build/) plus a prod-only install — no vite/svelte-check
# in the final image.
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/build ./build

EXPOSE 3000
CMD ["node", "build/index.js"]
