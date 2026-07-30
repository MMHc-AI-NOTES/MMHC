import { test } from '@japa/runner'
import { bullConnection, bullPrefix } from '#jobs/bull_connection'
import { redisConfig } from '#config/services'

/**
 * Regression cover for a crash loop on staging. The note review worker restarted
 * roughly a thousand times without completing a single sweep, because BullMQ
 * throws when it builds Repeat from a client carrying an ioredis keyPrefix:
 *
 *   BullMQ: ioredis does not support ioredis prefixes, use the prefix option
 *
 * Only queues that register a repeatable job reach that code path, so the other
 * three workers stayed healthy on the same config and the fault looked like a
 * problem with the sweep itself.
 */
test.group('BullMQ connection', () => {
  test('carries no ioredis keyPrefix', ({ assert }) => {
    // The single assertion that would have caught the outage.
    assert.notProperty(bullConnection, 'keyPrefix')
  })

  test('keeps every other connection setting', ({ assert }) => {
    for (const key of Object.keys(redisConfig)) {
      if (key === 'keyPrefix') continue
      assert.property(bullConnection, key)
      assert.deepEqual((bullConnection as any)[key], (redisConfig as any)[key])
    }
  })

  test('host and port survive the rewrite', ({ assert }) => {
    assert.equal((bullConnection as any).host, redisConfig.host)
    assert.equal((bullConnection as any).port, redisConfig.port)
  })

  test('the prefix reproduces the existing key namespace exactly', ({ assert }) => {
    // ioredis prepended 'mmh-' to BullMQ's default 'bull', giving keys like
    // 'mmh-bull:note-review-processing:...'. Moving the prefix into BullMQ has
    // to produce the same string, or existing keys are orphaned and the
    // dashboard reads an empty namespace.
    assert.equal(bullPrefix, `${redisConfig.keyPrefix}bull`)
  })

  test('the prefix ends in bull so queue keys stay recognisable', ({ assert }) => {
    assert.isTrue(bullPrefix.endsWith('bull'))
  })

  test('the prefix is never empty, which would collide with unprefixed keys', ({ assert }) => {
    assert.isNotEmpty(bullPrefix)
  })
})
