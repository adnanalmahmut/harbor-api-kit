/**
 * The Better Auth instance is a plain object built by a factory, not a class,
 * so it needs an explicit injection token — the one place in the application
 * where a symbol token is unavoidable. Everything else injects by class.
 */
export const BETTER_AUTH = Symbol('BETTER_AUTH');
