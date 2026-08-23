import type { SeedCourse } from '../types.js';

export const relationalDatabasesAndSql: SeedCourse = {
  slug: 'relational-databases-and-sql',
  title: 'Relational Databases and SQL',
  summary: 'Model data correctly, query it precisely, and keep it fast and consistent under load.',
  description:
    'A working database engineer’s course. You will normalise a schema, write joins and aggregates that answer real questions, reason about indexes and query plans, and use transactions and isolation levels to keep data correct when many clients write at once.',
  category: 'Data Engineering',
  level: 'INTERMEDIATE',
  durationHours: 12,
  accent: 'violet',
  outcomes: [
    'Design normalised schemas with appropriate keys and constraints',
    'Write joins, aggregates, and subqueries that answer analytical questions',
    'Read a query plan and choose indexes that actually get used',
    'Apply transactions and isolation levels to prevent data anomalies',
  ],
  prerequisites: ['IT Systems Foundations', 'Comfort with a command line'],
  chapters: [
    {
      title: 'Relational Modelling and Normalisation',
      summary: 'Keys, relationships, referential integrity, and the normal forms that matter in practice.',
      estimatedMinutes: 35,
      passMark: 75,
      rewardMinutes: 30,
      content: `## Tables, keys, and constraints

A relation is a table of rows with a fixed set of typed columns. Two kinds of key hold a schema together:

- A **primary key** uniquely identifies a row and can never be null. Prefer a surrogate key (an integer or UUID with no business meaning) over a natural key such as an email address, because business values change and a primary key that changes cascades everywhere.
- A **foreign key** references a primary key in another table, and the database refuses rows that point at nothing. This is **referential integrity**, and it is the single most valuable guarantee a relational database gives you.

Constraints belong in the schema, not only in application code: \`NOT NULL\`, \`UNIQUE\`, \`CHECK (score BETWEEN 0 AND 100)\`. Application validation can be bypassed by a migration script, a second service, or a manual fix. The database constraint cannot.

## Normalisation

Normalisation removes redundancy so that each fact is stored exactly once.

1. **First normal form** — every column holds a single atomic value. A \`phone_numbers\` column containing \`"0788...,0722..."\` violates 1NF; the fix is a related table.
2. **Second normal form** — in 1NF, and every non-key column depends on the *whole* composite key, not part of it.
3. **Third normal form** — in 2NF, and no non-key column depends on another non-key column. Storing \`course_title\` on an \`enrollments\` row alongside \`course_id\` breaks 3NF: the title depends on the course, not the enrolment.

The practical payoff is that an update touches one row. When a course is renamed in a normalised schema you change one value; in a denormalised one you must find every copy, and any you miss becomes a contradiction.

## Relationship cardinality

**One-to-many** is expressed by a foreign key on the "many" side — a chapter carries \`course_id\`. **Many-to-many** requires a junction table: a learner takes many courses and a course has many learners, so \`enrollments(user_id, course_id)\` sits between them, typically with a composite unique constraint and its own attributes such as \`enrolled_at\`.

## When to denormalise

Denormalise deliberately, late, and with a measurement in hand. A cached aggregate such as \`courses.enrollment_count\` is legitimate when the read cost is proven and you accept responsibility for keeping it accurate. Denormalising "because joins are slow" before measuring produces schemas that are both wrong and no faster.`,
      questions: [
        {
          prompt: 'Why is a surrogate primary key usually preferred over a natural key such as an email address?',
          options: [
            'Surrogate keys use less storage in every database',
            'Business values change, and a changing primary key cascades through every referencing row',
            'Natural keys cannot be indexed',
            'Surrogate keys enforce referential integrity automatically',
          ],
          correctIndex: 1,
          explanation: 'Primary keys should be stable; business identifiers change and force updates across all foreign keys.',
        },
        {
          prompt: 'Storing course_title on an enrollments row that already has course_id violates which normal form?',
          options: ['First normal form', 'Second normal form', 'Third normal form', 'No normal form is violated'],
          correctIndex: 2,
          explanation: 'The title depends on course_id, a non-key attribute of the enrolment, which is a transitive dependency barred by 3NF.',
        },
        {
          prompt: 'How is a many-to-many relationship represented relationally?',
          options: [
            'A comma-separated column on each side',
            'A junction table holding a foreign key to each side',
            'A foreign key on whichever table is larger',
            'A view joining the two tables',
          ],
          correctIndex: 1,
          explanation: 'A junction (associative) table with a foreign key to each side models many-to-many and can carry its own attributes.',
        },
        {
          prompt: 'Why place a CHECK constraint in the schema rather than validating only in application code?',
          options: [
            'Application validation is slower',
            'The database constraint cannot be bypassed by migrations, other services, or manual edits',
            'CHECK constraints improve query plans',
            'It is required for foreign keys to work',
          ],
          correctIndex: 1,
          explanation: 'Every writer goes through the database, so schema constraints are the only validation nothing can route around.',
        },
        {
          prompt: 'When is denormalisation a defensible choice?',
          options: [
            'At design time, to avoid writing joins',
            'After measurement shows a specific read cost, and with an owner for keeping the copy accurate',
            'Whenever a table exceeds one million rows',
            'Only in databases without foreign key support',
          ],
          correctIndex: 1,
          explanation: 'Denormalisation trades correctness risk for measured read performance and must be justified by evidence.',
        },
      ],
    },
    {
      title: 'Querying: Joins, Aggregates, and Subqueries',
      summary: 'Join semantics, grouping rules, and the difference between WHERE and HAVING.',
      estimatedMinutes: 40,
      passMark: 75,
      rewardMinutes: 30,
      content: `## Join types

A join matches rows across tables on a condition. Which rows survive when the condition fails is the whole distinction:

- \`INNER JOIN\` — only rows with a match on both sides.
- \`LEFT JOIN\` — every row from the left table; unmatched right-hand columns come back \`NULL\`.
- \`RIGHT JOIN\` — the mirror image, and rarely used because reordering the tables reads better.
- \`FULL OUTER JOIN\` — everything from both sides, padded with \`NULL\`.

To find learners who have enrolled in nothing, a left join plus a null test is the idiomatic form:

\`\`\`sql
SELECT u.id, u.full_name
FROM users u
LEFT JOIN enrollments e ON e.user_id = u.id
WHERE e.id IS NULL;
\`\`\`

A classic mistake is putting that filter in the \`ON\` clause instead. Conditions in \`ON\` decide what *matches*; conditions in \`WHERE\` filter the *result*. Moving a right-table predicate from \`WHERE\` to \`ON\` silently turns a left join back into something closer to an inner join.

## Grouping and aggregates

\`GROUP BY\` collapses rows into one row per distinct group, and aggregate functions summarise each group:

\`\`\`sql
SELECT c.level, COUNT(*) AS enrollments, ROUND(AVG(a.score), 1) AS avg_score
FROM enrollments e
JOIN courses c ON c.id = e.course_id
JOIN exam_attempts a ON a.user_id = e.user_id
WHERE a.submitted_at IS NOT NULL
GROUP BY c.level
HAVING COUNT(*) >= 10
ORDER BY avg_score DESC;
\`\`\`

**\`WHERE\` filters rows before grouping; \`HAVING\` filters groups after aggregation.** A condition on a raw column belongs in \`WHERE\` — putting it in \`HAVING\` forces the engine to aggregate rows it will then discard.

## NULL is not a value

\`NULL\` means unknown, so \`NULL = NULL\` is not true — it is unknown. Use \`IS NULL\` and \`IS NOT NULL\`. \`COUNT(*)\` counts rows while \`COUNT(column)\` skips nulls, and \`AVG\` ignores nulls rather than treating them as zero. Each of these has produced a wrong dashboard number somewhere.

## Subqueries and CTEs

A **common table expression** names an intermediate result and usually reads better than a nested subquery:

\`\`\`sql
WITH passed AS (
  SELECT user_id, chapter_id, MAX(score) AS best
  FROM exam_attempts
  WHERE passed = 1
  GROUP BY user_id, chapter_id
)
SELECT u.full_name, COUNT(*) AS chapters_passed
FROM passed p
JOIN users u ON u.id = p.user_id
GROUP BY u.full_name
ORDER BY chapters_passed DESC;
\`\`\`

Prefer a CTE or a join over a **correlated subquery** in the \`SELECT\` list, which re-executes once per outer row and turns a fast query into a slow one as the table grows.`,
      questions: [
        {
          prompt: 'Which query finds users with no enrolments?',
          options: [
            'INNER JOIN enrollments with WHERE e.id IS NULL',
            'LEFT JOIN enrollments with WHERE e.id IS NULL',
            'LEFT JOIN enrollments with WHERE e.id IS NOT NULL',
            'FULL OUTER JOIN with GROUP BY u.id',
          ],
          correctIndex: 1,
          explanation: 'A left join keeps unmatched left rows with NULL right-hand columns, which the IS NULL test then selects.',
        },
        {
          prompt: 'What is the difference between WHERE and HAVING?',
          options: [
            'WHERE filters rows before grouping; HAVING filters groups after aggregation',
            'HAVING runs first and is faster',
            'WHERE only works on indexed columns',
            'They are interchangeable synonyms',
          ],
          correctIndex: 0,
          explanation: 'WHERE applies pre-aggregation to rows; HAVING applies post-aggregation to groups.',
        },
        {
          prompt: 'Why does `WHERE score = NULL` never match any row?',
          options: [
            'NULL is stored as an empty string',
            'NULL means unknown, so the comparison yields unknown rather than true',
            'The = operator only works on numbers',
            'NULL rows are excluded from all queries',
          ],
          correctIndex: 1,
          explanation: 'Comparison with NULL yields unknown; IS NULL is the correct test.',
        },
        {
          prompt: 'What is the difference between COUNT(*) and COUNT(column)?',
          options: [
            'They are always identical',
            'COUNT(*) counts rows; COUNT(column) skips rows where the column is NULL',
            'COUNT(column) is faster on every engine',
            'COUNT(*) ignores duplicate rows',
          ],
          correctIndex: 1,
          explanation: 'Aggregate functions ignore NULLs, so COUNT(column) can be lower than COUNT(*).',
        },
        {
          prompt: 'Why avoid a correlated subquery in the SELECT list of a large query?',
          options: [
            'It cannot reference outer columns',
            'It re-executes once per outer row, degrading badly as the table grows',
            'It always returns NULL',
            'Most databases reject it at parse time',
          ],
          correctIndex: 1,
          explanation: 'Per-row re-execution makes the cost scale with the outer result; a join or CTE evaluates once.',
        },
      ],
    },
    {
      title: 'Indexes and Query Performance',
      summary: 'B-tree behaviour, composite index ordering, sargability, and reading a plan.',
      estimatedMinutes: 35,
      passMark: 75,
      rewardMinutes: 30,
      content: `## What an index is

A B-tree index is a sorted structure mapping column values to row locations. It converts a full table scan — every row examined — into a tree descent proportional to the logarithm of the row count. The cost is real: every index must be updated on every insert, update, and delete, and it consumes storage. Indexes are a read optimisation paid for on writes.

Index the columns that appear in \`WHERE\`, \`JOIN\`, and \`ORDER BY\` clauses of your actual hot queries. Do not index every column speculatively.

## Composite index column order

A composite index on \`(user_id, chapter_id, submitted_at)\` can serve queries filtering on:

- \`user_id\`
- \`user_id\` and \`chapter_id\`
- all three

It cannot efficiently serve a query filtering on \`chapter_id\` alone. This is the **leftmost prefix rule**: the index is sorted by the first column, then the second within it, exactly like a phone book sorted by surname then first name. Looking someone up by first name alone means reading the whole book.

The practical guidance: put equality predicates before range predicates, and the most selective column first among equalities.

## Sargability

A predicate is *sargable* when the engine can use an index for it. Wrapping the indexed column in a function destroys that:

\`\`\`sql
-- Not sargable: the index on created_at cannot be used
WHERE YEAR(created_at) = 2026

-- Sargable: an index range scan
WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01'
\`\`\`

The same applies to a leading wildcard: \`LIKE '%term'\` cannot use a B-tree, while \`LIKE 'term%'\` can. Full-text search needs a purpose-built index type.

## Reading a plan

\`EXPLAIN\` (or \`EXPLAIN ANALYZE\`, which actually runs the query and reports real timings) shows how the engine intends to execute it. Look for:

- **Seq Scan / Full Table Scan** on a large table with a selective filter — a missing or unusable index.
- **Rows estimated versus rows actual** diverging by orders of magnitude — stale statistics; refresh them.
- **Nested Loop** over a large outer input — often a missing index on the inner side's join column.

## The N+1 problem

An application that fetches 50 courses and then issues one query per course to load its chapters has made 51 round trips. Replace it with a single query using a join or an \`IN\` clause. This is the most common application-level database performance fault, and no amount of indexing fixes it — the cost is round-trip latency, not query execution.`,
      questions: [
        {
          prompt: 'What is the cost of adding an index?',
          options: [
            'Nothing; indexes are free',
            'Storage plus slower inserts, updates, and deletes, since every index must be maintained',
            'It makes all reads slower',
            'It disables foreign key checks',
          ],
          correctIndex: 1,
          explanation: 'Indexes speed reads at the expense of write maintenance and storage.',
        },
        {
          prompt: 'Given an index on (user_id, chapter_id, submitted_at), which query can it NOT serve efficiently?',
          options: [
            'WHERE user_id = ?',
            'WHERE user_id = ? AND chapter_id = ?',
            'WHERE chapter_id = ?',
            'WHERE user_id = ? AND chapter_id = ? AND submitted_at > ?',
          ],
          correctIndex: 2,
          explanation: 'The leftmost prefix rule means the index cannot be used efficiently without user_id.',
        },
        {
          prompt: 'Why is `WHERE YEAR(created_at) = 2026` slower than a date range predicate?',
          options: [
            'YEAR() is an expensive function to compute',
            'Wrapping the column in a function makes the predicate non-sargable, so the index cannot be used',
            'Date ranges are cached by the engine',
            'The year comparison returns a string',
          ],
          correctIndex: 1,
          explanation: 'An index stores raw column values, so a function applied to the column prevents an index range scan.',
        },
        {
          prompt: 'EXPLAIN ANALYZE shows estimated rows of 12 but actual rows of 480,000. What does that suggest?',
          options: [
            'The query is correct and needs no attention',
            'Table statistics are stale, so the planner is choosing a bad plan',
            'The index is corrupted',
            'The transaction isolation level is too high',
          ],
          correctIndex: 1,
          explanation: 'A large estimate/actual divergence points to out-of-date statistics misleading the planner.',
        },
        {
          prompt: 'An API loads 50 courses then issues one query per course for its chapters. What is the fix?',
          options: [
            'Add an index on the chapters primary key',
            'Fetch all chapters in one query using a join or IN clause',
            'Increase the connection pool size',
            'Raise the isolation level',
          ],
          correctIndex: 1,
          explanation: 'This is the N+1 problem: the cost is 51 round trips, resolved by batching into a single query.',
        },
      ],
    },
    {
      title: 'Transactions, Isolation, and Integrity',
      summary: 'ACID properties, the concurrency anomalies, isolation levels, and deadlock handling.',
      estimatedMinutes: 35,
      passMark: 75,
      rewardMinutes: 35,
      content: `## ACID

A transaction groups statements into one unit that either fully happens or does not happen at all.

- **Atomicity** — all statements commit together, or none do.
- **Consistency** — the transaction moves the database from one valid state to another, respecting every constraint.
- **Isolation** — concurrent transactions do not observe each other's partial work.
- **Durability** — once committed, the change survives a crash.

\`\`\`sql
BEGIN;
UPDATE accounts SET balance = balance - 500 WHERE id = 'A';
UPDATE accounts SET balance = balance + 500 WHERE id = 'B';
COMMIT;
\`\`\`

Without the transaction, a crash between the statements destroys 500 units of value.

## The anomalies

Isolation levels are defined by which of these they permit:

- **Dirty read** — reading another transaction's uncommitted change, which may then roll back.
- **Non-repeatable read** — reading a row twice in one transaction and getting different values because another transaction committed in between.
- **Phantom read** — re-running a range query and finding *new rows* that another transaction inserted.

## The levels

| Level | Dirty | Non-repeatable | Phantom |
|---|---|---|---|
| Read uncommitted | possible | possible | possible |
| Read committed | prevented | possible | possible |
| Repeatable read | prevented | prevented | possible* |
| Serializable | prevented | prevented | prevented |

\`READ COMMITTED\` is the common default and is correct for most work. Raise the level only where an anomaly actually threatens correctness — a financial reconciliation, an inventory decrement — because stricter isolation means more locking or more aborted transactions.

## Lost updates

The read-modify-write cycle is the trap:

\`\`\`sql
-- Two clients both read 10, both write 9. One decrement is lost.
SELECT stock FROM items WHERE id = 1;
UPDATE items SET stock = 9 WHERE id = 1;
\`\`\`

Two fixes. **Pessimistic**: \`SELECT ... FOR UPDATE\` locks the row until commit. **Optimistic**: carry a version column and write \`WHERE id = 1 AND version = 7\`, then retry if zero rows were affected. Optimistic control scales better under low contention; pessimistic is simpler when contention is high.

## Deadlocks

Two transactions each holding a lock the other needs will wait forever, so the engine detects the cycle and aborts one with a retryable error. Two rules keep them rare: **acquire locks in a consistent order** across all code paths, and **keep transactions short** — never hold one open across a network call or user think-time.

Application code must be prepared to retry a deadlock victim. A deadlock is an expected operating condition, not a bug to be eliminated.`,
      questions: [
        {
          prompt: 'Which ACID property guarantees that a committed change survives a crash?',
          options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
          correctIndex: 3,
          explanation: 'Durability means committed data persists through failures.',
        },
        {
          prompt: 'A transaction re-runs a range query and sees rows that did not exist the first time. This is:',
          options: ['A dirty read', 'A non-repeatable read', 'A phantom read', 'A deadlock'],
          correctIndex: 2,
          explanation: 'New rows appearing in a repeated range query is the definition of a phantom read.',
        },
        {
          prompt: 'Two clients read stock = 10 and both write 9, losing a decrement. Which fix uses optimistic concurrency control?',
          options: [
            'SELECT ... FOR UPDATE to lock the row',
            'A version column checked in the UPDATE’s WHERE clause, with retry on zero rows affected',
            'Raising the isolation level to READ UNCOMMITTED',
            'Adding an index on the stock column',
          ],
          correctIndex: 1,
          explanation: 'Optimistic control detects the conflict at write time via a version check rather than locking upfront.',
        },
        {
          prompt: 'Why should transactions never stay open across a user interaction or network call?',
          options: [
            'The database will reject the transaction',
            'Held locks block other transactions and dramatically raise deadlock risk',
            'Transactions expire after one second',
            'It prevents the query planner from using indexes',
          ],
          correctIndex: 1,
          explanation: 'Long-lived transactions hold locks, increasing contention and deadlocks.',
        },
        {
          prompt: 'How should application code respond to a deadlock victim error?',
          options: [
            'Report a fatal error to the user',
            'Retry the transaction, since deadlocks are an expected operating condition',
            'Drop and rebuild the affected index',
            'Switch permanently to READ UNCOMMITTED',
          ],
          correctIndex: 1,
          explanation: 'The engine aborts one transaction to break the cycle; the correct handling is a bounded retry.',
        },
      ],
    },
  ],
};
