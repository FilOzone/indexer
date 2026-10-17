# Changelog

## 1.0.0 (2026-10-17)


### ⚠ BREAKING CHANGES

* **indexer:** the @filoz/indexer/table-names export is removed. Use getTableName() from drizzle-orm on the exported tables instead.
* **ponder:** @filoz/indexer no longer exports PDP_PRODUCT_TYPE. Use PRODUCTS.PDP from @filoz/synapse-core/sp-registry instead.

### Features

* **indexer:** index rails and session keys, fix data set and provider state ([#10](https://github.com/FilOzone/indexer/issues/10)) ([bbee530](https://github.com/FilOzone/indexer/commit/bbee530084127a2ddd8ad0e79eb394f229272819))


### Code Refactoring

* **indexer:** define the schema once, in ponder.schema.ts ([#9](https://github.com/FilOzone/indexer/issues/9)) ([4e27ccc](https://github.com/FilOzone/indexer/commit/4e27ccc21dead7463b985eac8990525c07dad0e0))
* **ponder:** use @filoz/synapse-core for ABIs, chains and helpers ([#5](https://github.com/FilOzone/indexer/issues/5)) ([e1e011e](https://github.com/FilOzone/indexer/commit/e1e011e518f9ec41666a0052ba7f218e5a23d8d9))
