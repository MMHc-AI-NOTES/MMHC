import { redisConfig } from '#config/services'

/**
 * BullMQ connection options, with the ioredis `keyPrefix` removed.
 *
 * BullMQ refuses a client that carries an ioredis keyPrefix. The check only
 * fires when it is handed a live client rather than a plain options object,
 * which is why a normal queue built from redisConfig works: it takes the plain
 * object branch and never trips the guard.
 *
 * Reading `queue.repeat` is different. It constructs Repeat with the already
 * connected client, that client reports keyPrefix, and BullMQ throws at startup:
 *
 *   BullMQ: ioredis does not support ioredis prefixes, use the prefix option
 *
 * So only queues that register a repeatable job hit this. The webhook, CPT and
 * email queues never touch `repeat`, which is why they run fine on the same
 * config while the note review sweep crash looped on boot.
 */
const { keyPrefix, ...connection } = redisConfig

export const bullConnection = connection

/**
 * BullMQ's own prefix, chosen so the Redis keys are byte identical to what the
 * existing queues already produce. ioredis prepends 'mmh-' to BullMQ's default
 * 'bull', giving 'mmh-bull:<queue>:<id>'. Setting the prefix to 'mmh-bull' with
 * no keyPrefix produces exactly the same keys, so nothing already in Redis is
 * orphaned and the dashboard keeps reading the same namespace.
 */
export const bullPrefix = `${keyPrefix ?? ''}bull`
