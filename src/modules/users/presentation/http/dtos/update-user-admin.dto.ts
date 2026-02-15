import { createStrictZodDto } from '#src/core/presentation/http/validation/strict-zod-dto.js';
import { AdminUpdateUserSchema } from '#src/modules/users/application/use-cases/update-user-by-id.use-case.js';

export class UpdateUserAdminDto extends createStrictZodDto(
  AdminUpdateUserSchema,
) {}
