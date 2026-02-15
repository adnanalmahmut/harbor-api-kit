// MUST set APP_ENV before any imports to ensure test environment
process.env.APP_ENV = 'test';

import * as dotenv from 'dotenv';
import * as path from 'path';

// Force load .env.test
dotenv.config({
  path: path.resolve(process.cwd(), '.env.test'),
  override: true,
});

// Explicitly set NODE_ENV to test if not already
process.env.NODE_ENV = 'test';
