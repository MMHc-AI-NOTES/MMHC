import { UserTypeEnum } from '#enums/user_type_enum'
import User from '#models/user'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class UserSeeder extends BaseSeeder {
  public async run() {
    await User.updateOrCreate(
      { id: 1 }, // Condition to find an existing user
      {
        id: 1,
        email: 'admin@experts.com',
        password: 'Abc@1234',
        fullName: 'Super Admin',
        type: UserTypeEnum.superAdmin,
        isActive: true,
      }
    )

    await User.updateOrCreate(
      { id: 2 },
      {
        id: 2,
        email: 'practitioner1@experts.com',
        password: 'Abc@1234',
        fullName: 'Raquel Castello',
        type: UserTypeEnum.practitioner,
        isActive: true,
      }
    )

    await User.updateOrCreate(
      { id: 3 },
      {
        id: 3,
        email: 'practitioner2@experts.com',
        password: 'Abc@1234',
        fullName: 'Alexandra Tesnakis',
        type: UserTypeEnum.practitioner,
        isActive: true,
      }
    )

    await User.updateOrCreate(
      { id: 4 },
      {
        id: 4,
        email: 'practitioner3@experts.com',
        password: 'Abc@1234',
        fullName: 'Carol Black',
        type: UserTypeEnum.practitioner,
        isActive: true,
      }
    )
  }
}
