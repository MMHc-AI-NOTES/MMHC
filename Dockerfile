FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV CI=true
ENV PORT=3333
ENV HOST=0.0.0.0

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3333
ENV HOST=0.0.0.0
ENV LOG_LEVEL=info
ENV APP_NAME=mmhc-backend

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs --create-home appuser

COPY --from=build --chown=appuser:nodejs /app/package.json ./package.json
COPY --from=build --chown=appuser:nodejs /app/package-lock.json ./package-lock.json
COPY --from=build --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=appuser:nodejs /app/build ./build

RUN npm prune --ignore-scripts --omit=dev


USER appuser

EXPOSE 3333
CMD ["sh", "-c", "NODE_ENV=production exec node build/bin/server.js"]
