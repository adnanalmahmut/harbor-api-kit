export class PermissionCalculator {
  static calculate(
    rolePermissions: string[],
    allowOverrides: string[],
    denyOverrides: string[],
  ): string[] {
    const allowed = new Set(rolePermissions);

    // allow overrides add to the set
    allowOverrides.forEach((p) => allowed.add(p));

    // deny overrides remove from the set (highest priority)
    denyOverrides.forEach((p) => allowed.delete(p));

    return Array.from(allowed).sort();
  }
}
