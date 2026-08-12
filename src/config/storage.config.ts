import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const schema = z
  .object({
    STORAGE_DRIVER: z.enum(['s3', 'r2', 'spaces', 'local']).default('local'),
    S3_ENDPOINT: z.url().optional(),
    S3_REGION: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    LOCAL_STORAGE_PATH: z.string().default('./uploads'),
  })
  .superRefine((environment, context) => {
    if (['s3', 'r2', 'spaces'].includes(environment.STORAGE_DRIVER)) {
      for (const key of [
        'S3_REGION',
        'S3_ACCESS_KEY_ID',
        'S3_SECRET_ACCESS_KEY',
        'S3_BUCKET',
      ] as const) {
        if (!environment[key]) {
          context.addIssue({
            code: 'custom',
            path: [key],
            message: `is required when STORAGE_DRIVER is ${environment.STORAGE_DRIVER}`,
          });
        }
      }
    }

    if (
      ['r2', 'spaces'].includes(environment.STORAGE_DRIVER) &&
      !environment.S3_ENDPOINT
    ) {
      context.addIssue({
        code: 'custom',
        path: ['S3_ENDPOINT'],
        message: `is required when STORAGE_DRIVER is ${environment.STORAGE_DRIVER}`,
      });
    }
  });

export const parseStorageConfig = (
  environment: NodeJS.ProcessEnv = process.env,
) => {
  const env = schema.parse(environment);

  return {
    driver: env.STORAGE_DRIVER,
    s3: {
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      bucket: env.S3_BUCKET,
    },
    local: { path: env.LOCAL_STORAGE_PATH },
  };
};

export default registerAs('storage', parseStorageConfig);
