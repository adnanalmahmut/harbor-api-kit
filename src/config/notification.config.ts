import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const schema = z.object({
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.email(),
  RESEND_FROM_NAME: z.string().trim().min(1),
  NOTIFY_EMAIL_RETRY_ATTEMPTS: z.coerce.number().int().min(0).default(5),
  NOTIFY_EMAIL_RETRY_DELAY_MS: z.coerce.number().int().min(0).default(5000),
});

export const parseNotificationConfig = (
  environment: NodeJS.ProcessEnv = process.env,
) => {
  const env = schema.parse(environment);

  return {
    email: {
      from: { email: env.RESEND_FROM_EMAIL, name: env.RESEND_FROM_NAME },
      resend: { apiKey: env.RESEND_API_KEY },
      retryAttempts: env.NOTIFY_EMAIL_RETRY_ATTEMPTS,
      retryDelayMs: env.NOTIFY_EMAIL_RETRY_DELAY_MS,
    },
  };
};

export default registerAs('notification', parseNotificationConfig);
