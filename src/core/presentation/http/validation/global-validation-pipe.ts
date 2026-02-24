import { ERROR_DEFINITIONS, ValidationError } from '#src/core/domain/index.js';
import { Injectable, type ArgumentMetadata } from '@nestjs/common';
import { ZodValidationException, ZodValidationPipe } from 'nestjs-zod';
import type { ZodError } from 'zod';
import { normalizeFieldPath } from '../utils/i18n.utils.js';

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
                message: 'validation.mixed.unrecognized_key',
              }));
            }

            let messageKey = `validation.${issue.code}`;

            const issueData = issue as any;

            if (issueData.code === 'invalid_string') {
              if (typeof issueData.validation === 'string') {
                messageKey = `validation.string.${issueData.validation}`;
              }
            } else if (issue.code === 'too_small' || issue.code === 'too_big') {
              messageKey = `validation.${issueData.type}.${issue.code}`;
            }

            // If the message is already an i18n key (contains a dot), use it
            const finalMessage = issue.message.includes('.')
              ? issue.message
              : messageKey;

            return [
              {
                path: normalizeFieldPath(issue.path),
                message: finalMessage,
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
