// src/core/validation/strict-zod-dto.ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

type AnySchema = z.ZodType<unknown, unknown, any>;

function isZodObject(schema: AnySchema): schema is z.ZodObject<any, any> {
  return schema instanceof (z as any).ZodObject;
}

/**
 * Enforces "forbid unknown keys" for all DTO schemas created in this codebase.
 * Zod v4 typing surface + nestjs-zod DTO wrapper requires a small, localized cast here.
 *
 * Rationale:
 * - We want enterprise-grade request hardening early (Phase 2).
 * - Avoid silent payload acceptance (unknown keys) across all DTOs by default.
 *
 * Covered by unit test:
 * - src/core/validation/__tests__/strict-zod-dto.spec.ts
 */
export function createStrictZodDto<TSchema extends AnySchema>(schema: TSchema) {
  const strictSchema = isZodObject(schema)
    ? ((schema as any).strict() as unknown as TSchema)
    : schema;

  return createZodDto(strictSchema as any);
}
