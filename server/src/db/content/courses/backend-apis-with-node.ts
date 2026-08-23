import type { SeedCourse } from '../types.js';

export const backendApisWithNode: SeedCourse = {
  slug: 'backend-apis-with-node',
  title: 'Backend APIs with Node.js',
  summary: 'Design, secure, and operate HTTP services that behave correctly under real traffic.',
  description:
    'Move from writing endpoints to engineering services. This course covers HTTP semantics and REST design, the Node.js concurrency model, authentication and authorisation done properly, input validation, error handling, and the observability that makes a service supportable in production.',
  category: 'Software Engineering',
  level: 'INTERMEDIATE',
  durationHours: 12,
  accent: 'cyan',
  outcomes: [
    'Design REST resources with correct methods, status codes, and idempotency',
    'Reason about the Node.js event loop and avoid blocking it',
    'Implement token-based authentication and role-based authorisation safely',
    'Instrument a service with structured logs, health checks, and graceful shutdown',
  ],
  prerequisites: ['Web Development Foundations', 'Relational Databases and SQL'],
  chapters: [
    {
      title: 'HTTP Semantics and REST Design',
      summary: 'Methods, status codes, idempotency, versioning, and resource modelling.',
      estimatedMinutes: 35,
      passMark: 75,
      rewardMinutes: 30,
      content: `## Methods carry contracts

HTTP methods are not interchangeable labels; each promises something to clients, proxies, and caches.

- \`GET\` — **safe** and **idempotent**. No observable side effects. Cacheable. Never place a state change behind a GET, because a crawler or a prefetching browser will trigger it.
- \`POST\` — creates a subordinate resource or triggers a process. Not idempotent: sending it twice creates two things.
- \`PUT\` — replaces a resource wholesale at a client-chosen URI. **Idempotent**: the same request repeated leaves the same state.
- \`PATCH\` — partial modification. Idempotent only if you design it that way.
- \`DELETE\` — removes the resource. Idempotent: deleting twice leaves it deleted.

Idempotency is what makes retries safe. A mobile client that loses its connection mid-request cannot know whether the server received it. With an idempotent method it simply retries. With \`POST\`, it needs an **idempotency key** — a client-generated identifier the server records so a repeat is recognised and the original response replayed.

## Status codes that mean something

- **200** OK, **201** Created (with a \`Location\` header), **204** No Content for a successful delete.
- **400** malformed request, **401** not authenticated, **403** authenticated but not permitted, **404** not found, **409** conflict with current state, **422** semantically invalid, **429** rate limited.
- **500** the server broke, **503** temporarily unavailable.

The 401/403 distinction matters operationally: 401 means *sign in*, 403 means *signing in again will not help*. Returning 200 with \`{"error": ...}\` in the body defeats every generic retry, monitor, and cache in the path.

## Resource modelling

URLs name nouns; methods supply the verbs. \`POST /courses/42/enrollments\` rather than \`POST /createEnrollment?course=42\`. Collections are plural, nesting reflects genuine ownership, and nesting more than two levels deep is a sign the child deserves a top-level route.

## Versioning and pagination

Version at the path (\`/api/v1/...\`) or by media type, and never change the meaning of an existing field — add a new one and deprecate the old. Always paginate collections. Offset pagination (\`?page=3&limit=20\`) is simple but drifts when rows are inserted mid-traversal; **cursor pagination**, which passes an opaque pointer to the last item seen, is stable and performs better on large tables.`,
      questions: [
        {
          prompt: 'Which HTTP method is safe and must have no observable side effects?',
          options: ['POST', 'GET', 'PATCH', 'DELETE'],
          correctIndex: 1,
          explanation: 'GET is defined as safe, so prefetchers and crawlers may issue it freely.',
        },
        {
          prompt: 'A client retries a POST after a network timeout. How do you prevent a duplicate resource?',
          options: [
            'Convert the endpoint to GET',
            'Accept a client-supplied idempotency key and replay the original response on repeat',
            'Return 500 on the second request',
            'Rely on the database primary key to reject it',
          ],
          correctIndex: 1,
          explanation: 'POST is not idempotent, so an idempotency key lets the server recognise and deduplicate a retry.',
        },
        {
          prompt: 'What distinguishes 401 from 403?',
          options: [
            '401 means the resource is missing; 403 means it moved',
            '401 means not authenticated; 403 means authenticated but not permitted',
            'They are equivalent and interchangeable',
            '401 is for APIs and 403 is for web pages',
          ],
          correctIndex: 1,
          explanation: '401 invites re-authentication; 403 signals that further credentials will not help.',
        },
        {
          prompt: 'Which URL best follows REST resource modelling?',
          options: [
            'POST /createEnrollment?course=42',
            'GET /deleteCourse/42',
            'POST /courses/42/enrollments',
            'POST /api/doAction',
          ],
          correctIndex: 2,
          explanation: 'URLs name resources and HTTP methods supply the action.',
        },
        {
          prompt: 'Why is cursor pagination preferred over offset pagination on large, actively written tables?',
          options: [
            'It returns more rows per request',
            'It is stable when rows are inserted mid-traversal and avoids large offset scans',
            'It removes the need for an index',
            'It allows random access to any page',
          ],
          correctIndex: 1,
          explanation: 'Offsets shift when rows are inserted and force the engine to skip rows; a cursor anchors to the last item seen.',
        },
      ],
    },
    {
      title: 'The Node.js Runtime and Concurrency Model',
      summary: 'The event loop, blocking work, streams, and error propagation in async code.',
      estimatedMinutes: 35,
      passMark: 75,
      rewardMinutes: 30,
      content: `## One thread, many connections

Node.js runs your JavaScript on a single thread. It achieves high concurrency not by threading requests but by never waiting: I/O is delegated to the platform, and a callback is queued when the operation completes. This is excellent for I/O-bound services — thousands of connections, each mostly idle — and poor for CPU-bound work.

The consequence is absolute: **any synchronous work blocks every connection**. A 200-millisecond synchronous loop does not slow one request by 200 ms; it stalls the entire process for 200 ms. Typical culprits are \`JSON.parse\` on very large payloads, synchronous filesystem calls, bcrypt at a high cost factor, and image processing.

The fixes are to move CPU-heavy work to a **worker thread**, delegate it to a queue consumed by a separate process, or use the async variant of the API. Never use \`readFileSync\` on a request path.

## Phases and ordering

The event loop passes through phases — timers, pending callbacks, poll, check, close. \`setImmediate\` schedules into the check phase, \`setTimeout(fn, 0)\` into the next timers phase. Between every callback, the **microtask queue** — promise continuations and \`queueMicrotask\` — is drained completely. A promise chain therefore always resolves before a pending timer, and an infinite microtask loop starves the loop permanently.

## Streams

Reading a 2 GB file into a buffer to send it uses 2 GB of memory per concurrent request. Streams process data in chunks with bounded memory:

\`\`\`js
import { pipeline } from 'node:stream/promises';
await pipeline(createReadStream(source), createGzip(), response);
\`\`\`

\`pipeline\` propagates errors and destroys every stream in the chain on failure, which manual \`.pipe()\` chaining does not. Backpressure — the consumer telling the producer to slow down — is handled automatically.

## Errors in async code

An exception thrown inside an async function rejects its promise. If nothing awaits or catches it, Node reports an unhandled rejection and, in current versions, terminates the process. Three rules:

1. Wrap async route handlers so rejections reach your error middleware — Express 4 does not catch them for you.
2. Never write \`async\` callbacks for APIs that expect a synchronous return; the rejection has nowhere to go.
3. Treat \`uncaughtException\` and \`unhandledRejection\` handlers as a place to log and exit, not to continue. After an unknown error the process state is untrustworthy; let the supervisor restart it.`,
      questions: [
        {
          prompt: 'Why does a 200 ms synchronous loop in a Node service matter so much?',
          options: [
            'It slows only the request that triggered it',
            'It blocks the single thread, stalling every connection for 200 ms',
            'It forces a garbage collection cycle',
            'It causes the event loop to drop queued timers',
          ],
          correctIndex: 1,
          explanation: 'All requests share one thread, so synchronous work halts the whole process.',
        },
        {
          prompt: 'A route must resize uploaded images, which is CPU-bound. What is the appropriate design?',
          options: [
            'Do it inline; Node handles concurrency automatically',
            'Move the work to a worker thread or an out-of-process job queue',
            'Wrap it in a promise so it becomes non-blocking',
            'Increase the HTTP server timeout',
          ],
          correctIndex: 1,
          explanation: 'Wrapping CPU work in a promise does not make it non-blocking; it must leave the main thread.',
        },
        {
          prompt: 'A resolved promise callback and a setTimeout(fn, 0) are both pending. Which runs first?',
          options: [
            'The setTimeout callback, because zero milliseconds have elapsed',
            'The promise callback, because microtasks drain before the loop advances',
            'They run simultaneously on separate threads',
            'Ordering is non-deterministic',
          ],
          correctIndex: 1,
          explanation: 'The microtask queue is drained fully between event loop callbacks, ahead of timer phases.',
        },
        {
          prompt: 'Why prefer stream.pipeline over chaining .pipe() calls manually?',
          options: [
            'pipeline is faster at copying bytes',
            'pipeline propagates errors and destroys every stream in the chain on failure',
            'pipeline removes the need for backpressure',
            '.pipe() is deprecated and removed',
          ],
          correctIndex: 1,
          explanation: 'Manual .pipe() chains leak resources on error; pipeline cleans up the whole chain.',
        },
        {
          prompt: 'What is the correct response to an unhandledRejection in production?',
          options: [
            'Log it and continue serving requests',
            'Log it, shut down gracefully, and let the supervisor restart the process',
            'Silently ignore it to preserve uptime',
            'Retry the failed operation indefinitely',
          ],
          correctIndex: 1,
          explanation: 'After an unknown failure the process state is untrustworthy, so a controlled restart is safer than continuing.',
        },
      ],
    },
    {
      title: 'Authentication, Authorisation, and Input Safety',
      summary: 'Password storage, JWT and session trade-offs, RBAC, and validating untrusted input.',
      estimatedMinutes: 40,
      passMark: 80,
      rewardMinutes: 30,
      content: `## Storing passwords

Never store a password, and never hash one with a fast algorithm. SHA-256 is designed to be fast, which is exactly wrong here: a GPU tests billions of SHA-256 candidates per second. Use a **deliberately slow, salted** function — bcrypt, scrypt, or Argon2id — with a cost factor tuned so a single hash takes roughly 100–250 ms on your hardware.

These algorithms generate a unique random **salt** per password and embed it in the output, which defeats rainbow tables and ensures two users with the same password produce different hashes.

Compare with a **constant-time** comparison. A naive \`===\` on secrets leaks information through timing: it returns faster when the first byte differs.

## Sessions versus tokens

**Server-side sessions** store state in a shared store and hand the client an opaque cookie identifier. Revocation is immediate — delete the record. The cost is a lookup per request and shared state between instances.

**JWTs** are self-contained and signed, so any instance can validate one without a lookup. The cost is that a JWT is valid until it expires and **cannot be revoked**. The standard resolution is a short-lived access token (minutes) plus a long-lived refresh token that *is* stored server-side and can be revoked. That is the design this platform uses.

Three JWT rules that are non-negotiable: verify the signature with an explicit expected algorithm (never trust the token's own \`alg\` header, which enables the \`alg: none\` attack), always check expiry, and never put anything secret in the payload — it is base64, not encrypted.

## Cookies

If tokens live in cookies, set \`HttpOnly\` so JavaScript cannot read them, \`Secure\` so they travel only over TLS, and \`SameSite=Lax\` or \`Strict\` to blunt cross-site request forgery. Any state-changing endpoint that relies on cookie authentication also needs a CSRF token.

## Authorisation is not authentication

Authentication establishes *who*; authorisation decides *what they may do*. Check ownership on every object access. An endpoint that trusts \`GET /enrollments/:id\` because the caller is signed in — without confirming that the enrolment belongs to that caller — is an **insecure direct object reference**, and it is among the most commonly exploited API flaws.

## Validating input

Validate every input at the boundary against an explicit schema — types, ranges, lengths, allowed values — and reject rather than coerce. Two specific defences follow:

- **SQL injection**: use parameterised queries. String concatenation into SQL is never acceptable, no matter how the value was validated.
- **Mass assignment**: never spread a request body straight into a database update. Pick fields explicitly, or a client will set \`role: "ADMIN"\` on itself.`,
      questions: [
        {
          prompt: 'Why is SHA-256 unsuitable for password storage?',
          options: [
            'It produces hashes that are too short',
            'It is designed to be fast, so an attacker can test billions of candidates per second',
            'It cannot handle non-ASCII characters',
            'It requires a separate salt table',
          ],
          correctIndex: 1,
          explanation: 'Password hashing must be deliberately slow; bcrypt, scrypt, and Argon2id are built for that.',
        },
        {
          prompt: 'What is the main operational drawback of a stateless JWT access token?',
          options: [
            'It cannot carry user identity',
            'It remains valid until expiry and cannot be revoked on its own',
            'It requires a database lookup on every request',
            'It only works over HTTP, not HTTPS',
          ],
          correctIndex: 1,
          explanation: 'Self-contained tokens trade revocability for statelessness, which short lifetimes plus refresh tokens mitigate.',
        },
        {
          prompt: 'Why must a JWT library be configured with an explicit expected algorithm?',
          options: [
            'To improve verification performance',
            'To prevent an attacker supplying alg: none or downgrading the algorithm',
            'Because the payload is encrypted with it',
            'To allow tokens to be refreshed',
          ],
          correctIndex: 1,
          explanation: 'Trusting the token’s own alg header lets an attacker choose a verification method that always passes.',
        },
        {
          prompt: 'An endpoint returns any enrolment by id to any signed-in user. What is the flaw?',
          options: [
            'Cross-site request forgery',
            'Insecure direct object reference: authentication was checked but ownership was not',
            'SQL injection',
            'Mass assignment',
          ],
          correctIndex: 1,
          explanation: 'Authentication established identity; authorisation must still confirm the object belongs to that identity.',
        },
        {
          prompt: 'Why should a request body never be spread directly into a database update?',
          options: [
            'It is slower than assigning fields individually',
            'A client can set fields it should not control, such as role or account status',
            'JSON objects cannot be stored in SQL',
            'It bypasses the connection pool',
          ],
          correctIndex: 1,
          explanation: 'That is mass assignment; fields must be explicitly allow-listed.',
        },
      ],
    },
    {
      title: 'Production Readiness and Observability',
      summary: 'Structured logging, health checks, graceful shutdown, rate limiting, and configuration.',
      estimatedMinutes: 35,
      passMark: 75,
      rewardMinutes: 35,
      content: `## Configuration comes from the environment

Configuration that differs between environments — connection strings, secrets, feature flags — belongs in the environment, not in the repository. Validate it at startup and **fail fast**: a service that boots with a missing secret and discovers it on the first request has converted a deployment error into an outage.

Never commit secrets. A secret that reached a git history is compromised and must be rotated, because removing the file does not remove the object.

## Structured logging

Log JSON, not prose. \`Request failed for user 42\` cannot be filtered or aggregated; \`{"level":"error","event":"request_failed","userId":"42","requestId":"a3f","durationMs":812}\` can.

Attach a **correlation id** to every request, propagate it to downstream calls, and include it in the response. When a user reports a failure, that one value retrieves the entire path through every service.

Never log credentials, tokens, full card numbers, or personal data. Redact at the logger, not at each call site, so a future contributor cannot forget.

## Health checks

Expose two distinct endpoints, because orchestrators use them for different decisions:

- **Liveness** — is the process functioning? Fails only if a restart would help. It must not check dependencies; a database outage that fails liveness triggers a restart loop that helps nobody.
- **Readiness** — can this instance serve traffic right now? This one *does* check the database and other critical dependencies, so the load balancer stops sending it requests while it recovers.

## Graceful shutdown

On \`SIGTERM\`, stop accepting new connections, finish in-flight requests within a bounded timeout, close database pools, then exit. Terminating immediately drops requests that were mid-flight, and produces user-visible errors on every deployment.

## Rate limiting and timeouts

Rate limit by identity — API key or authenticated user — before the expensive work, and return **429** with a \`Retry-After\` header. Set explicit timeouts on every outbound call: a dependency that hangs without a timeout exhausts your connection pool and converts its partial failure into your total failure. Pair timeouts with retries using **exponential backoff and jitter**, so a recovering dependency is not immediately flattened by every client retrying in lockstep.

## Signals worth watching

Track the four that describe user experience: **latency** (as percentiles, not averages — p50 hides everything that matters), **traffic**, **errors**, and **saturation**. An average response time of 120 ms is compatible with 5% of users waiting eight seconds.`,
      questions: [
        {
          prompt: 'Why should a service validate its configuration at startup and refuse to boot when it is invalid?',
          options: [
            'It reduces container image size',
            'It converts a deployment-time error into an outage if deferred to the first request',
            'It is required by the HTTP specification',
            'It removes the need for health checks',
          ],
          correctIndex: 1,
          explanation: 'Failing fast surfaces misconfiguration during rollout rather than during live traffic.',
        },
        {
          prompt: 'Why should a liveness probe NOT check the database?',
          options: [
            'Database checks are too slow to run frequently',
            'A database outage would fail liveness and trigger a pointless restart loop',
            'Liveness probes cannot make network calls',
            'Readiness probes already restart the process',
          ],
          correctIndex: 1,
          explanation: 'Liveness should fail only when restarting helps; dependency health belongs to readiness.',
        },
        {
          prompt: 'What is the primary benefit of a correlation id on every request?',
          options: [
            'It authenticates the caller',
            'It lets a single failure be traced across every service and log line',
            'It reduces response payload size',
            'It replaces the need for structured logging',
          ],
          correctIndex: 1,
          explanation: 'A propagated identifier stitches one user-visible failure together across distributed logs.',
        },
        {
          prompt: 'Why add jitter to exponential backoff when retrying a failed dependency?',
          options: [
            'It makes retries happen sooner',
            'It spreads retries out so a recovering dependency is not hit by every client at once',
            'It guarantees the request eventually succeeds',
            'It is required for HTTP 429 responses',
          ],
          correctIndex: 1,
          explanation: 'Without jitter, synchronised clients retry in lockstep and re-overload the recovering service.',
        },
        {
          prompt: 'Why report latency as percentiles rather than an average?',
          options: [
            'Percentiles are cheaper to compute',
            'An average can look healthy while a significant fraction of users experience severe delays',
            'Averages cannot be graphed over time',
            'Percentiles are required by most load balancers',
          ],
          correctIndex: 1,
          explanation: 'Tail latency is invisible in an average; p95 and p99 describe what slow users actually experience.',
        },
      ],
    },
  ],
};
