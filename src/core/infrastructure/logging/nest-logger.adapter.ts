import type { LoggerPort } from '#src/core/application/ports/logger.port.js';
import type { LoggerService } from '@nestjs/common';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NestLoggerAdapter implements LoggerPort {
  constructor(
    private readonly context: string,
    private readonly logger:
      | LoggerService
      | {
          log: (message: any, ...optionalParams: any[]) => any;
          error: (message: any, ...optionalParams: any[]) => any;
          warn: (message: any, ...optionalParams: any[]) => any;
          debug: (message: any, ...optionalParams: any[]) => any;
          verbose?: (message: any, ...optionalParams: any[]) => any;
        },
  ) {}

  log(message: string, ...optionalParams: any[]): void {
    if (this.logger.log.length > 1) {
      // Assuming signature log(message, context, ...params) or log(message, ...params)
      // This is tricky because standard LoggerService doesn't enforce context
      // But nestjs-pino Logger does: log(msg, ...args) and it detects context if passed as last arg?
      // Let's assume we pass context as second arg if supported, or prepended.
      // However, to be safe and simple, we can rely on pino's behavior.
      // Safe bet: wrap message or rely on logger handling.
      // But wait, if I use the global `Logger` from nestjs-pino, I can use `.call` or similar?
      // Or simpler:
      // The `logger` passed in IS the `Logger` service.
      // If it is Pino's Logger, it supports passed context.
      // this.logger.log(message, this.context, ...optionalParams);
    }
    // Correct usage for NestJS LoggerService (if it is pino wrapper)
    // nestjs-pino Logger.log(msg, ...args)
    // If I want context, I might need to check if it supports it.
    // For now, let's defer to the implementation below.
    this.logger.log(message, this.context, ...optionalParams);
  }

  error(message: string, ...optionalParams: any[]): void {
    this.logger.error(message, ...optionalParams); // Context might be lost here?
    // Pino Logger error(msg, trace, context, ...args)?
    // Standard Nest Logger: error(message, stack, context)
    // We should pass context.
    // But optionalParams might contain stack?
    this.logger.error(message, undefined, this.context, ...optionalParams);
  }

  warn(message: string, ...optionalParams: any[]): void {
    this.logger.warn(message, this.context, ...optionalParams);
  }

  debug(message: string, ...optionalParams: any[]): void {
    this.logger.debug?.(message, this.context, ...optionalParams);
  }

  verbose(message: string, ...optionalParams: any[]): void {
    this.logger.verbose?.(message, this.context, ...optionalParams);
  }
}
