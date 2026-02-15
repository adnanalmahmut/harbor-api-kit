import { PrismaPg } from '@prisma/adapter-pg';
import * as PrismaClientPackage from '@prisma/client';

type PrismaClientConstructor = new (options: { adapter: PrismaPg }) => unknown;

export function createPrismaClient(databaseUrl: string) {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const PrismaClient = (
    PrismaClientPackage as unknown as { PrismaClient: PrismaClientConstructor }
  ).PrismaClient;
  return new PrismaClient({ adapter });
}
