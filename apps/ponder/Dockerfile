# syntax=docker/dockerfile:1.7

FROM node:24-slim AS base

ENV NO_COLOR=1
ARG TURBO_VERSION=2.11.7

RUN corepack enable

WORKDIR /app

# Keep only the ponder app and its workspace dependencies.
FROM base AS prune

COPY . .
RUN pnpm dlx turbo@${TURBO_VERSION} prune @filoz/indexer-ponder --docker

# Build workspace dependencies with dev dependencies installed.
FROM base AS build

COPY --from=prune /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=prune /app/out/full/ .
COPY tsconfig.json ./
RUN pnpm turbo run build --filter=@filoz/indexer-ponder...

# Production dependencies only, installed as the runtime user so no chown layer is needed.
FROM base AS runtime

RUN chown node:node /app
USER node

COPY --chown=node:node --from=prune /app/out/json/ .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store,uid=1000,gid=1000 \
    --mount=type=cache,id=pnpm-cache,target=/pnpm/cache,uid=1000,gid=1000 \
    pnpm install --frozen-lockfile --prod --store-dir=/pnpm/store --config.cache-dir=/pnpm/cache

COPY --chown=node:node --from=prune /app/out/full/ .
COPY --chown=node:node --from=build /app/packages/indexer/dist packages/indexer/dist

WORKDIR /app/apps/ponder

ENTRYPOINT ["./node_modules/.bin/ponder"]
CMD ["start"]
