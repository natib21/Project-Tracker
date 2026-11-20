# Multi-Tenant Project Tracker

A small project tracker that several organizations share. Each organization has its own members, projects and tasks, and no organization can see another's data. Money is in Ethiopian Birr (ETB): every project has a budget, every task has an estimated cost, and the app shows spent against budget.

| | |
|---|---|
| **Live app** | https://project-tracker-750y.onrender.com/ |
| **Pipeline** | https://github.com/natib21/Project-Tracker/actions/workflows/ci-cd.yml |
| **Health check** | https://project-tracker-750y.onrender.com/api/health |

The app runs on Render's free plan, which puts it to sleep when idle. The first request after a pause can take about 30 seconds.

### Demo logins

| Role | E-mail | Password | What it can do |
|---|---|---|---|
| Admin | `demo.admin@example.com` | `Demo12345!` | Everything: projects, tasks, members |
| Member | `demo.member@example.com` | `Demo12345!` | Read projects, work with tasks |

Both belong to **Demo Organization**, which holds one project (**Website Redesign**, budget 500,000 ETB) with four tasks worth 400,000 ETB. To see tenant isolation, register a third account: it starts with no organizations and cannot open Demo Organization, even with its id in the URL.

---

## 1. Architecture

```
Browser ──HTTPS──▶ Render web service (one Docker container)
                     ├─ NestJS API        /api/*
                     └─ React build       everything else (static files)
                              │
                              ▼
                        PostgreSQL
```

- **Backend** — NestJS, TypeScript, TypeORM, PostgreSQL (`apps/api`).
- **Frontend** — React, TypeScript, Vite, React Router (`apps/web`).
- **One image, one origin.** The Dockerfile builds the React app and copies it into the API image. NestJS serves it as static files and answers `/api/*` itself. The browser talks to a single origin, so there is no CORS setup in production and the session cookie needs no cross-site exceptions.
- **Login.** Passwords are hashed with bcrypt (12 rounds). After login the API sets a JWT in a cookie that is `httpOnly`, `secure` in production and `sameSite=lax`. JavaScript on the page cannot read the token.
- **Schema changes only through migrations.** `synchronize` is off. Migrations live in `apps/api/src/database/migrations` and run in order.

### Data model

```
users ──< memberships >── organizations ──< projects ──< tasks
            role: admin | member              budget       estimatedCost
                                                           priority
```

- A user can belong to several organizations, with a different role in each (`memberships` has a unique pair `userId + organizationId`).
- `projects` and `tasks` both carry `organizationId`. A task also carries `projectId`. Deleting a project deletes its tasks (foreign key with cascade).
- The database itself refuses bad values: `budget >= 0`, `estimatedCost >= 0`, `priority IN ('low','medium','high')`.
- Spent, remaining and over-budget are not stored. They are computed from the tasks with one `SUM` query, so they cannot drift.

### Roles

| Action | Admin | Member |
|---|---|---|
| See the organization, its members, projects and tasks | ✓ | ✓ |
| Create, edit, delete tasks | ✓ | ✓ |
| Create, edit, delete projects | ✓ | — |
| Add members | ✓ | — |

### API

All routes are under `/api`. Everything except register, login and health needs the session cookie.

| Route | Purpose |
|---|---|
| `GET /health` | Health check |
| `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | Session |
| `POST /organizations`, `GET /organizations` | Create an organization; list the ones I belong to |
| `GET /organizations/:orgId` | One organization (members only) |
| `GET, POST /organizations/:orgId/members` | Members (adding is admin only) |
| `GET, POST /organizations/:orgId/projects` · `GET, PATCH, DELETE …/projects/:projectId` | Projects with budget summary (writing is admin only) |
| `GET, POST …/projects/:projectId/tasks` · `GET, PATCH, DELETE …/tasks/:taskId` | Tasks |
| `GET …/projects/:projectId/tasks?priority=low\|medium\|high` | Tasks filtered by priority |

---

## 2. The pipeline, step by step

The whole pipeline is one file: [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml).

**On every push, on every branch — job `Test`:**

1. **Start a clean PostgreSQL 15** as a service container. Each run gets an empty database.
2. **Check out the code** and set up Node 22.
3. **`npm ci`** — install exactly what the lockfile says.
4. **Lint** the API and the web app.
5. **Run all migrations** on the empty database. This proves the schema can be built from nothing.
6. **Roll the newest migration back and apply it again.** This proves the newest migration is really reversible, not only on paper.
7. **Run the end-to-end tests** (101 tests). They start the real NestJS app against the real database and call it over HTTP. Many of them are isolation tests: a user of organization B asks for organization A's data and must get `404`.
8. **Build the Docker image.** The same Dockerfile is used in production, so a broken build is caught here.

**On `main` only — job `Deploy to Render`:**

9. The job has `needs: test` and `if: github.ref == 'refs/heads/main'`. It runs only when every step above passed, and only for `main`.
10. It calls the Render **deploy hook** (the URL is a GitHub secret, never in the repo).
11. Render builds the image from the Dockerfile and starts the new container.
12. The container's start script (`apps/api/docker-entrypoint.sh`) **runs pending migrations first, then starts the app**. If a migration fails, the script stops (`set -e`), the new container never becomes healthy, and Render keeps the previous version serving.

So a red test stops the deploy, and the database is always migrated before new code answers a request.

---

## 3. The change: task priority, and how to roll it back

**What changed.** Tasks have a `priority`: `low`, `medium` or `high`. You can set it when creating or editing a task and filter the task list by it.

**The migration** (`1700400000000-AddTaskPriority.ts`):

```sql
ALTER TABLE "tasks" ADD "priority" character varying NOT NULL DEFAULT 'medium';
ALTER TABLE "tasks" ADD CONSTRAINT "CHK_tasks_priority" CHECK (priority IN ('low','medium','high'));
CREATE INDEX "IDX_tasks_org_priority" ON "tasks" ("organizationId", "priority");
```

**Why this is safe for existing data.**

- The column is added with a default in the same statement, so every existing task becomes `medium` at once. There is no moment where a row has no priority, and no separate "backfill" step that could half-finish.
- In PostgreSQL 11 and later, adding a column with a constant default does not rewrite the table. It is quick even on a large table.
- No existing column is touched, so no existing data can be lost.
- The change is **backward compatible**: the previous version of the code does not know the column, and its inserts still work because the default fills it. Old code and new schema can run together.

**How it is tested.** The pipeline applies it, rolls it back and applies it again (step 6). The tests check that a row written without a priority reads back as `medium`, that the database refuses any other value, that the filter returns only matching tasks, and that the filter still respects tenant isolation.

**How to roll back.** Order matters: code first, then schema.

1. **Roll back the code.** Revert the merge commit on `main` and push. The pipeline runs and deploys the previous version. Because the change is backward compatible, the app works at this point and the extra column is simply ignored. In an emergency, an earlier commit can also be deployed by hand from Render's dashboard.
2. **Roll back the schema** (only if the column itself must go). With `DATABASE_URL` pointing at the database:

   ```bash
   npm run migration:revert
   ```

   This runs the migration's `down`: it drops the index, the check constraint and the column. All tasks stay; only their priority values are lost.

Do not revert the schema while the new version is still deployed: the container runs pending migrations at every start and would add the column again.

---

## 4. Tenant isolation: how it works, and where it could leak

### How it works

Isolation is enforced on the server in three layers. The frontend only hides buttons; it is never trusted.

1. **The organization is in the URL.** Every route that touches tenant data is under `/api/organizations/:orgId/…`.
2. **A guard checks membership on every request.** `OrgAccessGuard` reads `orgId` from the URL and the user id from the verified JWT, then looks the membership up **in the database**. No membership means `404`. Roles are not stored in the token, so removing a member or changing a role takes effect on the next request.
3. **Every query also filters by `organizationId`.** For example, a task is loaded with `WHERE id = :taskId AND projectId = :projectId AND organizationId = :orgId`. If the guard were ever skipped, a project or task id from another organization would still find nothing. This also blocks the "mixed path" attack: my own `orgId` in the URL with someone else's `projectId`.

A non-member gets `404`, not `403`, with the same body as for an id that does not exist. So the API does not confirm that another organization exists. `403` is used only inside your own organization, when a member tries an admin action.

The tests cover each of these: non-member access, mixed paths with guessed ids, and the member/admin split, for organizations, members, projects and tasks.

### Where it could leak

- **A new route that forgets the guard.** The guard is added per controller, so safety depends on remembering it. This is not theory: while finishing this work I found that `GET /api/organizations/:orgId` had only the login check, so any signed-in user who knew an organization's id could read its name and description. It is fixed and has tests now, but the design still allows the same mistake again.
- **A new query that forgets the `organizationId` filter.** The second layer is also a convention, not something the database enforces.
- **`organizationId` on a task is not tied to its project by the database.** The service always copies it from the URL after checking the project, but no constraint stops a task from saying organization A while its project belongs to B.
- **E-mail discovery.** An admin adds members by e-mail, and the answer tells them whether that e-mail has an account. Registration tells the same. This leaks who uses the product, across tenants.
- **Sessions cannot be revoked.** The JWT lives for 7 days. Membership is re-checked on each request, so a removed member loses access at once, but a stolen cookie stays valid as a login until it expires.
- **No audit log.** If something did leak, there is no record of who read what.

---

## 5. Two decisions and their trade-offs

**Decision 1 — Organization id in the URL, checked by a guard and again in every query, instead of PostgreSQL row-level security.**
It is plain application code: easy to read, easy to test with ordinary HTTP tests, and it works with a normal connection pool. The price is that it is opt-in. Each new route and query must remember it (see section 4). Row-level security would make the database refuse by default, but it needs a per-request database session setting, is harder to debug, and is easy to get wrong with pooled connections. For an app of this size I chose the simple approach plus many isolation tests, and I list row-level security as the next step.

**Decision 2 — Migrations run when the container starts, and deploys happen only through the pipeline.**
There is one path to production, the schema can never be behind the code, and nobody runs SQL by hand. The price: every migration must be backward compatible, because for a short time during a deploy the old code can meet the new schema. Also, with several instances starting together they would race to migrate; with one instance this cannot happen. At larger scale I would move migrations to a separate one-off deploy step.

---

## 6. What I would harden next

In order:

1. **Deny by default.** Register the login and membership guards globally and mark the few public routes explicitly, so a new route is closed unless someone opens it. Add a test that walks all routes and fails if one under `/organizations/:orgId` lacks the guard.
2. **Let the database enforce the tenant.** A composite foreign key `(projectId, organizationId)` from tasks to projects, then PostgreSQL row-level security as a second wall behind the application code.
3. **Protect login.** Rate limiting on login and register, and security headers (Helmet).
4. **Stop e-mail discovery.** Replace "add member by e-mail" with invitations that give the same answer whether or not the account exists.
5. **Revocable sessions.** Short-lived access token with a rotating refresh token stored server-side, so logout and "sign out everywhere" really end a session.
6. **Safer deploys.** Run migrations as a separate pre-deploy step, smoke-test `/api/health` after deploy, and roll back automatically if it fails. Take a database backup before any migration that removes data.
7. **Audit log** of who changed what in each organization.
8. **A paid instance** to remove the cold start, plus error tracking and uptime monitoring.

---

## Running it locally

Needs Node 22 and Docker.

```bash
npm ci
cp .env.example .env              # then fill in the values
docker compose up -d postgres     # PostgreSQL on localhost:5432
npm run migration:run
npm run seed                      # optional: the demo organization and logins
npm run dev:api                   # API on http://localhost:3000
npm run dev:web                   # web on http://localhost:5173
```

Or everything in containers, the same image as production:

```bash
docker compose up --build         # app on http://localhost:3000
```

### Tests

The tests need a database. Use a separate one, because they create data:

```bash
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/project_tracker_test
export DATABASE_SSL=false JWT_SECRET=test-secret JWT_EXPIRES_IN=7d COOKIE_SECRET=test-cookie-secret NODE_ENV=test
npm run migration:run
npm run test:e2e
```

### Migrations

```bash
npm run migration:generate -- AddSomething   # from entity changes
npm run migration:run                        # apply pending
npm run migration:revert                     # undo the newest
```

### Project structure

```
.
├── apps/
│   ├── api/                      # NestJS backend
│   │   ├── src/modules/          # auth, users, organizations, memberships, projects, tasks, health
│   │   ├── src/database/         # data source, migrations, seed
│   │   ├── test/                 # end-to-end tests
│   │   └── docker-entrypoint.sh  # migrate, then start
│   └── web/                      # React frontend
├── .github/workflows/ci-cd.yml   # the pipeline
├── Dockerfile                    # one image: API + built frontend
└── docker-compose.yml
```

### Environment variables

See `.env.example`. Real values are set in Render and in GitHub secrets. No `.env` file other than the example is committed.
