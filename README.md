# StudyReel

A study-gated streaming platform. Learners work through a professional IT
curriculum, and screen time is something they earn: finish a chapter, pass its
exam at the published pass mark, and the platform grants a **timed viewing
session** that closes itself when the minutes run out — at which point the next
chapter unlocks and the cycle repeats.

```
apply → admitted → account → study chapter → exam ≥ pass mark
                                   ↑                    ↓
                          next chapter unlocks ← timed viewing session
```

---

## What it does

| Capability | How it works |
|---|---|
| **Application and admission** | A prospective learner applies with a track, level, and weekly commitment. Applications meeting the published criteria are admitted automatically with a one-time access code; the rest are held for a human reviewer. |
| **Account creation** | Registration is closed to the public — only an approved access code creates an account. New accounts are auto-enrolled in their track's entry course and given a starting study schedule. |
| **Study gate** | A chapter's exam stays locked until a minimum dwell time has actually elapsed. The clock is recorded server-side, so reloading or closing the tab does not shorten it. |
| **Exams** | Each chapter carries a question bank, presented in a shuffled order inside a fixed time window. Answers are graded on the server; the client never receives a correct answer before submission. Repeated failures trigger a cool-down that pushes the learner back to the material. |
| **Timed viewing reward** | Passing grants a reward session worth the chapter's reward minutes. The expiry is fixed when the learner picks a film and is never extended. Every read of the session re-checks it, so an elapsed entitlement cannot be resumed. |
| **Automatic progression** | However a session ends — expiry, ending it early, or forfeiting it — the chapter is marked complete and the next one opens in the same transaction. |
| **Schedule with alerts** | Weekly study blocks in the learner's own IANA time zone, correct across daylight-saving changes. The server decides which occurrences are due; the client polls and raises an in-app reminder, plus a desktop notification where permitted. |
| **Free-time viewing** | Browsing outside a session, a learner can **save a title for later** or **decline** it. Declined titles stop appearing in recommendations. |
| **Top movies** | Titles are aggregated from free sources and ranked by popularity, with declined titles filtered out per learner. |

---

## Course catalog

Eight IT courses, 32 chapters, 160 exam questions, across three levels.

| Level | Courses |
|---|---|
| **Beginner** | IT Systems Foundations · Web Development Foundations · Linux Command Line Essentials |
| **Intermediate** | Relational Databases and SQL · Backend APIs with Node.js · Git and CI/CD Workflows |
| **Advanced** | Cloud Architecture and Scalability · Applied Cybersecurity Defence |

Each chapter carries its own pass mark (70–80%) and reward value (30–35 minutes).
Content lives in `server/src/db/content/courses/` as typed data, and the seeder is
idempotent — edit a lesson, re-run `npm run seed`, and existing rows are updated
rather than duplicated.

---

## Where the films come from

Titles are sourced from collections that are **free to watch and free to link
to**, not from unlicensed streaming sites:

1. **Internet Archive** (`feature_films`, `film_noir`, `classic_cartoons`,
   `silent_films`) — public-domain and freely redistributable features, with an
   open API that needs no key. This is the primary provider and the one that
   yields playable embeds.
2. **TMDB** *(optional)* — metadata, artwork, and popularity ranking. Enabled by
   setting `TMDB_API_KEY`. It is a metadata source, not a stream source.
3. **Bundled catalogue** — 30 curated public-domain films shipped with the
   application, so the rails are never empty when a provider is unreachable.

Results are merged, de-duplicated across providers (preferring the playable
copy), ranked, and cached in SQLite. A provider failing is reported in the
response rather than thrown, and the UI shows each source's live status.

> **Note on this environment:** the session this was built in blocks outbound
> requests to `archive.org` and `api.themoviedb.org` at the network policy, so
> the live provider calls could not be exercised here. The providers are
> implemented against their documented APIs, and the application degrades
> cleanly to the bundled catalogue — which is what the screenshots show. Run it
> somewhere with open egress to see live Archive results.

---

## Running it

```bash
npm install
cp .env.example .env      # set DATABASE_URL to your Postgres instance
npm run db:setup          # apply the schema, then seed the catalog
npm run dev               # API on :4000, client on :5173
```

Open http://localhost:5173, apply, and the flow runs end to end.

To watch the whole cycle quickly, drop the study gate:

```bash
MIN_STUDY_SECONDS=10 npm run dev
```

### Other commands

```bash
npm run build       # typecheck + build both workspaces
npm run start       # run the built API
npm run migrate     # apply the schema (idempotent)
npm run seed        # re-seed the catalog (idempotent)
npm run typecheck   # strict typecheck, server and client
```

## Deployment

The repository deploys to Vercel as a single project: the Vite bundle is served
statically and the Express application runs as a serverless function behind
`/api/**`, so both halves share one origin and there is no CORS to configure.

`vercel-build` compiles the server, applies the schema, seeds the catalog, then
builds the client — so a deployment always lands with its content in sync.

Required environment variables:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Postgres connection string. Use a **pooled** endpoint on serverless. |
| `JWT_ACCESS_SECRET` | 32+ random bytes, hex. Required in production. |
| `JWT_REFRESH_SECRET` | As above, and different from the access secret. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seeded administrator. Change before going live. |
| `TMDB_API_KEY` | Optional; enables the TMDB metadata provider. |

`DATABASE_POOL_MAX` defaults to 1 when `VERCEL` is set, because each serverless
instance holds its own pool and the database's connection budget is shared.

A seeded administrator account is created on first run from `ADMIN_EMAIL` /
`ADMIN_PASSWORD`. **Change the password before deploying anywhere real.**

---

## Architecture

```
server/                     Express + TypeScript + PostgreSQL (node-postgres)
  src/config.ts             Validated configuration; fails fast in production
  src/db/index.ts           Async pool, `?` placeholder translation, transactions
  src/db/schema.sql         Full schema with foreign keys and check constraints
  src/db/content/courses/   Course content as typed data
  src/services/
    admissions.ts           Application screening, access codes, track routing
    auth.ts                 Registration, login, refresh-token rotation
    progression.ts          Study gate, exam grading, reward granting
    rewards.ts              Session lifecycle, expiry, chapter unlocking
    schedule.ts             Weekly occurrences and due-alert computation
    movies/                 Provider layer, cache, per-learner decisions
  src/routes/               HTTP surface, one router per domain

client/                     React 18 + Vite + TypeScript + Tailwind
  src/lib/api.ts            Fetch wrapper with single-flight token refresh
  src/lib/markdown.tsx      Lesson renderer (no dangerouslySetInnerHTML)
  src/context/              Auth session, schedule alert polling
  src/components/           Layouts, hand-drawn icon set, shared UI
  src/pages/                Landing, admissions, and the learner application
```

### Design decisions worth knowing

**Every gate is server-side.** Study dwell time, exam grading, the retry
cool-down, and the viewing clock are all enforced in the API. The client's
countdowns are display only, and reconcile with the server every 15 seconds
during a viewing session.

**Transactions survive helper nesting.** The Postgres client for an open
transaction is held in `AsyncLocalStorage`, so nested service calls join it
automatically rather than needing a client threaded through every signature.

**Reward sessions expire lazily but reliably.** Rather than a background job,
every read of a session checks its expiry first and concludes it if the window
has passed — so an entitlement is never resumable after its time, even if the
client stopped polling entirely.

**Progression is transactional.** Marking a chapter complete and unlocking the
next one happen in one SQLite transaction, so a crash mid-way cannot leave a
learner with both chapters locked.

**Refresh tokens rotate.** Access tokens are short-lived and stateless; refresh
tokens are stored hashed, single-use, and revoked on password change. The API
client refreshes at most once concurrently, so a burst of parallel 401s produces
one refresh rather than several.

**Schedules are wall-clock.** A learner who blocks out 19:00 on Tuesdays means
19:00 wherever they are, so occurrences are resolved from an IANA zone rather
than a stored UTC offset.

**No emoji, no assistant iconography.** The interface uses a hand-built
line-art SVG icon set (`client/src/components/Icon.tsx`). There are no emoji
characters in the product, and no sparkle, wand, robot, or similar motifs.

---

## API surface

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/applications` | Submit an application; screened on arrival |
| `GET` | `/api/applications/status` | Look up by reference or email |
| `POST` | `/api/auth/register` | Redeem an access code and create the account |
| `POST` | `/api/auth/login` · `/refresh` · `/logout` | Session lifecycle |
| `GET` | `/api/learning/courses` · `/courses/:slug` | Catalog, with progress when signed in |
| `POST` | `/api/learning/courses/:slug/enroll` | Enroll and initialise chapter progress |
| `GET` | `/api/learning/chapters/:id` | Chapter content, if unlocked |
| `POST` | `/api/learning/chapters/:id/study/start` · `/complete` | The study gate |
| `POST` | `/api/learning/chapters/:id/exam` | Open an attempt |
| `POST` | `/api/learning/exams/:id/submit` | Grade, and grant the reward on a pass |
| `GET` | `/api/rewards/active` · `/:id` | Read a session, expiring it if due |
| `POST` | `/api/rewards/:id/start` · `/end` | Pin a film and start, or close early |
| `GET` | `/api/movies` | Aggregated, personalised catalog |
| `POST` | `/api/movies/:id/decision` | Watch later, decline, or watched |
| `GET` | `/api/schedule` · `/alerts` | Weekly sessions and due reminders |
| `GET` | `/api/dashboard` | Everything the home screen needs, in one call |
| `GET` | `/api/health` · `/api/ready` | Liveness and readiness |

---

## Security notes

- Passwords are hashed with bcrypt at a configurable cost; the login path does
  equivalent work whether or not the account exists.
- Every query is parameterised. No SQL is built by string concatenation.
- Request bodies are validated against explicit Zod schemas at the boundary;
  no request body is spread into a database write.
- Object-level authorisation is checked on every reward session, exam attempt,
  and schedule entry — being signed in is never sufficient on its own.
- Lesson and exam content is rendered as React elements, never through
  `dangerouslySetInnerHTML`.
- Rate limits apply globally, and more tightly on authentication and application
  submission.
- Secrets are read from the environment and validated at startup; the server
  refuses to boot in production without them.
