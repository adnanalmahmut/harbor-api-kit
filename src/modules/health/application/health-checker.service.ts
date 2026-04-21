import type { CacheHealthPort, DbHealthPort } from '../domain/index.js';

export interface HealthReport {
  status: 'ok';
  uptime: number;
  timestamp: string;
}

export class HealthCheckerService {
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
