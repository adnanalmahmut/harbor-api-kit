import { PrismaService } from '#src/infrastructure/db/prisma/prisma.service.js';
import type {
  CreateUserData,
  UserRepositoryPort,
} from '#src/modules/users/domain/ports/user.repository.port.js';
import { Injectable } from '@nestjs/common';
import { mapPrismaUserToEntity } from '../mappers/users.mapper.js';

@Injectable()
export class PrismaUsersRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const row = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        locale: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return row ? mapPrismaUserToEntity(row) : null;
  }

  async findByEmail(email: string) {
    const row = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        locale: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return row ? mapPrismaUserToEntity(row) : null;
  }

  async existsByEmail(email: string) {
    const count = await this.prisma.user.count({ where: { email } });
    return count > 0;
  }

  async create(data: CreateUserData) {
    const row = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        locale: data.locale,
      },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        locale: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return mapPrismaUserToEntity(row);
  }
}
