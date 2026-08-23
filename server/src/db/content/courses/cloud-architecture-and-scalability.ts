import type { SeedCourse } from '../types.js';

export const cloudArchitectureAndScalability: SeedCourse = {
  slug: 'cloud-architecture-and-scalability',
  title: 'Cloud Architecture and Scalability',
  summary: 'Design distributed systems that stay available, consistent enough, and affordable at scale.',
  description:
    'An architecture course for engineers who already ship services. You will reason about the trade-offs distributed systems force on you, design caching and data layers that hold up under load, apply resilience patterns that contain failure, and evaluate cost as a first-class design constraint.',
  category: 'Cloud Architecture',
  level: 'ADVANCED',
  durationHours: 14,
  accent: 'indigo',
  outcomes: [
    'Apply CAP and consistency models to concrete design decisions',
    'Design multi-layer caching with correct invalidation',
    'Contain failure using timeouts, bulkheads, and circuit breakers',
    'Choose between synchronous and event-driven integration on evidence',
  ],
  prerequisites: ['Backend APIs with Node.js', 'Relational Databases and SQL'],
  chapters: [
    {
      title: 'Distributed Systems Trade-offs',
      summary: 'CAP and PACELC, consistency models, idempotency, and delivery semantics.',
      estimatedMinutes: 40,
      passMark: 80,
      rewardMinutes: 30,
      content: `## CAP, stated precisely

The CAP theorem is about behaviour **during a network partition**. When nodes cannot communicate, a system must choose:

- **CP** — refuse or block requests it cannot serve consistently, sacrificing availability.
- **AP** — keep serving from whatever each side knows, sacrificing consistency until the partition heals.

Partitions are not optional, so "choose two of three" is misleading. The real statement is: **during a partition, choose C or A.**

**PACELC** extends this to normal operation: if Partitioned, choose Availability or Consistency; **Else**, choose **Latency** or **Consistency**. Even with a healthy network, synchronous cross-region replication buys consistency by paying round-trip latency on every write.

## Consistency models

- **Strong** — every read observes the latest committed write. Simple to reason about, expensive to coordinate.
- **Eventual** — replicas converge if writes stop. Cheap, fast, and requires the application to tolerate stale reads.
- **Read-your-writes** — a client always sees its own writes. Often the pragmatic middle ground, achieved by pinning a session to a replica or reading through the primary after a write.
- **Causal** — causally related operations are observed in order, while concurrent ones may differ.

Choose per operation, not per system. A financial balance needs strong consistency; a view counter does not. Designing everything to the strictest requirement is how systems become slow and expensive.

## Idempotency is the backbone of reliability

Networks give you **at-least-once** delivery in practice. Exactly-once delivery does not exist end-to-end; what exists is at-least-once delivery plus **idempotent processing**, which produces exactly-once *effects*.

Make every consumer idempotent by recording a deduplication key — a message id or business key — and ignoring repeats. Design operations to be naturally idempotent where possible: \`SET balance = 500\` is safe to repeat, \`ADD 100 to balance\` is not.

## Failure is partial and ambiguous

In a single process a function either returns or throws. Across a network there is a third outcome: **no answer**. A timeout tells you nothing about whether the work happened. That single ambiguity is why retries need idempotency, why compensating actions exist, and why distributed transactions are avoided.

The **saga** pattern replaces a distributed transaction with a sequence of local transactions, each with a compensating action that undoes it. Ordering a refund is not "rolling back" a payment — it is a new, forward business action that restores the invariant.`,
      questions: [
        {
          prompt: 'What does the CAP theorem actually force a choice between?',
          options: [
            'Any two of consistency, availability, and partition tolerance in normal operation',
            'Consistency or availability, during a network partition',
            'Latency or throughput, at all times',
            'Replication or sharding',
          ],
          correctIndex: 1,
          explanation: 'Partitions cannot be avoided, so the real trade-off is between C and A while one is occurring.',
        },
        {
          prompt: 'What does the "ELC" half of PACELC describe?',
          options: [
            'Error handling during a partition',
            'The latency-versus-consistency trade-off when the network is healthy',
            'Encryption requirements for cross-region traffic',
            'Eventual consistency convergence time',
          ],
          correctIndex: 1,
          explanation: 'Else, choose Latency or Consistency: synchronous replication costs round-trip latency even without partitions.',
        },
        {
          prompt: 'Why is end-to-end exactly-once delivery unattainable in practice?',
          options: [
            'Message brokers do not support it',
            'A timeout leaves it ambiguous whether the work happened, so senders must retry',
            'Networks reorder packets',
            'Clocks are not perfectly synchronised',
          ],
          correctIndex: 1,
          explanation: 'The ambiguity of a lost response forces at-least-once delivery; idempotent processing yields exactly-once effects.',
        },
        {
          prompt: 'Which operation is naturally idempotent?',
          options: [
            'ADD 100 to the balance',
            'SET the balance to 500',
            'Append an entry to a log',
            'Increment a view counter',
          ],
          correctIndex: 1,
          explanation: 'Assignment produces the same state however many times it is applied; increments accumulate.',
        },
        {
          prompt: 'How does a saga replace a distributed transaction?',
          options: [
            'By holding locks across services until every step commits',
            'By running local transactions in sequence, each with a compensating action that restores the invariant',
            'By retrying the whole workflow until it succeeds',
            'By replicating the database synchronously across services',
          ],
          correctIndex: 1,
          explanation: 'Sagas trade atomicity for local commits plus forward-acting compensation.',
        },
      ],
    },
    {
      title: 'Scaling Data: Caching, Replication, and Partitioning',
      summary: 'Cache layers and invalidation, read replicas, sharding, and the failure modes of each.',
      estimatedMinutes: 40,
      passMark: 80,
      rewardMinutes: 30,
      content: `## Caching layers

Requests pass several caches: the browser, a CDN at the edge, an application cache such as Redis, and the database's own buffer pool. Each cuts latency and load, and each adds a way for a user to see stale data.

**Cache-aside** is the common pattern: read the cache, and on a miss read the database and populate the cache. It is simple and tolerates cache outages, but the first request after every eviction pays full cost. **Write-through** updates cache and database together, keeping them consistent at the cost of write latency.

## Invalidation

There are two honest strategies, and they are usually combined:

- **TTL expiry** — bound staleness by time. Simple, predictable, always slightly stale.
- **Explicit invalidation on write** — delete or update the key when the source changes. Fresher, and it fails whenever a write path forgets.

Cache the key by everything that varies the response, including the requesting user where the response is personalised. A cache key that omits the user identity will eventually serve one person's data to another — a genuine security incident, not a performance bug.

## Three failure modes worth naming

- **Stampede** — a popular key expires and a thousand concurrent requests all miss and hit the database together. Mitigate with a lock so one request repopulates while others wait, or by refreshing slightly before expiry.
- **Penetration** — repeated requests for a key that does not exist bypass the cache every time. Cache the negative result, briefly.
- **Avalanche** — many keys expire at the same instant because they were written together. Add random jitter to TTLs.

## Replication

**Read replicas** scale reads by streaming changes from a primary. Replication is asynchronous, so a replica lags — and a user who writes then immediately reads may not see their own change. Route reads that must be current to the primary, or pin the session for a short window.

Only one node accepts writes. Replicas do not scale write throughput; sharding does.

## Partitioning

**Sharding** splits data across nodes by a shard key.

- **Hash** partitioning distributes evenly but makes range queries fan out to every shard.
- **Range** partitioning keeps ranges local but creates hot spots when a range is disproportionately active — partitioning by timestamp sends all of today's traffic to one shard.

The shard key is the hardest decision to reverse, so choose it to keep the queries you run most often within a single shard. Cross-shard joins and transactions are where sharded systems become slow and complicated, and avoiding them is the point.

Before sharding, exhaust the cheaper options: indexing, caching, read replicas, and archiving cold data. Sharding multiplies operational complexity permanently.`,
      questions: [
        {
          prompt: 'A popular cache key expires and a thousand concurrent requests all hit the database. What is this called, and what mitigates it?',
          options: [
            'Cache penetration; cache negative results',
            'Cache stampede; use a repopulation lock or refresh ahead of expiry',
            'Cache avalanche; increase the TTL',
            'Write amplification; switch to write-through',
          ],
          correctIndex: 1,
          explanation: 'A stampede is simultaneous misses on one hot key; a lock lets one request repopulate while others wait.',
        },
        {
          prompt: 'Why must a cache key include the user identity for personalised responses?',
          options: [
            'To improve the hit rate',
            'Otherwise one user’s data can be served to another — a security incident',
            'Because Redis requires namespaced keys',
            'To allow TTL jitter to work',
          ],
          correctIndex: 1,
          explanation: 'The key must capture everything that varies the response, or cached data leaks across users.',
        },
        {
          prompt: 'Why do read replicas fail to solve a write throughput problem?',
          options: [
            'Replicas reject all queries',
            'Only the primary accepts writes; replicas duplicate the write load rather than dividing it',
            'Replication is synchronous and therefore slow',
            'Replicas cannot be indexed',
          ],
          correctIndex: 1,
          explanation: 'Replicas scale reads; write capacity is bounded by the single primary, which is what sharding addresses.',
        },
        {
          prompt: 'What problem does partitioning by timestamp typically create?',
          options: [
            'Range queries become impossible',
            'A hot spot, because all current traffic lands on one shard',
            'Shard keys cannot be time-based',
            'It prevents the use of secondary indexes',
          ],
          correctIndex: 1,
          explanation: 'Time-ordered keys concentrate recent activity on a single partition.',
        },
        {
          prompt: 'What should be exhausted before sharding a database?',
          options: [
            'Indexing, caching, read replicas, and archiving cold data',
            'Increasing the connection pool and the isolation level',
            'Removing foreign key constraints',
            'Converting the schema to a document store',
          ],
          correctIndex: 0,
          explanation: 'Sharding adds permanent operational complexity, so cheaper capacity measures come first.',
        },
      ],
    },
    {
      title: 'Resilience Patterns',
      summary: 'Timeouts, retries, circuit breakers, bulkheads, load shedding, and degradation.',
      estimatedMinutes: 35,
      passMark: 80,
      rewardMinutes: 30,
      content: `## Cascading failure

In a distributed system, the dangerous failures are not the ones that stay put. A slow dependency causes callers to hold connections; the caller's pool exhausts; the caller becomes slow; *its* callers exhaust. One degraded service takes down a system that had no other fault.

Resilience engineering is the practice of containing that spread.

## Timeouts

**Every outbound call needs an explicit timeout.** A call without one waits as long as the operating system permits, which can be minutes. Set the timeout from the observed p99 of that dependency plus headroom — not an arbitrary round number — and ensure timeouts *decrease* as you go deeper into a call chain, so an inner call cannot outlive the outer request that depends on it.

## Retries, carefully

Retries are useful for transient failures and dangerous otherwise. Three constraints:

1. Only retry **idempotent** operations, or operations protected by an idempotency key.
2. Use **exponential backoff with jitter**. Fixed-interval retries from many clients synchronise into a thundering herd.
3. **Cap total attempts**, and never retry a 4xx: the request is wrong and will stay wrong.

Retries multiply load exactly when a dependency is least able to absorb it. A three-level call chain each retrying three times produces 27 requests for one user action, which is why a **retry budget** — a cap on the fraction of traffic that may be retries — belongs in any serious client.

## Circuit breakers

A circuit breaker tracks the failure rate of a dependency and short-circuits when it crosses a threshold.

- **Closed** — requests flow, failures are counted.
- **Open** — requests fail immediately without a call, giving the dependency room to recover.
- **Half-open** — after a cool-down, a few probe requests decide whether to close or re-open.

Failing fast is the point: an immediate error is better for the user than a thirty-second wait for the same error, and it stops the caller's resources from being consumed by a doomed call.

## Bulkheads

Partition resources so one dependency cannot consume them all. A separate connection pool per downstream service means a hang in the reporting service leaves the checkout path unaffected. The name comes from ship compartments: a breach floods one section, not the hull.

## Load shedding and degradation

When demand exceeds capacity, serving every request badly is worse than serving most requests well. **Shed load** by rejecting excess requests quickly with 429 or 503, prioritising by request class — health checks and paying customers before batch exports.

**Graceful degradation** disables non-essential features under pressure while the core path keeps working: serve stale cached recommendations, hide the personalised sidebar, defer analytics writes. A checkout that works without recommendations is a working checkout.`,
      questions: [
        {
          prompt: 'Why must timeouts decrease as a call chain gets deeper?',
          options: [
            'Deeper services are always faster',
            'So an inner call cannot outlive the outer request that is waiting on it',
            'To reduce the number of retries',
            'Because TCP requires it',
          ],
          correctIndex: 1,
          explanation: 'An inner timeout longer than the outer one guarantees wasted work and held resources.',
        },
        {
          prompt: 'Which failure should never be retried?',
          options: [
            'A connection timeout',
            'An HTTP 503',
            'An HTTP 400',
            'A DNS resolution failure',
          ],
          correctIndex: 2,
          explanation: 'A 4xx means the request itself is invalid; retrying it wastes capacity and will fail identically.',
        },
        {
          prompt: 'What is the purpose of the half-open state in a circuit breaker?',
          options: [
            'To queue requests until the dependency recovers',
            'To send a small number of probe requests that decide whether to close or re-open',
            'To log failures without affecting traffic',
            'To route traffic to a backup region',
          ],
          correctIndex: 1,
          explanation: 'Half-open tests recovery with limited traffic instead of reopening the floodgates blindly.',
        },
        {
          prompt: 'What does the bulkhead pattern achieve?',
          options: [
            'It caches responses from slow dependencies',
            'It partitions resources so one failing dependency cannot exhaust them all',
            'It retries failed calls in a separate thread',
            'It compresses payloads between services',
          ],
          correctIndex: 1,
          explanation: 'Isolated resource pools contain a failure to the path that caused it.',
        },
        {
          prompt: 'Under overload, why is shedding excess load preferable to accepting every request?',
          options: [
            'Rejected requests are not billed',
            'Serving most requests well beats serving all of them badly or timing out',
            'It prevents the circuit breaker from opening',
            'It guarantees strong consistency',
          ],
          correctIndex: 1,
          explanation: 'Beyond capacity, admitting more work degrades every request; shedding preserves service for the rest.',
        },
      ],
    },
    {
      title: 'Architecture, Events, and Cost',
      summary: 'Service boundaries, synchronous versus event-driven integration, and cost as a design constraint.',
      estimatedMinutes: 35,
      passMark: 80,
      rewardMinutes: 35,
      content: `## Drawing service boundaries

A monolith is not a failure state — it is the correct default until team size or scaling asymmetry justifies otherwise. Splitting a system introduces network calls, partial failure, distributed debugging, and independent deployment pipelines. Those costs are worth paying for a reason, not by fashion.

The useful boundary is a **business capability** that owns its data. If two services must be deployed together, or one reads the other's database directly, the boundary is wrong: you have a distributed monolith, with all the complexity of microservices and none of the independence.

Signals that a split is justified: distinct scaling profiles, distinct release cadences, distinct availability requirements, or a team that is blocked waiting on another team's deployments.

## Synchronous versus event-driven

**Synchronous** calls are simple and immediate, at the cost of temporal coupling: the caller is only as available as everything it calls. Availability multiplies — five dependencies at 99.9% each yield 99.5% combined.

**Events** decouple in time. A producer publishes a fact; consumers process it when they can. The system tolerates a consumer being down, absorbs bursts, and supports adding consumers without touching the producer. The costs are eventual consistency, harder debugging, and the need for idempotent consumers.

The practical division: use synchronous calls when the caller genuinely needs the answer to continue (an authorisation check), and events for work that can complete later (sending a receipt, updating a recommendation index, writing an audit record).

Publish events as **facts about what happened** — \`ExamPassed\`, \`RewardSessionExpired\` — not commands about what someone should do. Facts stay valid as consumers come and go; commands hard-code the producer's assumptions about its consumers.

## Queues and ordering

A queue absorbs bursts and smooths a spiky producer against a steady consumer. Two operational essentials: a **dead-letter queue** for messages that repeatedly fail, so one poison message cannot block a partition forever, and an explicit decision about ordering — global ordering across partitions is expensive, while per-key ordering is usually sufficient and cheap.

## Cost is an architectural property

At scale, cost is a design constraint alongside latency and availability, and it is dominated by a few decisions:

- **Cross-availability-zone and cross-region data transfer** is billed and frequently exceeds compute cost. Keep chatty components co-located.
- **Idle provisioned capacity** is the largest avoidable waste. Autoscale on a signal that reflects real demand, and right-size instances against measured utilisation rather than a guess.
- **Storage tiering** — move cold data to infrequent-access or archival tiers on a lifecycle policy rather than manually.
- **Managed versus self-hosted** — a managed database costs more per hour and usually less in total once the engineering time to patch, back up, and fail it over is counted.

Attribute cost with tagging so each team sees its own spend. Unattributed cost is nobody's responsibility and therefore always grows.`,
      questions: [
        {
          prompt: 'Two services must always be deployed together and one reads the other’s database directly. What has been built?',
          options: [
            'A well-factored microservice architecture',
            'A distributed monolith: microservice complexity without independence',
            'An event-driven system',
            'A correctly applied bulkhead',
          ],
          correctIndex: 1,
          explanation: 'Shared data and coupled deployments mean the boundary is wrong.',
        },
        {
          prompt: 'A service synchronously calls five dependencies, each 99.9% available. What is the approximate combined availability?',
          options: ['99.9%', '99.5%', '99.99%', '100%'],
          correctIndex: 1,
          explanation: 'Synchronous availability multiplies: 0.999^5 is roughly 0.995.',
        },
        {
          prompt: 'Which work is best handled by an event rather than a synchronous call?',
          options: [
            'Checking whether a user is authorised to view a page',
            'Sending a receipt email after a successful payment',
            'Validating a form before accepting a submission',
            'Fetching the account balance to display it',
          ],
          correctIndex: 1,
          explanation: 'The caller does not need the receipt to continue, so it can complete asynchronously.',
        },
        {
          prompt: 'Why should events be published as facts rather than commands?',
          options: [
            'Facts serialise more compactly',
            'Facts remain valid as consumers are added or removed; commands encode the producer’s assumptions about consumers',
            'Commands cannot be placed on a queue',
            'Facts guarantee ordered delivery',
          ],
          correctIndex: 1,
          explanation: 'Publishing what happened keeps the producer decoupled from who reacts and how.',
        },
        {
          prompt: 'Which is typically the largest avoidable cloud cost?',
          options: [
            'DNS query volume',
            'Idle provisioned capacity and unnecessary cross-zone data transfer',
            'TLS certificate renewals',
            'Container image storage',
          ],
          correctIndex: 1,
          explanation: 'Over-provisioned compute and inter-zone transfer dominate avoidable spend at scale.',
        },
      ],
    },
  ],
};
