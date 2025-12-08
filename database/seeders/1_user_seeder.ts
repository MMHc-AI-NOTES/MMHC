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

    await User.updateOrCreate(
      { id: 5 },
      {
        id: 5,
        email: 'practitioner4@experts.com',
        password: 'Abc@1234',
        fullName: 'Alexis Weddle',
        type: UserTypeEnum.practitioner,
        isActive: true,
      }
    )

    await User.updateOrCreate(
      { id: 6 },
      {
        id: 6,
        email: 'practitioner5@experts.com',
        password: 'Abc@1234',
        fullName: 'Alyssa Jenkins',
        type: UserTypeEnum.practitioner,
        isActive: true,
      }
    )

    await User.updateOrCreate(
      { id: 7 },
      {
        id: 7,
        email: 'practitioner6@experts.com',
        password: 'Abc@1234',
        fullName: 'Andrea Singh',
        type: UserTypeEnum.practitioner,
        isActive: true,
      }
    )

    await User.updateOrCreate(
      { id: 8 },
      {
        id: 8,
        email: 'practitioner7@experts.com',
        password: 'Abc@1234',
        fullName: 'Alexis Lyons',
        type: UserTypeEnum.practitioner,
        isActive: true,
      }
    )

    await User.updateOrCreate(
      { id: 9 },
      {
        id: 9,
        email: 'practitioner8@experts.com',
        password: 'Abc@1234',
        fullName: 'Chantal Amoussou',
        type: UserTypeEnum.practitioner,
        isActive: true,
      }
    )
  }
}
