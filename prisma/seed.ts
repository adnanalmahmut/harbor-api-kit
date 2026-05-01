import { runBootstrapRbacCli } from './bootstrap-rbac.js';

runBootstrapRbacCli().catch((error) => {
  console.error('Prisma seed failed:', error);
  process.exit(1);
});
