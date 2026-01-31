import { createStrictZodDto } from '#src/infrastructure/validation/strict-zod-dto.js';
import { CreateRoleSchema } from '#src/modules/rbac/application/use-cases/create-role.use-case.js';

export class CreateRoleDto extends createStrictZodDto(CreateRoleSchema) {}
