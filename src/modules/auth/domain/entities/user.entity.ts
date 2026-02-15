export class User {
  constructor(
    readonly id: string,
    readonly email: string,
    readonly emailVerified: boolean,
    readonly name: string,
    readonly firstName: string | null = null,
    readonly lastName: string | null = null,
    readonly image: string | null = null,
    readonly locale: string | null = null,
    public roles: string[] = [],
    public permissions: string[] = [],
    readonly createdAt: Date = new Date(),
    readonly updatedAt: Date = new Date(),
    readonly deletedAt: Date | null = null,
  ) {}

  get fullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.name;
  }

  get isActive(): boolean {
    return !this.deletedAt;
  }

  get canLogin(): boolean {
    return this.isActive;
  }
}
