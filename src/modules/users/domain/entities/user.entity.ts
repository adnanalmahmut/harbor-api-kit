export class User {
  constructor(
    public id: string,
    public name: string,
    public firstName: string | null,
    public lastName: string | null,
    public email: string,
    public emailVerified: boolean,
    public image: string | null,
    public locale: string,
    public roles: string[],
    public permissions: string[],
    public createdAt: Date,
    public updatedAt: Date,
    // Add other fields if needed for domain logic, but essentially matching Prisma
  ) {}
}
