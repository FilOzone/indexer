# Rails

How the indexer builds the `rails`, `rail_settlements` and `rail_one_time_payments` tables, and the rail ids on
`data_sets`, from FilecoinPay and FWSS events.

The `rails` table stores each rail's current state. FilecoinPay doesn't emit an event for every change it makes, so a
few columns are calculated rather than copied from one event field. This page lists each of those columns, the rule
behind it, and the contract code it follows. Contract references are to
[`FilecoinPayV1.sol`](https://github.com/FilOzone/filecoin-pay/blob/main/src/FilecoinPayV1.sol).

The handlers are in [`apps/ponder/src/filecoin-pay.ts`](https://github.com/FilOzone/indexer/blob/main/apps/ponder/src/filecoin-pay.ts).

## Sources

The indexer reads every FilecoinPay rail, whatever its operator, from the contract's deployment block:

| Network | FilecoinPay | Start block |
| --- | --- | --- |
| Mainnet | `0x23b1e018F08BB982348b15a86ee926eEBf7F4DAa` | `5421337` |
| Calibration | `0x09a0fDc2723fAd1A7b8e3e00eE5DF73841df55a0` | `3120649` |

| Event | Effect |
| --- | --- |
| `RailCreated` | Inserts the `rails` row. |
| `RailRateModified` | Sets `payment_rate`; may move `settled_up_to`. |
| `RailLockupModified` | Sets `lockup_period` and `lockup_fixed`. |
| `RailOneTimePaymentProcessed` | Inserts a `rail_one_time_payments` row; lowers `lockup_fixed`; adds to the one-time totals. |
| `RailSettled` | Inserts a `rail_settlements` row; sets `settled_up_to`; adds to the settlement totals. |
| `RailTerminated` | Sets `end_epoch` and `terminated_by`. |
| `RailFinalized` | Sets `finalized`. |

Amounts, rates and lockups are `uint256` on chain and `numeric(78)` in Postgres. Rail ids and epochs are `bigint`.

## `rails`

### Copied from `RailCreated`

`rail_id`, `payer`, `payee`, `token`, `operator`, `validator`, `service_fee_recipient` and `commission_rate_bps` never
change after creation, so they're copied from `RailCreated`. FilecoinPay calls the payer `from` and the payee `to`.
`created_at_block` is the creation block. The table has no timestamp or transaction hash columns; derive the time
from the block number (see [Block times](../README.md#block-times)).

### `payment_rate`

The latest `newRate` from `RailRateModified`, or 0 before the first one.

Only `modifyRailPayment` changes a rail's rate. It sets `rail.paymentRate = newRate` straight away and always emits
`RailRateModified`, even when the rate doesn't change, such as a call that only makes a one-time payment. The
contract's rate-change queue keeps old rates so it can pay out past epochs at the rate in force at the time. It
doesn't affect the current rate.

### `lockup_period`

The latest `newLockupPeriod` from `RailLockupModified`, or 0 before the first one. Only `modifyRailLockup` changes it.

### `lockup_fixed`

Funds locked on the rail for one-time payments. Two things change it:

1. `RailLockupModified` sets it to `newLockupFixed`.
2. `RailOneTimePaymentProcessed` lowers it by the payment's `amount` (see
   [`rail_one_time_payments`](#rail_one_time_payments)).

`modifyRailPayment(railId, newRate, oneTimePayment)` runs `rail.lockupFixed -= oneTimePayment`, but it doesn't emit
`RailLockupModified`. Without step 2, `lockup_fixed` would stay too high after every one-time payment.

### `settled_up_to`

The epoch the rail is settled up to. Payments are owed only for epochs after it. It's never null.

On chain, three places change `rail.settledUpTo`, and only one of them emits an event:

| On chain | Event | Rule here |
| --- | --- | --- |
| `createRail` sets it to `block.number`. | `RailCreated` | Start at the creation block. |
| `enqueueRateChange` sets it to `block.number` when the rate goes from 0 to non-zero and the rate-change queue is empty. | none | Copy the same rule; see below. |
| Settlement moves it forward. | `RailSettled` | Set it to the event's `settledUpTo`, which is the exact on-chain value. |

The second row affects most FWSS rails. FWSS creates rails with rate 0 and sets the rate later, which moves
`settledUpTo` forward with no `RailSettled` event. Skipping that row would leave `settled_up_to` at the creation block
until the rail's first settlement.

#### Copying `enqueueRateChange`

```solidity
if (newRate == oldRate || rail.settledUpTo == block.number) return;
if (oldRate == 0 && rail.rateChangeQueue.isEmpty()) {
    rail.settledUpTo = block.number;
    return;
}
// otherwise enqueue (oldRate, block.number)
```

The indexer doesn't store the queue itself. Instead, `rate_change_queue_until` holds the epoch of the newest entry
added to it, and the queue counts as empty when that column is null or when `settled_up_to >= rate_change_queue_until`.
That matches the contract: settlement removes each entry once it settles up to that entry's epoch
(`_settleWithRateChanges`), and entries are added in epoch order.

On each `RailRateModified(oldRate, newRate)` at block `b`, the handler applies these rules in order:

1. If `newRate == oldRate` or `settled_up_to == b`, change nothing.
2. If `oldRate == 0` and the queue is empty, set `settled_up_to = b` and clear `rate_change_queue_until`.
3. Otherwise set `rate_change_queue_until = b`.

The rule is in [`apps/ponder/src/utils/enqueue-rate-change.ts`](https://github.com/FilOzone/indexer/blob/main/apps/ponder/src/utils/enqueue-rate-change.ts)
and has unit tests. If it ever guesses wrong, the next `RailSettled` overwrites `settled_up_to` with the on-chain value.

### `rate_change_queue_until`

Used only to calculate `settled_up_to`. Don't expose it. It isn't the contract's whole queue, only the newest entry's
epoch.

### `end_epoch` and `terminated_by`

From `RailTerminated`: `end_epoch` is the last epoch the rail pays for, and `terminated_by` is the account that called
`terminateRail`, either the payer or the operator. Both are null while the rail is active.

### `finalized`

Set to true by `RailFinalized`. FilecoinPay finalizes a terminated rail once it's settled up to its end epoch.

`_zeroOutRail` then clears the rail on chain: every field becomes 0, and `getRail` reverts. The indexer keeps the row's
last values instead, so a finalized rail still shows its rate, lockups and totals. Treat `payment_rate` and the lockups
of a finalized rail as its last terms. Nothing is flowing or locked anymore.

### State

The table has no `state` column. Derive it from `finalized` and `end_epoch`:

| State | Condition |
| --- | --- |
| `active` | `not finalized and end_epoch is null` |
| `terminated` | `not finalized and end_epoch is not null` |
| `finalized` | `finalized` |

A terminated rail keeps paying at `payment_rate` up to `end_epoch`, and FilecoinPay lets the operator only lower its
rate and fixed lockup.

### Totals

| Column | Sum of |
| --- | --- |
| `total_settled_amount` | `RailSettled.totalSettledAmount` |
| `total_net_payee_amount` | `RailSettled.totalNetPayeeAmount` |
| `total_operator_commission` | `RailSettled.operatorCommission` |
| `total_network_fee` | `RailSettled.networkFee` |
| `total_one_time_amount` | `rail_one_time_payments.amount` |
| `total_one_time_net_payee_amount` | `RailOneTimePaymentProcessed.netPayeeAmount` |

The four settlement totals don't include one-time payments. The total paid on a rail is
`total_settled_amount + total_one_time_amount`, and the payee's share is
`total_net_payee_amount + total_one_time_net_payee_amount`. To total commission and network fees across both kinds of
payment, add the matching columns from `rail_one_time_payments`.

FWSS pays CDN and cache-miss usage through one-time payments. On those rails, the one-time totals are usually most of
what was paid, and the settlement totals can be 0.

### `updated_at_block`

The block of the latest event that changed the row.

## `rail_settlements`

One row per `RailSettled` event, keyed by `(rail_id, block_number, log_index)`. The table is always read one rail at a
time, newest first, which that key covers without a second index. The amounts and `settled_up_to` are copied from the
event, and `tx_hash` is the transaction that emitted it.

FilecoinPay emits `RailSettled` for every settlement that gets past its early checks, including settlements of 0 and
`settleTerminatedRailWithoutValidation`. It doesn't emit one when the rail is already settled. When a settlement call
finds a terminated rail fully settled, it emits only `RailFinalized`.

## `rail_one_time_payments`

One row per `RailOneTimePaymentProcessed` event, keyed and indexed the same way as `rail_settlements`.

The event leaves out the payment amount. `amount` is `net_payee_amount + operator_commission + network_fee`, which
equals the `oneTimePayment` passed to `modifyRailPayment`, because `calculateAndPayFees` splits it into exactly those
three parts:

```solidity
fee = ceil(amount * NETWORK_FEE_NUMERATOR / NETWORK_FEE_DENOMINATOR);
amount -= fee;
operatorCommission = amount * commissionRateBps / COMMISSION_MAX_BPS;
netPayeeAmount = amount - operatorCommission;
```

## Data set rail ids

FWSS `DataSetCreated` names the rails that pay for a data set. The indexer stores them on `data_sets`, each indexed:

| Column | Notes |
| --- | --- |
| `pdp_rail_id` | The storage rail. Never null. |
| `cache_miss_rail_id` | Null when the data set has no CDN. FWSS reports 0 in that case. |
| `cdn_rail_id` | Null when the data set has no CDN. FWSS reports 0 in that case. |

To find a rail's data set, check all three columns:

```sql
select data_set_id from data_sets
where pdp_rail_id = $1 or cache_miss_rail_id = $1 or cdn_rail_id = $1
```

Rails whose operator isn't FWSS have no data set.

## Not tracked

- **The rate-change queue.** The indexer keeps only the newest entry's epoch, enough for `settled_up_to`. It doesn't
  store which past epochs are still owed at which rate.
- **Accounts and operator approvals.** Payer funds, account lockups and operator allowances change on deposits,
  withdrawals and settlements, through events this indexer doesn't read (`DepositRecorded`, `WithdrawRecorded`,
  `AccountLockupSettled`, `OperatorApprovalUpdated`). Read them from the contract with `accounts`,
  `getAccountInfoIfSettled` and `operatorApprovals`.

## Checking against the chain

`getRail(railId)` returns a non-finalized rail's on-chain state. At the same block, these columns should match the
fields it returns:

| Column | `getRail` field |
| --- | --- |
| `payment_rate` | `paymentRate` |
| `lockup_period` | `lockupPeriod` |
| `lockup_fixed` | `lockupFixed` |
| `settled_up_to` | `settledUpTo` |
| `end_epoch` | `endEpoch` (0 while active) |

`getRail` reverts for finalized rails.
