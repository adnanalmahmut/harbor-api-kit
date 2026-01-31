export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  locale?: string | null;
  role?: string;
  roles?: string[];
  permissions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token?: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

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

export interface LinkedAccount {
  id: string;
  provider: string;
  providerId: string;
  accountId: string;
  createdAt: Date;
}
