import { FiltersInterface } from '#interfaces/filters_interface'
import { BaseModel } from '@adonisjs/lucid/orm'
import { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import moment from 'moment'

export const applyFilters = (
  query: ModelQueryBuilderContract<typeof BaseModel>,
  filters: Array<FiltersInterface>,
  filterEnum?: Array<string>
) => {
  let appendQuery = query
  let invalidFilter: boolean = false
  let invalidFilterType: boolean = false

  filters.forEach((filter: FiltersInterface) => {
    if (!filterEnum?.includes(filter.columnName)) {
      invalidFilter = true
      return
    }

    // Skip 'search' filter as it's handled separately
    if (filter.columnName === 'search') {
      return
    }

    if (filter.type === 'exact') {
      if (filter.columnName === 'created_at') {
        let startDate: any
        let endDate: any

        if (!filter.startDate || !filter.endDate) {
          invalidFilter = true
        } else {
          startDate = moment(filter.startDate).startOf('day').format('YYYY-MM-DD HH:mm:ss')
          endDate = moment(filter.endDate).endOf('day').format('YYYY-MM-DD HH:mm:ss')
        }
        appendQuery = appendQuery.andWhereBetween(`${query.model.table}.${filter.columnName}`, [
          startDate,
          endDate,
        ])
      } else {
        appendQuery = appendQuery.andWhere(
          `${query.model.table}.${filter.columnName}`,
          `${filter.value}`
        )
      }
    } else if (filter.type === 'like') {
      appendQuery = appendQuery.andWhereILike(
        `${query.model.table}.${filter.columnName}`,
        `%${filter.value}%`
      )
    } else {
      invalidFilterType = true
      return
    }
  })

  if (invalidFilterType) {
    throw new Error(`List valid filter type is [exact, like]`)
  }

  if (invalidFilter) {
    throw new Error(`List of valid filters is [${filterEnum}]`)
  }

  return {
    status: true,
    message: 'Filtered query',
    query: appendQuery,
  }
}
