import { test } from '@japa/runner'
import AddSessionCreatedAtIndexes from '#database/migrations/1773900000000_add_session_created_at_indexes'

test.group('database/migrations | Session created_at Indexes', () => {
  test('migration class implements up and down schema alter methods', ({ assert }) => {
    assert.isFunction(AddSessionCreatedAtIndexes.prototype.up)
    assert.isFunction(AddSessionCreatedAtIndexes.prototype.down)
  })
})
