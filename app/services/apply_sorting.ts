import { SortsInterface } from '#interfaces/sorts_interface'
import { BaseModel } from '@adonisjs/lucid/orm'
import { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import logger from '@adonisjs/core/services/logger'

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
    logger.error('Error in applySorting: Invalid sort column provided. Valid columns:', sortEnum)
    throw new Error(`Invalid sort column. Valid columns are: ${sortEnum?.join(', ')}`)
  }

  if (invalidSortOrder) {
    logger.error('Error in applySorting: Invalid sort order provided')
    throw new Error("Invalid sort order. Valid orders are: 'asc', 'desc'")
  }

  return {
    status: invalidSortColumn,
    message: 'sorting query',
    query: appendQuery,
  }
}
