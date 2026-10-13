# Providers

How the indexer builds the `providers` table from ServiceProviderRegistry, FWSS and the endorsement set.

ServiceProviderRegistry is where storage providers register, describe themselves and list their PDP service. FWSS
keeps its own list of approved providers, and a separate endorsement set lists endorsed providers. This page explains
where each column comes from. Contract references are to
[filecoin-services v1.4.0](https://github.com/FilOzone/filecoin-services/tree/v1.4.0/service_contracts/src), which
contains ServiceProviderRegistry 1.2.0, the version deployed on both networks.

The handlers are in
[`apps/ponder/src/sp-registry.ts`](https://github.com/FilOzone/indexer/blob/main/apps/ponder/src/sp-registry.ts),
[`apps/ponder/src/fwss.ts`](https://github.com/FilOzone/indexer/blob/main/apps/ponder/src/fwss.ts) and
[`apps/ponder/src/provider-status.ts`](https://github.com/FilOzone/indexer/blob/main/apps/ponder/src/provider-status.ts).

## Sources

| Network | ServiceProviderRegistry | Endorsement set |
| --- | --- | --- |
| Mainnet | `0xf55dDbf63F1b55c3F1D4FA7e339a68AB7b64A5eB` | `0x59eFa2e8324E1551d46010d7B0B140eE2F5c726b` |
| Calibration | `0x839e5c9988e4e9977d40708d0094103c0839Ac9D` | `0xAA2f7CfC7ecAc616EC9C1f6d700fAd19087FAC84` |

The registry is read from the FWSS start block (mainnet `5459607`, calibration `3141266`). The registry was deployed
just after it on both networks, so no registration is missed. Every registry event the indexer reads has had the same
signature in every release.

| Event | Contract | Effect |
| --- | --- | --- |
| `ProviderRegistered` | Registry | Inserts the row; reads name and address from the registry. |
| `ProviderInfoUpdated` | Registry | Reads name and address again. |
| `ProductAdded`, `ProductUpdated` | Registry | For PDP products: sets `service_url`, `provider_address` and `pdp_product_active`. |
| `ProductRemoved` | Registry | For PDP products: sets `pdp_product_active` to false. |
| `ProviderRemoved` | Registry | Sets `provider_active` and `pdp_product_active` to false. |
| `ProviderApproved`, `ProviderUnapproved` | FWSS | Sets `approved`. |
| Every 480 blocks | Endorsement set | Sets `endorsed`. |

## Columns

### `provider_id`

The registry's provider id. Ids are never reused: a removed provider's address can register again, but it gets a new
id.

### `provider_address` and `name`

The registry's `ProviderRegistered` and `ProviderInfoUpdated` events don't include the name, so the indexer calls the
registry's `providers(providerId)` getter at the event's block. That call needs an archive RPC node.

- `provider_address` is the provider's `serviceProvider`, the address that controls the registration. The product
  events carry it too, as `serviceProvider`.
- `name` is the provider's display name. Only `updateProviderInfo` changes it, and that emits `ProviderInfoUpdated`.

If the call fails, the indexer keeps the existing row unchanged. For a new provider, it inserts the address from
`ProviderRegistered`, with a null name.

### `service_url`

The PDP product's `serviceURL` capability, decoded from bytes to a string. It's set by `ProductAdded` and
`ProductUpdated` for the PDP product type, and null when the capability is missing or can't be decoded.

The indexer reads only this capability. The registry checks for required PDP capabilities with a Bloom filter, which
can let a missing key through, so decoding every capability could fail on a registration the chain accepted.

### `provider_active`

False once the provider removes itself (`ProviderRemoved`). The registry marks the provider inactive and frees its
address.

### `pdp_product_active`

True while the provider has an active PDP product. `ProductAdded` and `ProductUpdated` set it to true, and
`ProductRemoved` sets it to false.

`ProviderRemoved` also sets it to false. Removing a provider deactivates its PDP product on chain (`_removeProvider`),
but the registry emits only `ProviderRemoved`, not `ProductRemoved`.

### `approved`

Whether FWSS currently approves the provider, from `ProviderApproved` and `ProviderUnapproved`. FWSS's owner manages
this list (`addApprovedProvider` and `removeApprovedProvider`).

### `endorsed`

Whether the provider is in the endorsement set (`ProviderIdSet`). That contract emits no events, so a block handler calls
`getProviderIds()` every 480 blocks (about 4 hours) and updates `endorsed` for every provider. It starts at the set's
first block: mainnet `5664991`, calibration `3364286`.

Endorsement changes can take up to 480 blocks to show up.

### `created_at_block` and `updated_at_block`

The block of the first event for the provider, and of the latest event that changed the row. An endorsement sync also
updates `updated_at_block` for the providers whose `endorsed` value changed.

## Checking against the chain

- **Registry `getProvider(providerId)`** returns the address, name and `isActive`.
- **Registry `getProviderWithProduct(providerId, 0)`** returns the PDP product, with its `isActive` flag and its
  capabilities, including `serviceURL`.
- **`isProviderApproved(providerId)`** on the FWSS state view contract returns `approved`.
- **Endorsement set `containsProviderId(providerId)`** returns `endorsed`.
