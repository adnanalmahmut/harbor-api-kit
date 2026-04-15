// Public API of the Files module.
// NestJS module class is NOT re-exported — consuming .module.ts files
// import it directly from './files.module.js' to avoid circular barrel deps.
export * from './application/index.js';
export * from './domain/index.js';
export * from './files.tokens.js';
export * from './infrastructure/index.js';
export * from './presentation/index.js';
