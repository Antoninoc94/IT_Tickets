# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Gestionale ticket IT interno aziendale (internal company IT ticketing system): Next.js 16 App Router + TypeScript,
Prisma 7 / PostgreSQL, self-contained session auth (no third-party auth provider), self-hosted (no external cloud
dependency). UI copy and emails are in Italian. `DOCUMENTAZIONE.md` is the authoritative, exhaustive feature/schema
reference kept up to date by the team — read it for "what does X do" questions; this file is about how the code is
put together and where the sharp edges are.

## Commands

```bash
npm run dev              # start dev server (localhost:3000)
npm run build            # production build
npm run start            # run a production build
npm run lint              # eslint (flat config, eslint-config-next)

npx prisma migrate dev --name <name>   # create + apply a migration after editing prisma/schema.prisma
npx prisma generate                     # regenerate the client into src/generated/prisma (run after schema/client changes)
npx prisma db seed                      # create the initial admin user (SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD in .env)

./deploy.sh               # on the server: git pull + docker compose down/build/up (migrations run automatically)
```

There is no test suite in this repo (no test files, no test runner configured) — don't invent test commands.

Prisma config lives in `prisma.config.ts` (Prisma 7 style — not the `package.json#prisma` key). The client is generated
to `src/generated/prisma` (a custom `output`, not `node_modules/.prisma`), so import types/enums from
`@/generated/prisma/client` / `@/generated/prisma/enums` — that directory is gitignored and must be regenerated after
cloning or after any `schema.prisma` change. `npx prisma generate` only needs `DATABASE_URL` to be *set*, not
reachable (see the Dockerfile builder stage, which uses a dummy one).

## Architecture

**Auth & session** — Custom JWT session cookie (`jose`, HS256, signed with `AUTH_SECRET`), no external auth library.
- `src/lib/session.ts`: encrypt/decrypt the cookie, `createSession`/`deleteSession`.
- `src/lib/dal.ts`: the choke point every server component/action goes through — `getCurrentUser()` (redirects to
  `/login`/signs out if session invalid or account inactive, `cache()`-wrapped) and `peekSession()` (same decode,
  never redirects — used on public pages like `/kb/[slug]` to vary a "back" link). There is no shared role-guard
  helper for server actions; each one does its own `if (user.role === "USER") ...` check inline — follow that
  existing pattern rather than introducing a new abstraction.
- `src/proxy.ts` is this app's middleware (Next's `middleware.ts` convention was renamed to `proxy.ts` in this
  Next.js version — see AGENTS.md). `PUBLIC_PREFIXES` there (and mirrored conceptually by route-group placement, e.g.
  `src/app/kb/` living *outside* `src/app/(app)/`) is the actual authority on what's reachable without a session —
  it also holds session inactivity timeout/refresh logic. It does not decode roles for authorization; that's always
  done in the DAL/actions.
- Roles (`Role` enum): `ADMIN` (superset of IT + user/settings/branding/SLA/danger-zone management), `IT` (manage all
  tickets, categories, tags, templates, canned responses, KB), `USER` (own tickets only). Nav links are hidden by
  role in `src/app/(app)/layout.tsx` but that's cosmetic — every route/action re-checks the role itself.
- **Login lockout**: 5 failed attempts locks the account for 15 minutes (`User.failedLoginAttempts`/`lockedUntil`,
  enforced in `src/app/actions/auth.ts`). Once locked, a correct password does **not** bypass the lock — that's by
  design. Admins can see "Bloccato" and unlock from `/admin/users` (`unlockUserLogin` in `src/app/actions/users.ts`).
  Self-registration's 6-digit email code has the same shape of protection (`User.verificationAttempts`, max 5
  guesses before a fresh code is required).

**Data layer** — `src/lib/prisma.ts` wraps `PrismaClient` with the `@prisma/adapter-pg` driver adapter and the
standard dev-mode `globalThis` singleton to survive HMR.

**Server actions, not API routes** — Mutations live in `src/app/actions/*.ts` (`"use server"`), one file per domain
(`tickets`, `users`, `auth`, `register`, `account`, `tags`, `categories`, `custom-fields`, `templates`,
`canned-responses`, `kb`, `settings`, `attachments`), validated with Zod v4 (note the `{ error: "..." }` option, not
`message`), calling `revalidatePath`/`redirect` directly. Actual API routes are for things a `<form action>` can't do:
file serving (`api/attachments/[id]`, `api/branding/*`), CSV export, the unread-count poll, and the two `x-cron-secret`
protected cron endpoints (`api/cron/reminders`, `api/cron/digest`, called by the `cron` service in
`docker-compose.yml`).

**Tickets** — `Ticket.status` runs `OPEN → IN_PROGRESS → WAITING_ON_USER → RESOLVED → CLOSED`; `category` is now a
**dynamic** `Category` model (not an enum) that IT/Admin manage, each with its own ordered `CustomField`s (text/
textarea/number/select) whose values live in `TicketFieldValue`. Assigning a ticket auto-starts it (`OPEN` →
`IN_PROGRESS`) without overriding a status a human deliberately set (`assignTicket` in `src/app/actions/tickets.ts`).
Every state-changing action also writes a `TicketEvent` (`actorId: null` renders as "Sistema" — used by the cron
auto-close) for the history panel. Close/reopen require a typed reason (≥5 chars), which is also stored as a public
comment. Tickets can be linked parent/child (`parentTicketId`, "ticket correlato") or merged (`mergedIntoId`, closes
the duplicate). Comments have an `internal` flag (staff-only); `@Name` mentions are detected by literal substring
match against active users' names (`src/lib/render-mentions.tsx`, plain React nodes — not HTML injection) and trigger
a notification email.

**Settings** — Singleton `Setting` row (`id = "app"`), lazily created by `getSettings()` in `src/lib/settings.ts`
(`cache()`-wrapped). Holds branding, SLA thresholds/business-hours config, the email provider switch, and one
subject+body template pair per notification type; `renderTemplate()` does `{{var}}` substitution only — no engine.

**Email** — `src/lib/mail.ts` picks SMTP (`nodemailer`) or Microsoft Graph API (`settings.emailProvider`) per send,
swallowing/logging errors so a mail outage never blocks a ticket action. `src/lib/email-html.ts` builds the branded
HTML part and **HTML-escapes user content** (`esc()`) before interpolating it — do not bypass this when adding a new
email that includes ticket titles/comment bodies/names. Every notification also checks `settings.emailEnabled` first.

**SLA** (`src/lib/sla.ts`) — per-priority hour thresholds from `Setting`, computed either wall-clock or, when
`slaBusinessHours` is on, only counting configured work days/hours (UTC — see the timezone note in
`DOCUMENTAZIONE.md` §10 before touching this). Returns `ok`/`warning` (≤20% time left)/`overdue`/`none`; closed/
resolved tickets never show a badge.

**Cron** — a separate `cron` container (see `docker-compose.yml`) hits `/api/cron/reminders` and `/api/cron/digest`
daily with the `x-cron-secret` header matched against `CRON_SECRET`. `reminders` does two unrelated things in one
request: stale-ticket nudges to assignees, and auto-closing `RESOLVED` tickets past `autoCloseDays`.

**File attachments** — Stored on disk under `UPLOADS_DIR` (Docker volume in prod), keyed by a random `storageKey`
(never the user filename) — see `src/lib/attachments.ts` for the MIME allowlist/size cap. `Attachment` rows only
store metadata; bytes are served through `src/app/api/attachments/[id]/route.ts`, which must independently deny
access to attachments on `internal` comments even when the requester owns the ticket (this got missed once — check
it stays in sync with the visibility logic in `tickets/[id]/page.tsx` if either changes).

**Knowledge Base** — `/kb` and `/kb/[slug]` are unauthenticated public routes (listed in `proxy.ts`'s
`PUBLIC_PREFIXES`, gated only by `settings.kbEnabled`). Article bodies are Markdown rendered with `marked.parse()`
straight into `dangerouslySetInnerHTML` (`src/app/kb/[slug]/page.tsx`, and the admin preview in
`admin/kb/markdown-editor.tsx`) — **there is no HTML sanitization step**, so anyone who can author a KB article
(IT or Admin) can inject arbitrary HTML/JS that runs for every visitor of that public page. Treat KB authoring as a
privileged, staff-only-content surface, not user-generated content, until this gets a sanitizer (e.g. `dompurify`).

**CSV export** (`src/app/api/tickets/export/route.ts`) quotes fields but does not neutralize leading `=`/`+`/`-`/`@`
in user-controlled values (ticket title/description, custom field values) before Excel/Sheets opens them — classic
CSV/formula-injection surface. Keep this in mind if asked to hunt for injection bugs here.

**Routing** — `src/app/(app)/` is the authenticated shell (nav header, role-based links); everything under it assumes
a session (enforced by `proxy.ts` + the group's `layout.tsx`, which also force-redirects to `/change-password` when
`mustChangePassword` is set). `/login`, `/register(/verify)`, `/change-password`, `/guida`, and `/kb*` sit outside
that group and are the public-route set.

## Deployment

Docker multi-stage build (`Dockerfile`): `deps` → `builder` (`prisma generate` with a dummy `DATABASE_URL`, then
`next build`, `output: "standalone"`) → `runner` (non-root `nextjs` user). `docker-compose.yml` runs `postgres`, a
one-shot `migrate` service (`prisma migrate deploy`) that must complete before `app` starts, `app` itself, and a
`cron` container for the daily jobs. `./deploy.sh` on the server does `git pull` + `docker compose down/build/up` in
one shot — migrations apply automatically on the next `up`. See `docs/deploy.md` and `DOCUMENTAZIONE.md` §6–7 for the
full env var list and NPM reverse-proxy setup.
