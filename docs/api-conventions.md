# API Conventions

## Base Path

The API uses URI versioning:

```text
/api/v1
```

## Response Envelope

Success responses are wrapped by the global response interceptor:

```json
{
  "success": true,
  "message": "Translated message",
  "data": {}
}
```

`message` and `data` are present when the endpoint returns them.

Errors are shaped by the global exception filter:

```json
{
  "success": false,
  "message": "Translated error"
}
```

Validation errors include field-level details:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "path": "email",
      "message": "validation.email.invalid"
    }
  ]
}
```

The request ID is exposed through the configured request ID header, not in the
JSON error body.

## Authentication

Authentication is cookie-based and is served through Better Auth's canonical
routes under `/api/v1/auth/*`, such as `/sign-up/email`, `/sign-in/email`,
`/get-session`, and `/sign-out`. These native routes use Better Auth's response
contract and are intentionally not wrapped by the Nest response envelope.

Outside production, when documentation is enabled, these native routes are
generated from Better Auth and merged into the application OpenAPI 3.1.1
document. The published path prefix comes from `BETTER_AUTH_URL`, so Scalar
shows the same URLs handled at runtime rather than unprefixed Better Auth route
fragments.

User identity payloads expose `firstName` and `lastName`. Email sign-up and
admin user creation require both fields. Better Auth's required `name` value is
derived and synchronized inside the application and is intentionally absent
from public request schemas and JSON responses.

Cookie-bearing mutating requests require CSRF protection:

- CSRF cookie: `COOKIE_CSRF_NAME`
- CSRF header: `CSRF_HEADER_NAME`

## Validation

HTTP bodies, params, and queries use strict Zod DTOs. Unknown keys are rejected.
