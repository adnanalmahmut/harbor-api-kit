import { ERROR_DEFINITIONS } from '#src/core/exceptions/error-definitions.js';
import { ValidationError } from '#src/core/exceptions/validation.exception.js';
import { normalizeFieldPath } from '#src/infrastructure/validation/validation.utils.js';
import { Injectable, type ArgumentMetadata } from '@nestjs/common';
import { ZodValidationException, ZodValidationPipe } from 'nestjs-zod';
import type { ZodError } from 'zod';

function isZodError(x: unknown): x is ZodError<unknown> {
  return (
    typeof x === 'object' &&
    x !== null &&
    'issues' in x &&
    Array.isArray((x as any).issues)
  );
}

@Injectable()
export class GlobalValidationPipe extends ZodValidationPipe {
  async transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      return await super.transform(value, metadata);
    } catch (err: unknown) {
      if (err instanceof ZodValidationException) {
        const z = err.getZodError();

        if (isZodError(z)) {
          const formattedIssues = z.issues.flatMap((issue) => {
            if (issue.code === 'unrecognized_keys' && 'keys' in issue) {
              const keys = (issue as any).keys as string[];
              return keys.map((k) => ({
                path: k,
                message: 'errors.validation.unrecognized_key',
              }));
            }

            return [
              {
                path: normalizeFieldPath(issue.path),
                message: issue.message,
              },
            ];
          });

          throw new ValidationError(
            ERROR_DEFINITIONS.VALIDATION_ERROR.messageKey,
            formattedIssues,
          );
        }

        throw new ValidationError(
          ERROR_DEFINITIONS.VALIDATION_ERROR.messageKey,
          [
            {
              path: '',
              message: ERROR_DEFINITIONS.VALIDATION_ERROR.messageKey,
            },
          ],
        );
      }

      throw err;
    }
  }
}
