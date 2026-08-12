# Authentication and Authorization

## Better Auth routing

The HTTP authentication surface is Better Auth's native handler mounted at the
configured `BETTER_AUTH_URL` path. For the default configuration this is
`/api/v1/auth/*`. Use canonical endpoints such as `sign-up/email`,
`sign-in/email`, `get-session`, `sign-out`, organization routes, and the admin
plugin routes under `admin/*`.

## User name contract

The public authentication contract uses `firstName` and `lastName`; clients do
not send or receive Better Auth's core `name` field. Both public fields are
required for email registration and admin user creation, and either field can
be changed through the corresponding user-update routes.

Better Auth requires its core `name` field internally. The native Fastify
boundary therefore normalizes `firstName` and `lastName`, derives `name` as
`firstName + " " + lastName`, and strips `name` from JSON responses. Database
hooks keep the internal value synchronized after updates. For social sign-in,
the create hook splits the provider's name as a fallback when the provider does
not supply the two additional fields.

The same boundary transforms Better Auth's generated OpenAPI document, so the
documented sign-up, update, and admin operations expose the actual public
contract rather than the internal `name` field.

## OpenAPI integration

The Better Auth `openAPI` plugin generates the authentication schema from the
same configured auth instance that handles requests. Outside production, when
documentation is enabled, that schema is merged with Nest's OpenAPI document
and displayed in the shared Scalar reference at `/documentation`.

Better Auth paths are prefixed with the pathname from `BETTER_AUTH_URL`. For
example, a generated `/sign-in/email` operation becomes
`/api/v1/auth/sign-in/email` when `BETTER_AUTH_URL` is
`http://localhost:5000/api/v1/auth`. The merge also includes Better Auth
schemas, security schemes, and tags. The application keeps
`/documentation-proxy` as the OpenAPI server so requests sent from Scalar use
the existing CSRF-aware documentation proxy.

The generated `sign-up/email` and `sign-in/email` operations include a required
`X-Forwarded-For` header with `192.29.224.220` as the interactive documentation
default and example value. This is a documentation sample; production proxies
remain responsible for supplying a trusted client IP.

`better-auth.ts` is the CLI entrypoint. It exports both `authFeatures` and:

```ts
export const auth = betterAuth(authFeatures);
```

The Nest application creates one Better Auth instance with the global
`PrismaService`. CLI processes create one separate process-local Prisma client
and reuse it for Better Auth and CLI database work.

## Static roles and permissions

`src/modules/authorization/domain/permissions.catalog.ts` is the source of truth for:

- resources and actions;
- application roles;
- inherited grants for each role;
- Better Auth admin-plugin access control.

New email/password registrations receive the `user` role automatically. The
authorization catalog exposes `DEFAULT_ROLE = 'user'`, which is passed to the
Better Auth admin plugin, and the Prisma `User.role` column independently uses
`@default("user")`. Clients do not submit a role during normal registration.

`User.role` stores one or more comma-separated role names compatible with the
Better Auth admin plugin. Unknown names grant nothing. There are no `Role`,
`Permission`, `UserRole`, or `RolePermission` tables.

`UserPermission` stores overrides only, keyed by `permissionKey`:

- `ALLOW` adds a permission not inherited from the user's roles;
- `DENY` removes a permission and always wins over role grants and `manage`.

Nest endpoints use `AuthGuard`, `PermissionsGuard`, and `@Permissions(...)`.
There is no role guard. Better Auth admin routes are additionally checked by the
same effective-permission service before the admin plugin executes so overrides
remain authoritative.
