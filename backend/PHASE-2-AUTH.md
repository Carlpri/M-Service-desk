# Phase 2: Authentication and user management

## Architecture decisions

The existing `CITIZEN` and `ADMIN` Prisma roles are retained. Public registration always assigns `CITIZEN`; no public input can set a role. Citizens can access their own `/api/auth/me` profile. Administrators can list safe user profiles through `GET /api/admin/users`. No role-change or account-disable API is exposed; an administrator account must be provisioned through a separately controlled operational process.

Authentication uses random opaque bearer credentials backed by `AuthSession` rows. Only a SHA-256 hash of each credential is persisted. This requires a database lookup per protected request, but it enables immediate logout and invalidation of every session after password changes or resets. Sessions expire after 12 hours. There is no refresh token.

Passwords are hashed with Argon2id using 19 MiB memory, two iterations, and one lane. Password-reset and email-verification tokens are generated with Node's cryptographically secure random source; only SHA-256 hashes are stored. Reset tokens expire after 30 minutes; verification tokens expire after 24 hours. Both are consumed once.

Email verification is required to log in. SMTP delivery is an explicit integration: all SMTP settings must be configured together, and production startup requires those settings and a public `FRONTEND_APP_URL`. Without SMTP, registration succeeds but no verification token is created or delivered, so that account cannot log in until delivery is configured and a new verification message is requested. No test/development API returns tokens.

## Important files

| File | Purpose |
| --- | --- |
| `src/modules/auth/auth.routes.ts` | Declares auth endpoints and rate limits. |
| `src/modules/auth/auth.service.ts` | Implements validation, registration, login, session handling, password operations, token consumption, and safe user listing. |
| `src/modules/auth/auth.schemas.ts` | Zod schemas for external authentication input; email addresses are normalized. |
| `src/modules/auth/password.ts` | Argon2id hash and verification helpers. |
| `src/modules/auth/email-delivery.ts` | SMTP delivery adapter and provider interface for verification/reset messages. |
| `src/middleware/authenticate.ts` | Verifies bearer credentials against live, unexpired database sessions and enforces roles. |
| `src/types/express.d.ts` | Types the authenticated-user context attached by middleware. |
| `src/modules/users/users.routes.ts` | Administrator-only, paginated safe user listing. |
| `src/utils/secure-token.ts` | Creates secure random tokens and hashes them before storage. |
| `src/utils/http-error.ts` | Carries expected HTTP failures to the central error handler. |
| `prisma/schema.prisma` | Adds activation/verification state, sessions, and one-time token records. |
| `prisma/migrations/20261017190000_phase2_auth/migration.sql` | Initial schema migration generated from the complete current Prisma schema. |
| `src/modules/auth/auth.routes.test.ts` | HTTP tests using mocked Prisma; no real database is modified. |

## Request flows

### Registration and email verification

`POST /api/auth/register` validates name, email, and password, lowercases the email, hashes the password, and creates a citizen account. The response omits password data. If SMTP is configured, the service stores a verification-token hash and emails the raw token to the account owner. `POST /api/auth/verify-email` hashes the submitted token, checks expiry/unused state, atomically consumes it, and records `emailVerifiedAt`. Resending invalidates earlier unused tokens before creating a new one.

### Login, authentication, and roles

`POST /api/auth/login` uses a generic error for nonexistent, inactive, unverified, or incorrect-password accounts. A dummy Argon2 hash is checked for nonexistent addresses to reduce response-time account enumeration. Successful login creates a 12-hour session and returns its raw bearer credential once. The database stores only its hash.

Protected routes pass through `authenticate`, which hashes the presented bearer token and loads a matching unexpired, unrevoked session and active, verified user. The role is read from the database, never from client input. `requireRole(ADMIN)` blocks citizens from the administrator user list. CORS is not an authorization control.

### Logout and password changes

`POST /api/auth/logout` revokes the current session. `POST /api/auth/change-password` requires the current password, hashes the new password, revokes all sessions, and invalidates unused reset tokens. The user must log in again.

### Password reset

`POST /api/auth/forgot-password` returns the same generic response for unknown and known email addresses. When SMTP is configured and the account is active, it stores a hashed, 30-minute token and emails the raw token. Delivery failures are logged without token or address and do not change the generic response. The response does not claim that an email was sent. `POST /api/auth/reset-password` safely consumes the token, changes the password, and revokes sessions and other reset tokens in a database transaction.

### Errors and rate limits

The central error middleware returns `VALIDATION_ERROR` with field paths for Zod failures, stable codes for expected HTTP errors, and a generic message for unexpected failures. Login is limited to 8 attempts per 15 minutes per in-memory process; registration, reset requests/consumption, and verification have separate limits. Deployments with multiple backend instances should replace the default in-memory limiter store with a shared store.

## Endpoints

### `POST /api/auth/register`

Request:

```json
{
  "name": "Amina Citizen",
  "email": "amina@example.com",
  "password": "a long passphrase of 12 characters"
}
```

Returns `201` with `{ "message": "...", "user": { "id": "...", "name": "...", "email": "...", "role": "CITIZEN", "isActive": true, "emailVerifiedAt": null, "createdAt": "...", "updatedAt": "..." } }`. No password hash is returned. Duplicate addresses return `409 EMAIL_ALREADY_REGISTERED`; validation failures return `400`.

### `POST /api/auth/login`

Request: `{ "email": "amina@example.com", "password": "a long passphrase of 12 characters" }`.

Returns `200` with `{ "token": "<bearer credential>", "tokenType": "Bearer", "expiresAt": "...", "user": { ...safe profile... } }`. Invalid, inactive, or unverified accounts return generic `401 INVALID_CREDENTIALS`. Include the token in `Authorization: Bearer <token>` on protected requests.

### `GET /api/auth/me`

Requires a bearer token. Returns `200` with `{ "user": { ...safe current-user profile... } }`. Identity comes only from the verified session.

### `POST /api/auth/logout`

Requires a bearer token. Returns `200` with `{ "message": "Logged out successfully" }`; that token immediately stops authenticating.

### `POST /api/auth/change-password`

Requires a bearer token. Request: `{ "currentPassword": "...", "newPassword": "a different long passphrase" }`. Returns `200` and indicates sessions were invalidated. The caller must authenticate again. A wrong current password returns `400`.

### `POST /api/auth/forgot-password`

Request: `{ "email": "amina@example.com" }`. Returns generic `202`; it does not disclose whether an account exists. An email is sent only when SMTP is configured.

### `POST /api/auth/reset-password`

Request: `{ "token": "<token from email>", "newPassword": "a different long passphrase" }`. Returns `200` after changing the password and revoking sessions. Invalid, expired, or already-consumed tokens return `400 RESET_TOKEN_INVALID`.

### `POST /api/auth/verify-email`

Request: `{ "token": "<token from email>" }`. Returns `200` on success. Invalid, expired, or reused tokens return `400 VERIFICATION_TOKEN_INVALID`.

### `POST /api/auth/resend-verification`

Request: `{ "email": "amina@example.com" }`. Returns generic `202` whether or not an eligible account exists. Delivery requires SMTP.

### `GET /api/admin/users?page=1&pageSize=20`

Requires an `ADMIN` bearer session. Returns safe profiles with pagination metadata. Citizens receive `403 FORBIDDEN`. `pageSize` is capped at 100.

## Environment setup

Required base settings remain `DATABASE_URL`, `PORT`, `NODE_ENV`, and `FRONTEND_URL`. Set `FRONTEND_APP_URL` to the public frontend origin for email links. To enable email, configure all of `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM`; partial SMTP configuration is rejected. Production requires SMTP, explicit `FRONTEND_URL` and `FRONTEND_APP_URL`, and an HTTPS `FRONTEND_APP_URL`. Keep all credentials in the ignored `backend/.env`, never in source control.

## Migrations and tests

From `backend/`:

```sh
npm run db:generate
npm run db:migrate
npm run build
npm test
```

`npm run db:migrate` uses `prisma migrate dev`; production deployments should use `npx prisma migrate deploy`. The tests mock Prisma and do not require, reset, or modify a database.

### Postman test workflow

Import [`postman/M-Service Desk Phase 2.postman_collection.json`](../postman/M-Service%20Desk%20Phase%202.postman_collection.json) into Postman. Its `baseUrl` defaults to `http://localhost:3000`. Start the backend and use a database with the migration applied before attempting database-backed requests.

Run requests individually in this order; do not use “Run collection” for the whole workflow because email verification and password changes require you to inspect messages/update credentials:

1. Under **1 - Availability**, check API root and database-backed health.
2. Under **2 - Registration and email verification**, send **Register citizen**. The request deliberately includes `"role": "ADMIN"` to test that registration still returns `CITIZEN`. Postman generates a unique test email/password and stores those variables. Then read the verification email and paste its token in the collection variable `verificationToken`; send **Verify email**.
3. Under **3 - Login and protected endpoints**, send **Login**. A test script saves the returned bearer token as `accessToken`. Now test **Current profile**, **Reject request without a bearer token**, **Reject invalid credentials**, and **Citizen cannot list users**. Postman checks status codes and selected response fields.
4. To test password change, send **Change password** while logged in. It updates the collection password variable and clears `accessToken` because all sessions are revoked. Log in again before trying other protected requests. To test logout, log in and then send **Logout**; it clears the saved session token.
5. **Request password reset** returns a generic response. With SMTP configured, paste the emailed reset token into `resetToken`, set `newPassword`, and send **Reset password**. Without SMTP, no reset token is produced; do not expect this workflow to complete.
6. To test **Admin can list users**, provide a bearer token for an existing `ADMIN` user in collection variable `adminToken`. Public registration cannot create this account.

The invalid registration and duplicate registration requests test validation and uniqueness. Verification/reset tokens are intentionally never returned by the API or written to logs.

## Verification status and limitations

- **Implemented and tested:** registration validation and role assignment, password hashing, duplicate-email handling, login and generic credential errors, protected profile, citizen/admin authorization, logout revocation, password-change session invalidation, generic forgot-password response without mail, request rate limiting, and existing root/health/404 behavior. Tests use a mocked Prisma client and do not prove live PostgreSQL behavior.
- **Implemented, needs configured database verification:** schema changes, one-time token persistence/expiry/consumption, and transactional invalidation. The generated Prisma client matches the schema.
- **External configuration required:** PostgreSQL credentials/database and SMTP delivery. Real messages, public account verification, and production mail delivery have not been tested.
- **Not implemented:** frontend authentication pages, refresh tokens, administrator role changes/deactivation APIs, citizen service-request ownership flows, shared/distributed rate-limit storage, and background cleanup of expired session/token rows.
- **Migration status:** migration SQL was generated offline. It was not applied because PostgreSQL rejected the example `postgres` credentials (`P1000`). No database reset or destructive command was run. Because this repository had no earlier migration history, review the target database's existing schema before applying this initial migration.

## Assessment talking points

1. Password hashing is intentionally expensive and salted by Argon2; the application never compares or stores plaintext passwords.
2. Opaque sessions are simpler than JWT refresh flows for this assessment: the database can revoke credentials immediately, at the cost of a database query per authenticated request.
3. The database stores hashes of bearer/reset/verification tokens, so a database-only leak does not reveal usable credentials.
4. Zod is the boundary for client input. The registration schema does not accept a role, and the service also sets `CITIZEN` explicitly.
5. SMTP is an integration boundary, not a pretend success: tokens are not returned in development responses or written to logs.
6. The Prisma migration and tests are ready, but mocked tests cannot replace running migrations and exercising a dedicated PostgreSQL test database.
7. Bearer credentials are not stored in cookies, so cookie CSRF is not applicable. Browser clients should keep credentials in memory where practical and defend against XSS rather than persisting long-lived tokens in local storage.
