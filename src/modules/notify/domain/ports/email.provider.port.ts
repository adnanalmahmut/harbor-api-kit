export interface SendEmailParams {
  to: string;
  subject: string;
  template: string; // e.g. 'auth/verify-email'
  data: Record<string, any>;
  locale?: string;
}

export abstract class EmailProviderPort {
  abstract sendEmail(params: SendEmailParams): Promise<void>;
}
