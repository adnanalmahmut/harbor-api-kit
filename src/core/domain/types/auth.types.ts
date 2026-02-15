export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}

export interface AuthenticatedSession {
  id: string;
  userId: string;
  expiresAt: Date;
}
