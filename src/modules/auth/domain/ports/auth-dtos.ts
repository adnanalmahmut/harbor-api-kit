import type { LinkedAccount } from '#src/modules/auth/domain/entities/linked-account.entity.js';
import type { Session } from '#src/modules/auth/domain/entities/session.entity.js';
import type { User } from '#src/modules/auth/domain/entities/user.entity.js';

export type { LinkedAccount, Session, User };

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
