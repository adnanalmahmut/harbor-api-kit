export interface CookieDirective {
  name: string;
  value: string;
  options?: {
    domain?: string;
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
    expires?: Date;
  };
}
