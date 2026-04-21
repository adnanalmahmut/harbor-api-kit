export interface CacheHealthPort {
  ping(): Promise<void>;
}
