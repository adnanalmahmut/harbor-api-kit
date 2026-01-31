import { createStrictZodDto } from '#src/infrastructure/validation/strict-zod-dto.js';
import { AddRoleToUserSchema } from '#src/modules/users/application/use-cases/add-role-to-user.use-case.js';

export class AddRoleToUserDto extends createStrictZodDto(AddRoleToUserSchema) {}
