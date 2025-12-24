import User, { userFilterEnum, userSortEnum } from '#models/user'
import {
  createUserValidatorInterface,
  updateUserValidatorInterface,
} from '#validators/user_validator'
import { applySorting } from '#services/apply_sorting'
import { paginateQuery } from '#services/apply_pagination'
import { applyFilters } from '#services/apply_filter'

export const userListing = async (
  page?: number,
  pageSize?: number,
  filters?: Array<any>,
  sorts?: Array<any>
) => {
  try {
    let query: any
    let filterData: any
    let sortUser: any
    let userListings: any = User.query()

    if (filters?.length) {
      filterData = applyFilters(userListings, filters, userFilterEnum)
    }
    if (filterData?.status === false) {
      return {
        status: filterData.status,
        message: filterData.message,
      }
    }
    query = filterData?.query ?? userListings
    if (!sorts?.length) {
      query = query.orderBy('id', 'desc')
    }
    if (sorts?.length) {
      sortUser = applySorting(query, sorts, userSortEnum)
      if (sortUser?.status) {
        return sortUser
      }
    }
    let sortQuery = sortUser?.query ?? query
    let userListingPaginated = await paginateQuery(sortQuery, pageSize, page)
    return {
      count: userListingPaginated['rows'].length,
      total_count: userListingPaginated.total,
      total_page_count: userListingPaginated.lastPage,
      page: userListingPaginated.currentPage,
      page_size: userListingPaginated.perPage,
      data: userListingPaginated['rows'].map((user: any) => ({
        ...user.serialize(),
      })),
    }
  } catch (error: any) {
    console.log('Error in userListing:', error.message)
    throw new Error('Failed to retrieve users. Please try again later.')
  }
}

export const getUserById = async (userId: number) => {
  try {
    const userResponse = await User.query().where('id', userId).first()

    if (!userResponse) {
      console.log('Error in getUserById: User not found with id:', userId)
      throw new Error('User not found')
    }
    return userResponse
  } catch (error: any) {
    console.log('Error in getUserById:', error.message)
    throw new Error('Failed to get users by id. Please try again later.')
  }
}

export const deleteUser = async (user_id: number) => {
  try {
    const user = await getUserById(user_id)

    return await user.softDelete()
  } catch (error: any) {
    console.log('Error in deleteUser:', error.message)
    throw new Error('Failed to delete user. Please try again later.')
  }
}

export const updateUser = async (payload: updateUserValidatorInterface, userId: number) => {
  try {
    const user = await getUserById(userId)
    return await user.merge(payload).save()
  } catch (error: any) {
    console.log('Error in updateUser:', error.message)
    throw new Error('Failed to udpate user. Please try again later.')
  }
}

export const createUser = async (payload: createUserValidatorInterface) => {
  try {
    return await User.create(payload)
  } catch (error: any) {
    console.log('Error in createUser:', error.message)
    throw new Error('Failed to create user. Please try again later.')
  }
}
