import { SortsInterface } from '#interfaces/sorts_interface'
import { BaseModel } from '@adonisjs/lucid/orm'
import { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

export const applySorting = (
  query: ModelQueryBuilderContract<typeof BaseModel>,
  sorts?: Array<SortsInterface>,
  sortEnum?: Array<string>
) => {
  let appendQuery = query
  let invalidSortColumn: boolean = false
  let invalidSortOrder: boolean = false

  if (sorts?.length) {
    sorts.forEach((sort: SortsInterface) => {
      if (!sortEnum?.includes(sort.columnName)) {
        invalidSortColumn = true
        return
      }

      if (sort.orderBy !== 'desc' && sort.orderBy !== 'asc') {
        invalidSortOrder = true
        return
      }

      appendQuery = appendQuery.orderBy(
        `${query.model.table}.${sort.columnName}`,
        sort.orderBy === 'desc' ? 'desc' : 'asc'
      )
    })
  }

  if (invalidSortColumn) {
    throw new Error(`List of valid sorting [${sortEnum}]`)
  }

  if (invalidSortOrder) {
    throw new Error(`Valid sort order types are: ['asc', 'desc']`)
  }

  return {
    status: invalidSortColumn,
    message: 'sorting query',
    query: appendQuery,
  }
}
