import { User } from '#src/modules/users/domain/entities/user.entity.js';

export class UserResponseMapper {
  static map(user: User) {
    return {
      id: user.id,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      locale: user.locale,
      roles: user.roles,
      permissions: user.permissions,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
