import User from '#models/user'
import { BaseModel } from '@adonisjs/lucid/orm'
import { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { DateTime } from 'luxon'
import { cuid } from '@adonisjs/core/helpers'

export const softDeleteQuery = (query: ModelQueryBuilderContract<typeof BaseModel>) => {
  query.whereNull(`${query.model.table}.deleted_at`)
}

export const softDeleteUser = async (row: User) => {
  const rand = cuid()
  const deleteEmail = row['email']
  if (row.deletedAt === null) {
    row.deletedAt = DateTime.now()
    row['email'] = deleteEmail.concat('_', rand)
  }
  await row.save()
}
