/** Rows returned when a caller gives no page size and the list is a page of results. */
export const DEFAULT_PAGE_SIZE = 100

/**
 * Rows returned when a caller gives no page size and the list is configuration
 * the client needs in full. High enough that it is never reached in practice,
 * and paginate still bounds the query.
 */
export const CONFIG_PAGE_SIZE = 10000

export const paginateQuery = async (query: any, page_size?: number, page?: number) => {
  page_size = page_size ?? DEFAULT_PAGE_SIZE
  page = page ?? 1
  return query.paginate(page, page_size)
}

/**
 * Pagination for lists the client has to hold in full, such as the sections a
 * finding can attach to and their templates. A missing page size returns
 * everything rather than the first hundred rows.
 *
 * The frontend was sending page_size where the validator reads pageSize. The
 * key was dropped, the default applied, and the list was truncated at a hundred
 * with no error anywhere, so sections past that simply did not exist as far as
 * the browser was concerned. Defaulting to the full set means a caller that
 * gets the key wrong still receives correct data.
 */
export const paginateConfigQuery = async (query: any, page_size?: number, page?: number) => {
  return paginateQuery(query, page_size ?? CONFIG_PAGE_SIZE, page)
}
