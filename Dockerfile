FROM node:22-slim AS base
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv curl git && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@9

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY lib/ lib/
COPY artifacts/api-server/ artifacts/api-server/
COPY artifacts/lara-web/ artifacts/lara-web/
COPY tsconfig*.json ./
RUN pnpm install --no-frozen-lockfile --config.minimumReleaseAge=0
RUN BASE_PATH=/ pnpm --filter @workspace/lara-web run build
RUN pnpm --filter @workspace/api-server run build

FROM base AS runtime
WORKDIR /app
RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"
RUN pip install --no-cache-dir curl_cffi requests

COPY --from=builder /app/artifacts/api-server/dist/ ./dist/
COPY --from=builder /app/artifacts/api-server/fb_helper.py ./
COPY --from=builder /app/artifacts/lara-web/dist/public/ ./public/
COPY --from=builder /app/node_modules/ ./node_modules/

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
