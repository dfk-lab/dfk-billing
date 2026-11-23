# ---- Dependensi ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# ---- Runtime ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=4000 \
    HOSTNAME=0.0.0.0
RUN npm i -g prisma@6.19.3 \
    && apk add --no-cache su-exec \
    && addgroup -S nodejs \
    && adduser -S nextjs -G nodejs \
    && mkdir -p /app/data \
    && chown -R nextjs:nodejs /app/data
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma/schema.prisma ./prisma/schema.prisma
EXPOSE 4000
# Bind mount ./data dari host bisa dimiliki root (CasaOS) — siapkan folder
# sebagai root, lalu jalankan aplikasi sebagai nextjs.
CMD ["sh", "-c", "mkdir -p /app/data/upload /app/data/cadangan-otomatis && chown -R nextjs:nodejs /app/data && su-exec nextjs sh -c 'npx prisma db push --skip-generate && exec node server.js'"]
