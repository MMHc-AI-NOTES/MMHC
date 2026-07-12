FROM node:22-bookworm-slim AS base

WORKDIR /app
ENV CI=true
ENV NODE_ENV=production
ENV PORT=3333
ENV HOST=0.0.0.0

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM base AS runtime
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /app/build ./build

WORKDIR /app/build

EXPOSE 3333

CMD ["node", "bin/server.js"]
