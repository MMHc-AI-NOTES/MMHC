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
  }
}
