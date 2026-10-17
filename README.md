# M-Service Desk

M-Service Desk is the technical foundation for a public service request system for Murang'a County. Phase 1 provides a temporary frontend landing page, an Express API, and the initial PostgreSQL data model; citizen and administrator workflows are not implemented yet.

Phase 2 adds backend registration, email verification, login, database-backed bearer sessions, password changes/resets, and administrator-only safe user listing. The frontend remains a foundation landing page; authentication screens are not part of this phase.

## Technology stack

- Frontend: React, TypeScript, Vite, and Material UI
- Backend: Node.js, Express, TypeScript, Zod, and Prisma ORM
- Database: PostgreSQL

## Repository structure

```text
frontend/   React/Vite application
backend/    Express API and Prisma schema/configuration
            Phase 2 architecture and assessment notes: backend/PHASE-2-AUTH.md
README.md
.gitignore
```

## Prerequisites

- Node.js 20.19+ or 22.12+ (Node.js 24 is also supported)
- npm
- PostgreSQL for database-backed health checks and migrations

## Environment setup

Install dependencies from each application directory:

```sh
cd backend
npm install
copy .env.example .env
```

Set `DATABASE_URL` in `backend/.env` to a PostgreSQL database you can access. The example is:

```text
postgresql://postgres:postgres@localhost:5432/m_service_desk?schema=public
```

Replace the example username/password as appropriate; do not commit `.env`.
`PORT` defaults to `3000`, `NODE_ENV` defaults to `development`, and `FRONTEND_URL` defaults to `http://localhost:5173`. `FRONTEND_URL` accepts a comma-separated list of allowed origins.
`FRONTEND_APP_URL` controls the frontend links in verification/reset email. To deliver these emails, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM` together. Production startup requires SMTP and an explicit `FRONTEND_APP_URL`. Without SMTP, registration still creates a citizen account but email verification and login cannot complete; no token is exposed by an API or log.

Then install frontend dependencies:

```sh
cd ../frontend
npm install
copy .env.example .env
```

Set `VITE_API_URL` in `frontend/.env` to `http://localhost:3000`. The frontend has a local default if this variable is omitted.

## Database configuration

The Prisma schema is in `backend/prisma/schema.prisma`. Prisma 7 reads the CLI database URL from `backend/prisma.config.ts`; the runtime Prisma client uses the PostgreSQL driver adapter and `DATABASE_URL`.

From `backend/`, generate the client and create/apply the initial development migration:

```sh
npm run db:generate
npm run db:migrate
```

The initial migration is in `backend/prisma/migrations/`. Review the target database schema before applying it; this repository did not previously have migration history. Production deployments should use `npx prisma migrate deploy`. To open Prisma Studio:

```sh
npm run db:studio
```

PostgreSQL must be running and the target database must exist before migrating. The API health endpoint reports a database failure until it can make a real query.

## Running the applications

In one terminal, from `backend/`:

```sh
npm run dev
```

The API listens on `http://localhost:3000` by default.

In a second terminal, from `frontend/`:

```sh
npm run dev
```

Vite prints the local frontend URL (normally `http://localhost:5173`).

To create production builds, run `npm run build` in either application directory. To start the compiled backend, run `npm start` in `backend/`.

## Health endpoints

- `GET /` returns the application name and API status.
- `GET /api/health` returns the application name, API status, current timestamp, and database connectivity status. It queries PostgreSQL through Prisma and returns HTTP 503 when the database check fails.

## Common setup problems

- **Database connection refused:** Start PostgreSQL and verify the host, port, database name, and credentials in `backend/.env`.
- **Database does not exist:** Create the configured database before running `npm run db:migrate`.
- **Frontend requests blocked by CORS:** Set `FRONTEND_URL` in `backend/.env` to the exact frontend origin (or comma-separate multiple origins), then restart the backend.
- **Prisma client cannot be found:** Run `npm run db:generate` from `backend/` after installing dependencies.
- **Environment changes are not picked up:** Restart the relevant development server after editing its `.env` file.
- **Login reports invalid credentials after registration:** Email verification is required. Configure SMTP and request/resend the verification email.

## Phase 2 authentication

Authentication routes, role permissions, security decisions, endpoint examples, SMTP setup, Postman guidance, and implementation/testing limitations are documented in [backend/PHASE-2-AUTH.md](./backend/PHASE-2-AUTH.md). Run `npm test` from `backend/` to execute the mocked auth API tests. These tests do not replace applying migrations to and testing against a dedicated PostgreSQL database.
