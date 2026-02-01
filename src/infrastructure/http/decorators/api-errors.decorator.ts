import {
  AppErrorCode,
  ERROR_DEFINITIONS,
} from '#src/core/exceptions/error-definitions.js';
import type { Type } from '@nestjs/common';
import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

export type ApiErrorType = keyof typeof AppErrorCode;

/**
 * API Error example for Swagger documentation
 */
export interface ApiErrorExample {
  status: number;
  code: AppErrorCode;
  message: string;
}

/**
 * API Success response example for Swagger documentation
 */
export interface ApiSuccessExample {
  status: number;
  message: string;
  dataExample?: Record<string, any>;
  type?: Type<any> | [Type<any>];
}

/**
 * Complete API response config including success and errors
 */
export interface ApiResponseConfig {
  success: ApiSuccessExample;
  errors: ApiErrorExample[];
}

/**
 * Creates an ApiErrorExample for use with @ApiResponses decorator
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
 * Creates an ApiSuccessExample for use with @ApiResponses decorator
 */
export function createApiSuccess(
  message: string,
  status: number = HttpStatus.OK,
  dataExample?: Record<string, any>,
  type?: Type<any> | [Type<any>],
): ApiSuccessExample {
  return {
    status,
    message,
    dataExample,
    type,
  };
}

/**
 * Creates a complete API response config with success and errors
 */
export function createApiResponseConfig(
  success: ApiSuccessExample,
  errors: ApiErrorExample[],
): ApiResponseConfig {
  return { success, errors };
}

/**
 * Decorator to document API responses (success + errors) in Swagger
 * Supports:
 * - Legacy format: ApiErrorType[] or ApiErrorExample[]
 * - New format: ApiResponseConfig with success and errors
 */
export function ApiResponses(
  config: (ApiErrorType | ApiErrorExample)[] | ApiResponseConfig,
) {
  const decorators: MethodDecorator[] = [];

  // Check if it's the new format (ApiResponseConfig)
  if ('success' in config && 'errors' in config) {
    // Add success response
    const successConfig = config.success;

    // Handle NO_CONTENT (204) and FOUND (302) differently - no body
    if (
      successConfig.status === HttpStatus.NO_CONTENT ||
      successConfig.status === HttpStatus.FOUND
    ) {
      decorators.push(
        ApiResponse({
          status: successConfig.status,
          description: successConfig.message || 'Redirect',
        }),
      );
    } else if (successConfig.type) {
      // Use DTO class for schema wrapped in standard envelope { message, data }
      const isArray = Array.isArray(successConfig.type);
      const dtoType = isArray
        ? (successConfig.type as [Type<any>])[0]
        : (successConfig.type as Type<any>);

      decorators.push(ApiExtraModels(dtoType));

      const dataSchema = isArray
        ? {
            type: 'array',
            items: { $ref: getSchemaPath(dtoType) },
          }
        : { $ref: getSchemaPath(dtoType) };

      decorators.push(
        ApiResponse({
          status: successConfig.status,
          description: 'Success',
          schema: {
            properties: {
              success: {
                type: 'boolean',
                example: true,
              },
              message: {
                type: 'string',
                example: successConfig.message || 'Success',
              },
              data: dataSchema,
            },
          },
        }),
      );
    } else {
      // Use manual example (Legacy/Simple)
      const successSchema: Record<string, any> = {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: successConfig.message,
        },
      };

      if (successConfig.dataExample) {
        successSchema.data = {
          type: 'object',
          example: successConfig.dataExample,
        };
      }

      decorators.push(
        ApiResponse({
          status: successConfig.status,
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
      );
    }

    // Process errors
    decorators.push(...buildErrorDecorators(config.errors));
  } else {
    // Legacy format - only errors
    decorators.push(
      ...buildErrorDecorators(config as (ApiErrorType | ApiErrorExample)[]),
    );
  }

  return applyDecorators(...decorators);
}

/**
 * Legacy decorator for backward compatibility
 * @deprecated Use ApiResponses with ApiResponseConfig instead
 */
export function ApiErrors(errors: (ApiErrorType | ApiErrorExample)[]) {
  return applyDecorators(...buildErrorDecorators(errors));
}

/**
 * Builds error response decorators from error array
 */
function buildErrorDecorators(
  errors: (ApiErrorType | ApiErrorExample)[],
): MethodDecorator[] {
  // Group errors by status code
  const errorsByStatus = new Map<number, { code: string; message: string }[]>();

  for (const error of errors) {
    let status: number;
    let code: string;
    let message: string;

    if (typeof error === 'string') {
      // Legacy format: 'UNAUTHORIZED' or AppErrorCode.UNAUTHORIZED
      const errorCode = AppErrorCode[error as ApiErrorType];
      const errorDef = ERROR_DEFINITIONS[errorCode];
      status = errorDef.status;
      code = error;
      message = errorDef.messageKey;
    } else {
      // New format: { status, code, message }
      status = error.status;
      code = error.code;
      message = error.message;
    }

    if (!errorsByStatus.has(status)) {
      errorsByStatus.set(status, []);
    }
    errorsByStatus.get(status)!.push({ code, message });
  }

  return Array.from(errorsByStatus.entries()).map(
    ([status, errorsForStatus]) => {
      const schemaProperties: Record<string, any> = {
        success: {
          type: 'boolean',
          example: false,
        },
        message: {
          type: 'string',
          example: errorsForStatus[0].message,
        },
      };

      // Check if any error is a validation error
      const hasValidationError = errorsForStatus.some(
        (e) => e.code === 'VALIDATION_ERROR',
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

      // Build description from all error codes for this status
      const description = errorsForStatus.map((e) => e.code).join(' | ');

      return ApiResponse({
        status,
        description,
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
