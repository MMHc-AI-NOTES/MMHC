export interface FiltersInterface {
  columnName: string
  type: 'exact' | 'like'
  value: string | number
  startDate?: string
  endDate?: string
}
