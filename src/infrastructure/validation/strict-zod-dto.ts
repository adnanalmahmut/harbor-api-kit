import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

type AnySchema = z.ZodType<any, any, any>;

function isZodObject(schema: AnySchema): schema is z.ZodObject<any, any> {
  return schema instanceof (z as any).ZodObject;
}

export function createStrictZodDto<TSchema extends AnySchema>(schema: TSchema) {
  const strictSchema = isZodObject(schema)
    ? ((schema as any).strict() as unknown as TSchema)
    : schema;

  const BaseDto = createZodDto(strictSchema as any);

  class StrictZodDto extends BaseDto {
    static override readonly isZodDto = true;
    static override readonly schema = (BaseDto as any).schema;
  }

  return StrictZodDto as typeof BaseDto;
}
