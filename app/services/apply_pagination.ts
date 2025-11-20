export const paginateQuery = async (query: any, page_size?: number, page?: number) => {
  page_size = page_size ?? 100
  page = page ?? 1
  return query.paginate(page, page_size)
}
