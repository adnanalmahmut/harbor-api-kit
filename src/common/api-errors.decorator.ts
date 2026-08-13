import { applyDecorators, HttpStatus, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { AppErrorCode, ERROR_DEFINITIONS } from './app-exception.js';

/** One documented error row: the status, the code and the example message. */
export interface ApiErrorExample {
  status: number;
  code: AppErrorCode;
  message: string;
}

/** The success half of an endpoint's documented contract. */
export interface ApiSuccessExample {
  status: number;
  message: string;
  type?: Type<any> | [Type<any>];
}

export interface ApiResponseConfig {
  success: ApiSuccessExample;
  errors: ApiErrorExample[];
}

/**
 * The one factory worth keeping: it derives the HTTP status from the error
 * code, so a call site names the code and the message and nothing else. The
 * success half is written as a plain object — there is nothing to derive.
 */
export function createApiError(
  code: AppErrorCode,
  message: string,
): ApiErrorExample {
  return {
    status: ERROR_DEFINITIONS[code].status,
    code,
    message,
  };
}

/**
 * Documents an endpoint's success and error responses, both wrapped in the
 * standard `{ success, message, data }` envelope the response interceptor
 * produces.
 */
export function ApiResponses(config: ApiResponseConfig) {
  return applyDecorators(
    ...buildSuccessDecorators(config.success),
    ...buildErrorDecorators(config.errors),
  );
}

function buildSuccessDecorators(success: ApiSuccessExample): MethodDecorator[] {
  // NO_CONTENT (204) and FOUND (302) carry no body.
  if (
    success.status === (HttpStatus.NO_CONTENT as number) ||
    success.status === (HttpStatus.FOUND as number)
  ) {
    return [
      ApiResponse({
        status: success.status,
        description: success.message || 'Redirect',
      }),
    ];
  }

  if (success.type) {
    const isArray = Array.isArray(success.type);
    const dtoType = isArray
      ? (success.type as [Type<any>])[0]
      : (success.type as Type<any>);

    const dataSchema = isArray
      ? { type: 'array', items: { $ref: getSchemaPath(dtoType) } }
      : { $ref: getSchemaPath(dtoType) };

    return [
      ApiExtraModels(dtoType),
      ApiResponse({
        status: success.status,
        description: 'Success',
        schema: {
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: success.message || 'Success' },
            data: dataSchema,
          },
        },
      }),
    ];
  }

  const successSchema: Record<string, any> = {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: success.message },
  };

  return [
    ApiResponse({
      status: success.status,
      description: 'Success',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: successSchema,
            required: ['message'],
          },
        },
      },
    }),
  ];
}

/** One `@ApiResponse` per status code, listing every error that maps to it. */
function buildErrorDecorators(errors: ApiErrorExample[]): MethodDecorator[] {
  const errorsByStatus = new Map<number, ApiErrorExample[]>();

  for (const error of errors) {
    const forStatus = errorsByStatus.get(error.status) ?? [];
    forStatus.push(error);
    errorsByStatus.set(error.status, forStatus);
  }

  return Array.from(errorsByStatus.entries()).map(
    ([status, errorsForStatus]) => {
      const schemaProperties: Record<string, any> = {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: errorsForStatus[0].message },
      };

      const hasValidationError = errorsForStatus.some(
        (e) => e.code === AppErrorCode.VALIDATION_ERROR,
      );

      if (hasValidationError) {
        schemaProperties.errors = {
          type: 'array',
          items: {
            type: 'object',
            required: ['path', 'message'],
            properties: {
              path: { type: 'string', example: 'email' },
              message: { type: 'string', example: 'Invalid email format' },
            },
          },
        };
      }

      return ApiResponse({
        status,
        description: errorsForStatus.map((e) => e.code).join(' | '),
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: schemaProperties,
              required: ['message', ...(hasValidationError ? ['errors'] : [])],
            },
          },
        },
      });
    },
  );
}
