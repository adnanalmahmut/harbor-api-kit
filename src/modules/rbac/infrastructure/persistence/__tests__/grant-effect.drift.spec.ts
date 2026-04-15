import {
  Prisma,
  GrantEffect as PrismaGrantEffect,
} from '#src/generated/prisma/client.js';
import { GrantEffect as DomainGrantEffect } from '../../../domain/entities/user-permission.entity.js';

type StringEnumLike = Record<string, string>;

function asStringEnumLike(value: unknown, name: string): StringEnumLike {
  if (!value || typeof value !== 'object') {
    throw new Error(`[drift] ${name} is not an object`);
  }

  const obj = value as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof k !== 'string' || typeof v !== 'string') {
      throw new Error(`[drift] ${name} must be Record<string, string>`);
    }
  }
  return obj as StringEnumLike;
}

function sorted(arr: readonly string[]) {
  return [...arr].sort();
}

describe('RBAC - GrantEffect drift detection', () => {
  it('Domain GrantEffect values must match Prisma GrantEffect enum values', () => {
    const domainEnum = asStringEnumLike(DomainGrantEffect, 'DomainGrantEffect');

    const prismaEnumRaw =
      (PrismaGrantEffect as unknown) ??
      ((Prisma as any).$Enums?.GrantEffect as unknown);

    const prismaEnum = asStringEnumLike(prismaEnumRaw, 'PrismaGrantEffect');

    const domainValues = sorted(Object.values(domainEnum));
    const prismaValues = sorted(Object.values(prismaEnum));

    expect(domainValues).toEqual(prismaValues);
  });

  it('Domain GrantEffect keys must match Prisma GrantEffect enum keys', () => {
    const domainEnum = asStringEnumLike(DomainGrantEffect, 'DomainGrantEffect');

    const prismaEnumRaw =
      (PrismaGrantEffect as unknown) ??
      ((Prisma as any).$Enums?.GrantEffect as unknown);

    const prismaEnum = asStringEnumLike(prismaEnumRaw, 'PrismaGrantEffect');

    const domainKeys = sorted(Object.keys(domainEnum));
    const prismaKeys = sorted(Object.keys(prismaEnum));

    expect(domainKeys).toEqual(prismaKeys);
  });
});
