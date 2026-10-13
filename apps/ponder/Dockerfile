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

FROM base AS build

COPY --from=prune /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=prune /app/out/full/ .
COPY tsconfig.json ./
RUN pnpm turbo run build --filter=@filoz/indexer-ponder...
RUN chown -R node:node /app

USER node
WORKDIR /app/apps/ponder

ENTRYPOINT ["./node_modules/.bin/ponder"]
CMD ["start"]
