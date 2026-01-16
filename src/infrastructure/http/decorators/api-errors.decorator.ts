import {
  AppErrorCode,
  ERROR_DEFINITIONS,
} from '#src/core/exceptions/error-definitions.js';
import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

export type ApiErrorType = keyof typeof AppErrorCode;

export function ApiErrors(errors: ApiErrorType[]) {
  const decorators = errors.map((errorType) => {
    const errorCode = AppErrorCode[errorType];
    const errorDef = ERROR_DEFINITIONS[errorCode];

    const schemaProperties: any = {
      message: {
        type: 'string',
        example: errorDef.messageKey,
      },
    };

    if (errorType === 'VALIDATION_ERROR') {
      schemaProperties.errors = {
        type: 'array',
        items: {
          type: 'object',
          required: ['path', 'message'],
          properties: {
            path: { type: 'string', example: 'field' },
            message: {
              type: 'string',
              example: 'errors.validation.field.invalid',
            },
          },
        },
      };
    }

    return ApiResponse({
      status: errorDef.status,
      description: errorType.replace(/_/g, ' '),
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: schemaProperties,
            required: [
              'message',
              ...(errorType === 'VALIDATION_ERROR' ? ['errors'] : []),
            ],
          },
        },
      },
    });
  });

  return applyDecorators(...decorators);
}
