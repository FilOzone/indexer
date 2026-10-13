# ⨎ Filecoin Indexer

> Ponder indexer and shared database schema for Filecoin inventory

## Packages

- [@filoz/indexer](./packages/indexer) - Shared Drizzle schema for the indexer database

## Apps

- [ponder](./apps/ponder) - Filecoin indexer

## Development

```sh
pnpm install
pnpm run build
pnpm run lint
pnpm run test
pnpm run typecheck
pnpm run dev:mainnet # or dev:calibnet
```

Tasks run through [Turborepo](https://turborepo.com).

## Contributing

Read contributing [guidelines](.github/CONTRIBUTING.md).

## License

Dual-licensed: [MIT](./license.md), [Apache Software License v2](./license.md) by way of the
[Permissive License Stack](https://protocol.ai/blog/announcing-the-permissive-license-stack/).
