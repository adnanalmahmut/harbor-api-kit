import { DatabaseException } from '#src/infrastructure/db/exceptions/database.exception.js';
import { PrismaService } from '#src/infrastructure/db/prisma/prisma.service.js';
import { User } from '#src/modules/users/domain/entities/user.entity.js';
import type { UserRepositoryPort } from '#src/modules/users/domain/ports/user.repository.port.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private handleError(e: unknown): never {
    if (e instanceof DatabaseException) throw e;
    const msg = e instanceof Error ? e.message : 'Unknown database error';
    // P2002: Unique constraint failed
    if ((e as any)?.code === 'P2002') {
      throw DatabaseException.conflict(msg);
    }
    throw DatabaseException.unknown(msg);
  }

  async findAll(): Promise<User[] | null> {
    try {
      const records = await this.prisma.user.findMany({
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });
      return records ? records.map((record) => this.toDomain(record)) : null;
    } catch (e) {
      this.handleError(e);
    }
  }

  async create(user: User): Promise<User> {
    try {
      const created = await this.prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified,
          image: user.image,
          locale: user.locale,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });
      return this.toDomain(created);
    } catch (e) {
      this.handleError(e);
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const record = await this.prisma.user.findUnique({
        where: { id },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });
      return record ? this.toDomain(record) : null;
    } catch (e) {
      this.handleError(e);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const record = await this.prisma.user.findUnique({
        where: { email },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });
      return record ? this.toDomain(record) : null;
    } catch (e) {
      this.handleError(e);
    }
  }

  async update(user: User): Promise<User> {
    try {
      const updated = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
          locale: user.locale,
          updatedAt: new Date(),
        },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });
      return this.toDomain(updated);
    } catch (e) {
      this.handleError(e);
    }
  }

  private toDomain(record: any): User {
    // 1. Roles
    const roles = record.roles?.map((r: any) => r.role.slug) || [];

    // 2. Permissions: Repository should NOT calculate effective permissions.
    // Use EffectivePermissionsService in Application layer only.
    // We return an empty array here as 'User.permissions' is context-dependent.
    const effectivePermissions: string[] = [];

    return new User(
      record.id,
      record.name,
      record.firstName,
      record.lastName,
      record.email,
      record.emailVerified,
      record.image,
      record.locale,
      roles,
      effectivePermissions,
      record.createdAt,
      record.updatedAt,
    );
  }
}
