export class LinkedAccount {
  constructor(
    readonly id: string,
    readonly provider: string,
    readonly providerId: string,
    readonly accountId: string,
    readonly createdAt: Date = new Date(),
  ) {}
}
