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
      { email: 'system@experts.com' },
      {
        email: 'system@experts.com',
        password: 'Abc@1234',
        fullName: 'System Administrator',
        type: UserTypeEnum.system,
        isActive: true,
      }
    )

    // await User.updateOrCreate(
    //   { id: 3 },
    //   {
    //     id: 3,
    //     email: 'themustafadeveloper+2@experts.com',
    //     password: 'Abc@1234',
    //     fullName: 'Alexandra Tesnakis',
    //     type: UserTypeEnum.practitioner,
    //     isActive: true,
    //   }
    // )

    // await User.updateOrCreate(
    //   { id: 4 },
    //   {
    //     id: 4,
    //     email: 'themustafadeveloper+3@experts.com',
    //     password: 'Abc@1234',
    //     fullName: 'Carol Black',
    //     type: UserTypeEnum.practitioner,
    //     isActive: true,
    //   }
    // )

    // await User.updateOrCreate(
    //   { id: 5 },
    //   {
    //     id: 5,
    //     email: 'themustafadeveloper+4@experts.com',
    //     password: 'Abc@1234',
    //     fullName: 'Alexis Weddle',
    //     type: UserTypeEnum.practitioner,
    //     isActive: true,
    //   }
    // )

    // await User.updateOrCreate(
    //   { id: 6 },
    //   {
    //     id: 6,
    //     email: 'themustafadeveloper+5@experts.com',
    //     password: 'Abc@1234',
    //     fullName: 'Alyssa Jenkins',
    //     type: UserTypeEnum.practitioner,
    //     isActive: true,
    //   }
    // )

    // await User.updateOrCreate(
    //   { id: 7 },
    //   {
    //     id: 7,
    //     email: 'themustafadeveloper+6@experts.com',
    //     password: 'Abc@1234',
    //     fullName: 'Andrea Singh',
    //     type: UserTypeEnum.practitioner,
    //     isActive: true,
    //   }
    // )

    // await User.updateOrCreate(
    //   { id: 8 },
    //   {
    //     id: 8,
    //     email: 'themustafadeveloper+7@experts.com',
    //     password: 'Abc@1234',
    //     fullName: 'Alexis Lyons',
    //     type: UserTypeEnum.practitioner,
    //     isActive: true,
    //   }
    // )

    // await User.updateOrCreate(
    //   { id: 9 },
    //   {
    //     id: 9,
    //     email: 'themustafadeveloper+8@experts.com',
    //     password: 'Abc@1234',
    //     fullName: 'Chantal Amoussou',
    //     type: UserTypeEnum.practitioner,
    //     isActive: true,
    //   }
    // )
  }
}
