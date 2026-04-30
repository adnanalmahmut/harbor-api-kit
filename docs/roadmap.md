# Roadmap

This project intentionally separates implemented features from planned work.

## Implemented

- Cookie-based authentication with better-auth.
- OAuth redirect initiation for Google and GitHub.
- CSRF protection for cookie-bearing mutating requests.
- RBAC with roles, permissions, grants, and effective permission caching.
- File storage adapters for local, S3-compatible, and GCS storage.
- Async email delivery with BullMQ and Resend.
- OpenAPI/Scalar documentation.

## Planned

- MFA/TOTP and step-up authentication.
- Distributed tracing with OpenTelemetry.
- Prometheus metrics endpoint.
- Audit logging for security-sensitive operations.
- More complete example screenshots and walkthroughs.

## Notes

- Email verification emails are sent, but verification enforcement is optional
  by default in the starter.
- The `shared` module is reserved for future cross-feature provider wiring and
  currently hosts shared cache binding.
