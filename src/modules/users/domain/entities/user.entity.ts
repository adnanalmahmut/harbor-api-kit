import { composeUserName } from '../user-name.policy.js';

export class User {
  constructor(
    public id: string,
    public firstName: string | null,
    public lastName: string | null,
    public email: string,
    public emailVerified: boolean,
    public image: string,
    public locale: string,
    public roles: string[],
    public permissions: string[],
    public createdAt: Date,
    public updatedAt: Date,
    // Add other fields if needed for domain logic, but essentially matching Prisma
  ) {}

  get fullName(): string {
    return composeUserName(this.firstName, this.lastName);
  }
}
