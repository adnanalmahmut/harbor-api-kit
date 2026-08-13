/**
 * Abstract classes rather than interfaces so they double as DI tokens.
 *
 * `DbHealthPort` is bound in `PersistenceModule` — the health module never
 * learns which database library answers the ping.
 */
export abstract class DbHealthPort {
  abstract ping(): Promise<void>;
}

export abstract class CacheHealthPort {
  abstract ping(): Promise<void>;
}
