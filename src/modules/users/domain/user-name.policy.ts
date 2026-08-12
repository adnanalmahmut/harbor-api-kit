export type UserNameParts = {
  firstName: string;
  lastName: string;
};

export function normalizeUserNamePart(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function composeUserName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  return [firstName, lastName]
    .map((part) => normalizeUserNamePart(part ?? ''))
    .filter(Boolean)
    .join(' ');
}

export function splitUserName(name: string): UserNameParts {
  const [firstName = '', ...remaining] = normalizeUserNamePart(name).split(' ');
  return {
    firstName,
    lastName: remaining.join(' '),
  };
}
