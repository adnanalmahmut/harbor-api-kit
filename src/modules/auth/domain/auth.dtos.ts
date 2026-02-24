import type { Session, User } from './auth.entities.js';

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
export type AuthResult<T> = {
  data: T;
  cookies?: CookieDirective[];
};

export type TokenResult = {
  token: string;
};

export type SignUpResultData = {
  token: string;
  user: User;
};

export type SignInResultData = {
  redirect: boolean;
  token: string;
  url?: string;
  user: User;
};

export type GetSessionResult = {
  user: User;
  session: Session;
} | null;
