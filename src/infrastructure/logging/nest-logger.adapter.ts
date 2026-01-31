import type { LoggerPort } from '#src/core/ports/logger.port.js';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NestLoggerAdapter implements LoggerPort {
  private readonly logger: Logger;

  constructor(context: string) {
    this.logger = new Logger(context);
  }

  log(message: string, ...optionalParams: any[]): void {
    this.logger.log(message, ...optionalParams);
  }

  error(message: string, ...optionalParams: any[]): void {
    this.logger.error(message, ...optionalParams);
  }

  warn(message: string, ...optionalParams: any[]): void {
    this.logger.warn(message, ...optionalParams);
  }

  debug(message: string, ...optionalParams: any[]): void {
    this.logger.debug(message, ...optionalParams);
  }

  verbose(message: string, ...optionalParams: any[]): void {
    this.logger.verbose(message, ...optionalParams);
  }
}
