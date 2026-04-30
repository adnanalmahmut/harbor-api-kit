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

Authentication is cookie-based. Login/register responses set HttpOnly session
cookies through `Set-Cookie`; they do not return bearer tokens in the response
body.

Cookie-bearing mutating requests require CSRF protection:

- CSRF cookie: `COOKIE_CSRF_NAME`
- CSRF header: `CSRF_HEADER_NAME`

## Validation

HTTP bodies, params, and queries use strict Zod DTOs. Unknown keys are rejected.
