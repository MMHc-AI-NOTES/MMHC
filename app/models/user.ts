import { DateTime } from 'luxon'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, beforeFetch, beforeFind, column } from '@adonisjs/lucid/orm'
import hash from '@adonisjs/core/services/hash'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { softDeleteQuery, softDeleteUser } from '#helpers/soft_delete_helper'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export const userFilterEnum = ['id', 'full_name', 'email', 'type', 'is_active', 'created_at']
export const userSortEnum = ['id', 'full_name', 'email', 'type', 'is_active', 'created_at']

export default class User extends compose(BaseModel, AuthFinder) {
  static table = 'users'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare fullName: string | null

  @column()
  declare email: string

  @column()
  declare pqId: string | null

  @column()
  declare type: number

  @column({
    serialize: (value) => {
      return Boolean(value)
    },
  })
  declare isActive: boolean

  @column({ serializeAs: null })
  declare password: string | null

  @column({
    serialize: (value) => {
      return Boolean(value)
    },
  })
  declare hasCompletedOnboarding: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime({ serializeAs: null })
  declare deletedAt: DateTime

  static accessTokens = DbAccessTokensProvider.forModel(User, {
    expiresIn: '30 days',
    prefix: 'oat_',
    table: 'auth_access_tokens',
    type: 'auth_token',
  })

  @beforeFind()
  public static softDeletesFind = softDeleteQuery

  @beforeFetch()
  public static softDeletesFetch = softDeleteQuery

  public async softDelete() {
    await softDeleteUser(this)
  }
}
