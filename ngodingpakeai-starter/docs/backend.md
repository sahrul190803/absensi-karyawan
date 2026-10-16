# Backend standard

The Requests API (izin, sakit, cuti, dinas luar, lembur, tukar shift) is a small, working reference backend. It saves real PostgreSQL rows and uses the existing Better Auth accounts. It has no seeded users, mock sessions, or fabricated responses. Use the same structure for new features.

```text
HTTP request
  → src/app/api/requests/route.ts or requests/[id]/route.ts
  → withApiSession: Better Auth session and mutation origin check
  → src/validators/requests.ts: validate JSON, parameters, and query strings
  → src/services/requests.service.ts: domain operations and Drizzle queries
  → src/db/schema/request.ts: PostgreSQL table
```

## Responsibilities

- **Routes** own HTTP: authenticate, parse/validate, call a service, and choose response status. Application routes do not query Drizzle or PostgreSQL directly.
- **Services** own application rules and database queries. They receive the verified session's user ID as a separate argument. Every user-owned read, update, and delete filters by it in SQL. Updates/deletes use one scoped statement, avoiding a separate ownership check that could race. Services never accept a request, return a Response, redirect, or read cookies.
- **Validators** define allowed input and inferred TypeScript types. Strict schemas reject unknown fields, including submitted owner IDs. PATCH requires at least one editable field. Database IDs and query parameters are validated before queries.
- **Schemas** define tables, indexes, defaults, and relationships. Each table has its own file; `src/db/schema/index.ts` exports them all for Drizzle Kit, the pool, and Better Auth. Table files import dependencies directly from sibling files, avoiding circular barrel imports.
- **Shared HTTP helpers** in `src/lib/api.ts` provide session checks, JSON parsing, errors, and private response caching. Better Auth's own `/api/auth/*` handler stays delegated to Better Auth and its Drizzle adapter.

Authenticate every entrypoint before calling a service. `withApiSession` performs an authoritative Better Auth lookup and returns JSON 401 for an absent, expired, or revoked session. A protected layout is not API authorization. If a Server Component needs a service, first call `requireSession()` there; browser operations use API routes. Do not put SQL into a page or introduce a parallel Server Action mutation flow for ordinary app features.

## Requests endpoints

| Method | Path                              | Result                                                  |
| ------ | --------------------------------- | ------------------------------------------------------- |
| GET    | `/api/requests?limit=20&offset=0` | 200, current user's requests and pagination metadata    |
| POST   | `/api/requests`                   | 201, creates a request for the signed-in account        |
| PATCH  | `/api/requests/:id`               | 200, cancels a pending own request                      |
| GET    | `/api/requests/:id/attachment`    | 200, streams the own attachment file                    |

All endpoints require the Better Auth session cookie. POST/PATCH accept `Content-Type: application/json`. Every mutation, including DELETE, requires an `Origin` header matching `BETTER_AUTH_URL`; browsers send it for same-origin fetches. Command-line clients must set it explicitly. Cross-site mutations are rejected even with a valid cookie. Better Auth's CSRF checks cover its own endpoints; the helper protects these application endpoints separately.

Create input: `{ "type": "leave", "startDate": "2026-10-12", "endDate": "2026-10-14", "reason": "Cuti tahunan" }`. `type` is one of `permission`, `sick`, `leave`, `business_trip`, `overtime`, `shift_swap`. `overtime` additionally requires `startTime` and `endTime` (`HH:MM`). The reason is trimmed and must contain 3–1000 characters. Attachments are optional data URLs (JPEG/PNG/WEBP/PDF, maks 3 MB tersimpan). IDs are UUIDs. List `limit` is 1–100 (default 50); `offset` is 0–1,000,000 (default 0). Results sort newest first. Offset pagination is deliberately simple for this example; concurrent writes can shift pages.

Single-item responses wrap the row in `data`. Each row contains `id`, `type`, `startDate`, `endDate`, `startTime`, `endTime`, `reason`, `attachmentUrl`, `status`, `approvedBy`, `decidedAt`, `decisionNote`, `createdAt`, and `updatedAt`; timestamps serialize as ISO strings. Lists return `{ "data": [...], "meta": { "limit", "offset", "hasMore" } }`. Owner IDs and auth records stay server-side.

Errors use `{ "error": { "code": "...", "message": "..." } }`, with field `details` for validation errors. Statuses are 400 for malformed JSON, 401 for missing/invalid sessions, 403 for rejected origins, 404 for missing or unowned records, 415 for unsupported content types, 422 for invalid input, and 500 for unexpected failures. Missing and unowned records have identical responses. Database exceptions and private values are not returned. Application API responses use `Cache-Control: private, no-store`.

## Role-based access

Ownership answers "is this row mine?". Roles answer "may this account reach past its own rows?". The app ships a worked example of the second question using the Better Auth admin plugin.

```text
src/lib/permissions.ts   statement (resources → actions) and roles built from it
src/lib/auth.ts          admin({ ac, roles, defaultRole, adminRoles })
src/lib/auth-client.ts   adminClient({ ac, roles }) for UI-only checks
src/lib/session.ts       requirePermission / hasPermission for pages
src/lib/api.ts           withApiPermission for API routes
```

A statement lists every resource and the actions it allows. A role is a subset. Name actions for the extra reach they grant, because owners already reach their own rows through the session:

```ts
export const statement = {
  ...defaultStatements, // Better Auth's own user and session management
  requests: ["read-any", "approve"],
  trainings: ["read-any", "create", "update", "delete"],
} as const;

export const ac = createAccessControl(statement);

export const roles = {
  user: ac.newRole({ requests: [], trainings: [] }),
  hrd: ac.newRole({ requests: ["read-any", "approve"], trainings: ["read-any", "create", "update", "delete"] }),
};
```

Roles live in `user.role` as a string; a comma-separated list such as `hrd,admin` grants the union. Signup cannot set it — the column is `input: false` — so an account can never promote itself. Every new account gets `defaultRole`.

Grant a role to an existing account:

```sh
npm run role:set -- someone@example.com hrd
```

Guard the server, in both places:

```ts
// API route: 401 without a session, 403 without the permission.
export function GET(request: Request) {
  return withApiPermission(request, { requests: ["read-any"] }, async () =>
    Response.json(await listAnyRequests({ limit: 20, offset: 0 })),
  );
}

// Page or Server Action: renders not-found, so the route stays invisible.
const { user } = await requirePermission({ requests: ["read-any"] });
```

Both helpers read the stored role, so revoking a role takes effect on the next request rather than when the session expires. Hiding a link with `hasPermission` or the client's `authClient.admin.checkRolePermission` is presentation only; it never replaces the server check.

| Method | Path                            | Result                                              |
| ------ | ------------------------------- | --------------------------------------------------- |
| GET    | `/api/admin/requests?status=pending` | 200, every account's requests plus employee data |
| PATCH  | `/api/admin/requests/:id`       | 200, approve or reject a request (admin note)       |

Cross-account service functions carry an `Any` suffix (`listAnyRequests`, `decideAnyRequest`) because they deliberately skip the ownership filter. They are only safe behind a permission check — never call them from a handler that merely has a session. Ordinary `listOwnRequests`/`cancelOwnRequest` stay scoped to the session user even for an admin, so `/admin` and `/app` show different things to the same person.

The admin plugin also adds `banned`, `banReason`, `banExpires`, and `session.impersonatedBy`, plus its own `/api/auth/admin/*` endpoints for user management. Those are guarded by the `user` and `session` actions in `defaultStatements`, which only the `admin` role holds here.

## Try it

Start the app and create an account or sign in. In that app tab's browser console:

```js
const response = await fetch("/api/requests", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    type: "permission",
    startDate: "2026-10-20",
    reason: "Keperluan keluarga",
  }),
});
const result = await response.json();
console.log(result);

await fetch("/api/requests").then((response) => response.json());
```

The browser sends your existing session cookie and origin. Visiting `/api/requests` while signed out returns 401. Approvals live at `/admin/izin-cuti`; the employee side at `/app/pengajuan`.

## Extend it

1. Create a table file under `src/db/schema/` and export it from `index.ts`. Leave existing auth table names and fields unchanged.
2. Define strict input schemas under `src/validators/`.
3. Add a server-only `*.service.ts` under `src/services/` with all domain queries. Require the authenticated user ID for user-owned operations.
4. Add thin API route handlers using `withApiSession`, or `withApiPermission` when the endpoint reaches past the caller's own rows, then call them from the frontend.
5. Generate a new migration with `npm run db:generate`, inspect it, and apply with `npm run db:migrate`. Keep SQL and metadata together; do not edit applied migrations.
6. Run `npm run check`, `npm run build`, and `npm run test:e2e`. Add tests for CRUD, rejected input, anonymous access, and cross-account isolation — see `e2e/roles.spec.ts` and `e2e/attendance.spec.ts`. Tests use their own disposable PostgreSQL server.

The Requests module is replaceable example functionality. If you remove a module from a project that has already migrated, remove its routes/service/validator/schema export and generate a new reviewed migration. Do not delete or rewrite historical migrations, or drop saved rows without authorization.
