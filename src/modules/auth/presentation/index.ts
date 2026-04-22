// Public presentation surface for cross-module consumption.
// Controllers and internal HTTP helpers are NOT exported — they are
// module-internal and consumed only by the auth module itself.
export * from './http/auth.decorator.js';
export * from './http/auth.guard.js';
export * from './http/dtos/index.js';
