// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Boundary enforcement for the Nest-standard layout.
 *
 * The old config encoded a four-layer hexagonal structure with eleven
 * per-layer `no-restricted-imports` blocks. The current structure needs far
 * less: controllers, services and repositories are distinguished by file name,
 * not by directory, so the only boundaries worth machine-enforcing are the
 * ones a reviewer would actually miss.
 */

/** Rule 1 — the database library is confined to `src/persistence/**`. */
const prismaRestricted = {
  paths: [
    {
      name: '@prisma/client',
      message:
        'Prisma is confined to src/persistence/**. Depend on the feature repository (<feature>.repository.ts) instead.',
    },
  ],
  patterns: [
    {
      group: ['**/generated/prisma/**', '#src/generated/prisma/**'],
      message:
        'Prisma generated types are confined to src/persistence/**. A repository port must not expose them — see docs/persistence.md.',
    },
  ],
};

/**
 * Rule 2 — the concrete adapters are private to the persistence layer.
 *
 * `#src/persistence/transaction.manager.js` stays importable: it is the public
 * port a service uses to compose writes atomically.
 */
const persistenceInternalsRestricted = {
  patterns: [
    {
      group: ['#src/persistence/prisma/**', '#src/persistence/persistence.module.js'],
      message:
        'Persistence adapters are private. Inject the abstract repository, or TransactionManager from #src/persistence/transaction.manager.js.',
    },
  ],
};

/** Rule 3 — DTO validation is Zod, everywhere. */
const classValidatorRestricted = {
  paths: [
    {
      name: 'class-validator',
      message: 'Use Zod + createStrictZodDto instead of class-validator.',
    },
    {
      name: 'class-transformer',
      message: 'Avoid class-transformer; use Zod DTOs instead.',
    },
  ],
};

/**
 * Rule 4 — another module's repository is not a public surface. Cross-module
 * collaboration goes through the exported service or guard.
 */
const foreignRepositoryRestricted = {
  patterns: [
    {
      group: ['#src/modules/*/*.repository.js'],
      message:
        "Do not depend on another module's repository. Inject that module's service, which it exports from its @Module.",
    },
  ],
};

/** Direct cache access belongs behind CachePort. */
const redisRestricted = {
  paths: [
    {
      name: 'ioredis',
      message:
        'Direct Redis access belongs in src/infrastructure/cache. Inject CachePort or RedisService.',
    },
    {
      name: 'redis',
      message:
        'Direct Redis access belongs in src/infrastructure/cache. Inject CachePort or RedisService.',
    },
  ],
};

export default [
  {
    ignores: [
      'eslint.config.mjs',
      'dist/**',
      'generated/**',
      'src/generated/**',
      'test/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Application-wide boundaries.
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...prismaRestricted.paths,
            ...classValidatorRestricted.paths,
            ...redisRestricted.paths,
          ],
          patterns: [
            ...prismaRestricted.patterns,
            ...persistenceInternalsRestricted.patterns,
            ...foreignRepositoryRestricted.patterns,
          ],
        },
      ],
    },
  },
  // The persistence layer: Prisma is allowed here and nowhere else. Repository
  // ports and module exceptions are imported from the features they serve.
  {
    files: ['src/persistence/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [...classValidatorRestricted.paths],
          patterns: [],
        },
      ],
    },
  },
  // The cache capability owns the Redis client.
  {
    files: ['src/infrastructure/cache/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [...prismaRestricted.paths, ...classValidatorRestricted.paths],
          patterns: [
            ...prismaRestricted.patterns,
            ...persistenceInternalsRestricted.patterns,
          ],
        },
      ],
    },
  },
  // Better Auth ships its own Prisma adapter: an accepted, documented
  // exception to rule 1, scoped to the two files that wire it.
  {
    files: [
      'src/modules/auth/auth.module.ts',
      'src/modules/auth/better-auth/better-auth.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [...classValidatorRestricted.paths],
          patterns: [
            ...prismaRestricted.patterns,
            ...foreignRepositoryRestricted.patterns,
          ],
        },
      ],
    },
  },
  // General
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-implied-eval': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
];
