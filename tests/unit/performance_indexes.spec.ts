import { test } from '@japa/runner'
import AddPerformanceIndexes from '#database/migrations/1773800000000_add_performance_indexes'

test.group('database/migrations | Performance Indexes', () => {
  test('migration class implements up and down schema alter methods', ({ assert }) => {
    assert.isFunction(AddPerformanceIndexes.prototype.up)
    assert.isFunction(AddPerformanceIndexes.prototype.down)
  })
})
