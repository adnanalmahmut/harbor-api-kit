export interface DbHealthPort {
  ping(): Promise<void>;
}
