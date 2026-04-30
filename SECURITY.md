# Security Policy

## Supported Versions

The `main` branch is the active development line. Security fixes should target
`main` unless a maintained release branch exists.

## Reporting a Vulnerability

Please report security issues privately. Do not open a public issue with exploit
details.

Use GitHub private vulnerability reporting if it is enabled for the repository,
or contact the maintainer through the repository owner profile.

## Dependency Security

- Dependabot checks npm and GitHub Actions dependencies.
- CodeQL runs on pushes and pull requests to catch code-level issues.
- `npm audit --audit-level=high` runs in CI as an advisory signal. It is
  intentionally non-blocking because high-severity advisories can appear in
  transitive development tooling that does not affect production runtime. Treat
  audit findings as triage work, and make them blocking when a reachable
  production dependency is affected.

## Secret Handling

Never commit real `.env` files, production credentials, tokens, cookies, private
keys, or session IDs. Use the example environment files as templates only.
