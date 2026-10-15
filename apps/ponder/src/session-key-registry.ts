import { ponder } from 'ponder:registry'
import { sessionKeyEvents, sessionKeyPermissions } from 'ponder:schema'

ponder.on('SessionKeyRegistry:AuthorizationsUpdated', async ({ event, context }) => {
  const { identity, signer, expiry, permissions, origin } = event.args

  await context.db.insert(sessionKeyEvents).values({
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    identity,
    signer,
    expiry,
    permissions: [...permissions],
    origin,
    txHash: event.transaction.hash,
  })

  // Each event sets the expiry of the permissions it lists; revoking sets it to 0.
  for (const permission of permissions) {
    await context.db
      .insert(sessionKeyPermissions)
      .values({
        identity,
        signer,
        permission,
        expiry,
        origin,
        updatedAtBlock: event.block.number,
      })
      .onConflictDoUpdate({
        expiry,
        origin,
        updatedAtBlock: event.block.number,
      })
  }
})
