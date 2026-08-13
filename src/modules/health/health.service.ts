import { Injectable } from '@nestjs/common';
import { CacheHealthPort, DbHealthPort } from './health.ports.js';

export interface HealthReport {
  status: 'ok';
  uptime: number;
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly db: DbHealthPort,
    private readonly cache: CacheHealthPort,
  ) {}

  async check(): Promise<HealthReport> {
    await this.db.ping();
    await this.cache.ping();

    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
