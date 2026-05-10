FROM node:20-alpine AS base

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV RESULTS_DIR=/home/d1ff1cult/masterproef_new/results
RUN npm run build

# --- Production ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV RESULTS_DIR=/home/d1ff1cult/masterproef_new/results
ENV DATASET_PATH=/home/d1ff1cult/masterproef_new/data/datasets/BE_ENTSOE.csv
ENV PORT=3005
ENV HOSTNAME=0.0.0.0
ENV PYTHON_BIN=/usr/bin/python3

# Required by /api/predictions to mean-merge run_*/predictions.npz files.
RUN apk add --no-cache python3 py3-numpy

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

USER nextjs
EXPOSE 3005

CMD ["node", "server.js"]
