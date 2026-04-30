# Contributing

Thanks for helping improve harbor-api-kit.

## Before You Start

- Read [ARCHITECTURE.md](ARCHITECTURE.md) and [AGENTS.md](AGENTS.md).
- Keep changes focused. No drive-by refactors.
- Do not add runtime dependencies without a clear justification.
- Do not commit secrets, tokens, cookies, or private environment files.

## Development

```bash
npm install
cp .env.example .env
npm run docker:up
npx prisma migrate dev
npm run start:dev
```

## Checks

Run the checks that match your change:

```bash
npm run lint:check
npm run build
npm test
```

For API or persistence changes, also run the contract/e2e tests with the test
stack:

```bash
cp .env.test.example .env.test
npm run test:e2e
```

## Pull Requests

- Explain the problem and the behavior change.
- Include verification commands and results.
- Add or update tests for behavior changes.
- Update documentation when public behavior, configuration, or architecture changes.
