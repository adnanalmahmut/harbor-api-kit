// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * @param {Array<{name: string, message: string}>} paths
 */
function zipPaths(paths) {
  return paths;
}

const prismaRestricted = {
  paths: [
    {
      name: '@prisma/client',
      message:
        'Prisma must be isolated inside infrastructure and repositories only.',
    },
  ],
  patterns: [
    {
      group: ['**/generated/prisma/**', '#src/generated/prisma/**'],
      message:
        'Prisma generated types must be isolated inside infrastructure and repositories only.',
    },
  ],
};

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

const nestJsRestricted = {
  patterns: [
    {
      group: ['@nestjs/*', '@nestjs/**'],
      message: 'This layer must be framework-agnostic (no NestJS).',
    },
  ],
};

const infrastructureRestricted = {
  patterns: [
    {
      group: [
        '#src/infrastructure/**',
        '#src/modules/**/infrastructure/**',
        '**/infrastructure/**',
      ],
      message: 'Dependence on infrastructure is prohibited in this layer.',
    },
  ],
};

const presentationRestricted = {
  patterns: [
    {
      group: [
        '#src/modules/**/presentation/**',
        '#src/modules/**/interfaces/**',
        '**/presentation/**',
        '**/interfaces/**',
      ],
      message: 'Dependence on presentation/interfaces is prohibited.',
    },
  ],
};

const applicationRestricted = {
  patterns: [
    {
      group: ['#src/modules/**/application/**', '**/application/**'],
      message:
        'Dependence on application layer is prohibited (except for specific flows).',
    },
  ],
};

const domainRestricted = {
  patterns: [
    {
      group: ['#src/modules/**/domain/**', '**/domain/**'],
      message: 'Dependence on domain is prohibited in this layer.',
    },
  ],
};

const redisRestricted = {
  paths: [
    {
      name: 'ioredis',
      message: 'Direct Redis access is prohibited in this layer.',
    },
    {
      name: 'redis',
      message: 'Direct Redis access is prohibited in this layer.',
    },
  ],
};

const i18nRestricted = {
  paths: [
    {
      name: 'nestjs-i18n',
      message: 'i18n providers should not be imported in this layer.',
    },
  ],
};

const contextRestricted = {
  patterns: [
    {
      group: ['#src/infrastructure/context/**', '**/infrastructure/context/**'],
      message:
        'Request context implementation details are restricted from this layer.',
    },
  ],
};

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**', 'generated/**', 'test/**'],
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
  // Global rules
  {
    files: ['src/**/*.ts'],
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
  // Default Prisma Isolation (overridden in specific layers if allowed)
  {
    files: ['src/**/*.ts'],
    ignores: [
      'src/infrastructure/**/*.ts',
      'src/modules/**/infrastructure/**/*.ts',
      'src/core/db/prisma/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [...prismaRestricted.paths],
          patterns: [...prismaRestricted.patterns],
        },
      ],
    },
  },
  // Domain Layer
  {
    files: ['src/modules/**/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...prismaRestricted.paths,
            ...zipPaths(classValidatorRestricted.paths), // Helper or just spread? Spread is fine if not merging into same object keys
            ...redisRestricted.paths,
            ...i18nRestricted.paths,
          ],
          patterns: [
            ...prismaRestricted.patterns,
            ...nestJsRestricted.patterns,
            ...infrastructureRestricted.patterns,
            ...presentationRestricted.patterns,
            ...applicationRestricted.patterns,
            ...contextRestricted.patterns,
          ],
        },
      ],
    },
  },
  // Application Layer
  {
    files: ['src/modules/**/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...prismaRestricted.paths,
            ...classValidatorRestricted.paths,
            ...redisRestricted.paths,
            ...i18nRestricted.paths,
          ],
          patterns: [
            ...prismaRestricted.patterns,
            ...nestJsRestricted.patterns,
            ...infrastructureRestricted.patterns,
            ...presentationRestricted.patterns,
            ...contextRestricted.patterns,
            // Allow domain
          ],
        },
      ],
    },
  },
  // Presentation + Interfaces Layer
  {
    files: [
      'src/modules/**/presentation/**/*.ts',
      'src/modules/**/interfaces/**/*.ts',
    ],
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
            ...domainRestricted.patterns,
            ...infrastructureRestricted.patterns,
          ],
        },
      ],
    },
  },
  // Infrastructure Layer
  {
    files: [
      'src/infrastructure/**/*.ts',
      'src/modules/**/infrastructure/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [...classValidatorRestricted.paths], // Prisma allowed
          patterns: [...presentationRestricted.patterns],
        },
      ],
    },
  },
  // Core Layer
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...prismaRestricted.paths,
            ...classValidatorRestricted.paths,
            ...redisRestricted.paths,
            ...i18nRestricted.paths,
          ],
          patterns: [
            ...prismaRestricted.patterns,
            ...nestJsRestricted.patterns,
            ...presentationRestricted.patterns, // Prevent feature internals
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
);
