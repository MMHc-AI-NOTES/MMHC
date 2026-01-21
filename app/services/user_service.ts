import User, { userFilterEnum, userSortEnum } from '#models/user'
import {
  createUserValidatorInterface,
  updateUserValidatorInterface,
  completeOnboardingValidatorInterface,
} from '#validators/user_validator'
import { applySorting } from '#services/apply_sorting'
import { paginateQuery } from '#services/apply_pagination'
import { applyFilters } from '#services/apply_filter'
import { UserTypeEnum } from '#enums/user_type_enum'
import { sendUserInviteEmail } from '#services/email_service'
import { Secret } from '@adonisjs/core/helpers'
import { frontendRoutesConfig, getFrontendLink } from '#services/frontend_routes_service'

export const createUser = async (
  payload: createUserValidatorInterface,
  currentUserType?: number
) => {
  try {
    const userData: any = {
      fullName: payload.full_name || null,
      email: payload.email,
      isActive: payload.is_active !== undefined ? payload.is_active : true,
      type: payload.type || UserTypeEnum.user,
      password: null,
    }

    // Only set password if provided and current user is not superAdmin
    if (payload.password && currentUserType !== UserTypeEnum.superAdmin) {
      userData.password = payload.password
    }

    const user = await User.create(userData)

    // If superAdmin created the user, generate access token and send onboarding email
    if (currentUserType === UserTypeEnum.superAdmin) {
      const token = await User.accessTokens.create(user, ['*'])
      const tokenValue = token.value!.release()
      const invitationLink = getFrontendLink(frontendRoutesConfig.userOnboardingLink, tokenValue)
      await sendUserInviteEmail(user.email, invitationLink)
    }

    return user
  } catch (error: any) {
    console.log('Error in createUser:', error.message)
    throw new Error('Failed to create user. Please try again later.')
  }
}

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

    // Separate search and user filters
    let searchFilter: any = null
    let userFilters: Array<any> = []

    if (filters?.length) {
      filters.forEach((filter) => {
        if (filter.columnName === 'search') {
          searchFilter = filter
        } else {
          userFilters.push(filter)
        }
      })
    }

    // Start with base query
    let userListings: any = User.query()

    // Apply search filter (email and full_name)
    if (searchFilter && searchFilter.value) {
      const searchValue = String(searchFilter.value).trim()
      if (searchValue) {
        const searchPattern = `%${searchValue}%`

        userListings = userListings.where((subQuery: any) => {
          subQuery
            .whereILike('users.email', searchPattern)
            .orWhereILike('users.full_name', searchPattern)
        })
      }
    }

    // Apply user filters
    if (userFilters?.length) {
      filterData = applyFilters(userListings, userFilters, userFilterEnum)
      if (filterData?.status === false) {
        return {
          status: filterData.status,
          message: filterData.message,
        }
      }
      userListings = filterData?.query ?? userListings
    }

    query = userListings
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
      throw new Error(`User with id ${userId} does not exist`)
    }
    return userResponse
  } catch (error: any) {
    console.log('Error in getUserById:', error.message)
    throw new Error('Failed to get user. Please try again later.')
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
    throw new Error('Failed to update user. Please try again later.')
  }
}

export const completeUserOnboarding = async (payload: completeOnboardingValidatorInterface) => {
  try {
    const { token, ...updateData } = payload

    // Verify token using User access token provider
    const accessToken = await User.accessTokens.verify(new Secret(token))

    if (!accessToken) {
      throw new Error('Invalid or expired onboarding token')
    }

    const user = await User.find(accessToken.tokenableId)

    if (!user) {
      throw new Error('User not found for this token')
    }

    if (user.hasCompletedOnboarding) {
      throw new Error('Onboarding already completed')
    }

    // Store original email before update
    const originalEmail = user.email

    // If email is being changed during onboarding and does not match invited email, throw error
    if (updateData.email && updateData.email !== originalEmail) {
      throw new Error('Email does not match the invited email')
    }

    // Update user info and mark onboarding as complete
    user.merge({
      ...updateData,
      hasCompletedOnboarding: true,
    })
    await user.save()

    // Delete the access token after successful onboarding
    await User.accessTokens.delete(user, accessToken.identifier)

    return user
  } catch (error: any) {
    console.log('Error in completeUserOnboarding:', error.message)
    throw new Error('Failed to complete onboarding. Please try again later.')
  }
}

export const resendUserOnboardingEmail = async (userId: number) => {
  try {
    const user = await getUserById(userId)

    if (!user.email) {
      throw new Error('User email is missing')
    }

    // Generate new access token
    const token = await User.accessTokens.create(user, ['*'])

    // Reset onboarding flag
    user.merge({
      hasCompletedOnboarding: false,
    })

    await user.save()

    const tokenValue = token.value!.release()
    const invitationLink = getFrontendLink(frontendRoutesConfig.userOnboardingLink, tokenValue)
    await sendUserInviteEmail(user.email, invitationLink)

    return true
  } catch (error: any) {
    console.log('Error in resendUserOnboardingEmail:', error.message)
    throw new Error('Failed to resend onboarding email. Please try again later.')
  }
}
