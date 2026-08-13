import { jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { CacheHealthPort, DbHealthPort } from './health.ports.js';
import { HealthService } from './health.service.js';

/**
 * The standard mocking seam: override the abstract port, never the database
 * client. A test written this way survives a change of ORM untouched.
 */
describe('HealthService', () => {
  const db = { ping: jest.fn<() => Promise<void>>() };
  const cache = { ping: jest.fn<() => Promise<void>>() };
  let service: HealthService;

  beforeEach(async () => {
    db.ping.mockReset().mockResolvedValue(undefined);
    cache.ping.mockReset().mockResolvedValue(undefined);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: DbHealthPort, useValue: db },
        { provide: CacheHealthPort, useValue: cache },
      ],
    }).compile();

    service = moduleRef.get(HealthService);
  });

  it('reports ok when both dependencies answer', async () => {
    const report = await service.check();

    expect(report.status).toBe('ok');
    expect(db.ping).toHaveBeenCalledTimes(1);
    expect(cache.ping).toHaveBeenCalledTimes(1);
  });

  it('propagates a database failure', async () => {
    db.ping.mockRejectedValue(new Error('connection refused'));

    await expect(service.check()).rejects.toThrow('connection refused');
    expect(cache.ping).not.toHaveBeenCalled();
  });
});
