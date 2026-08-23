import type { SeedCourse } from '../types.js';

export const gitAndCicdWorkflows: SeedCourse = {
  slug: 'git-and-cicd-workflows',
  title: 'Git and CI/CD Workflows',
  summary: 'Version control that survives a team, and pipelines that deliver changes safely.',
  description:
    'Version control and delivery are where individual coding becomes team engineering. This course covers Git’s object model, branching and integration strategies, conflict resolution, and the continuous integration and deployment practices that let a team ship several times a day without breaking production.',
  category: 'DevOps',
  level: 'INTERMEDIATE',
  durationHours: 10,
  accent: 'orange',
  outcomes: [
    'Explain Git’s object model and what each command does to history',
    'Choose and apply a branching strategy suited to a team’s release cadence',
    'Resolve conflicts and recover from mistakes without losing work',
    'Design a CI/CD pipeline with meaningful gates and a safe rollout strategy',
  ],
  prerequisites: ['Linux Command Line Essentials'],
  chapters: [
    {
      title: 'How Git Actually Works',
      summary: 'Snapshots, the three areas, commits as a DAG, and what branches really are.',
      estimatedMinutes: 30,
      passMark: 75,
      rewardMinutes: 30,
      content: `## Snapshots, not diffs

Git does not store changes between versions. Each commit records a complete **snapshot** of the tree, with unchanged files referenced by the same content hash rather than duplicated. Diffs are computed on demand for display.

Four object types make up the store:

- **Blob** — file contents, with no name.
- **Tree** — a directory listing mapping names to blobs and other trees.
- **Commit** — a root tree, one or more parents, an author, a timestamp, and a message.
- **Tag** — a named, annotated pointer to an object.

Every object is addressed by the hash of its contents, so identical content is stored once and any corruption is detectable.

## The three areas

1. **Working directory** — the files you edit.
2. **Staging area (index)** — what will go into the next commit.
3. **Repository** — committed history.

\`git add\` moves changes from the working directory to the index; \`git commit\` turns the index into a commit. The staging area is what lets you commit two logically separate changes from one editing session, and \`git add -p\` stages selected hunks interactively.

## Branches are pointers

A branch is a 41-byte file containing a commit hash. Creating one is instantaneous because nothing is copied. Committing advances the pointer; \`HEAD\` names the branch you are currently on.

History is a **directed acyclic graph**. A merge commit is simply a commit with two parents, which is why Git can always reconstruct exactly what was combined.

## Local and remote

\`git fetch\` downloads remote objects and updates remote-tracking refs such as \`origin/main\`, changing nothing in your working directory. \`git pull\` is \`fetch\` followed by \`merge\` (or \`rebase\` with \`--rebase\`). Fetching first, inspecting with \`git log HEAD..origin/main\`, then integrating deliberately is the habit that avoids surprise merges.

Commits are immutable: they are identified by a hash over their content and parents. Anything that "edits" history — amend, rebase, reset — creates *new* commits and moves a pointer. The old commits survive in the reflog until garbage collection, which is why almost every Git mistake is recoverable.`,
      questions: [
        {
          prompt: 'What does a Git commit store?',
          options: [
            'A diff against the previous commit',
            'A complete snapshot of the tree, reusing unchanged content by hash',
            'Only the files changed since the branch was created',
            'A compressed copy of the working directory including ignored files',
          ],
          correctIndex: 1,
          explanation: 'Git stores snapshots; unchanged files are referenced by the same object hash rather than duplicated.',
        },
        {
          prompt: 'What is a Git branch, structurally?',
          options: [
            'A full copy of the repository at a point in time',
            'A movable pointer to a commit hash',
            'A directory inside the working tree',
            'A diff applied on top of main',
          ],
          correctIndex: 1,
          explanation: 'A branch is just a reference to a commit, which is why branching is instantaneous.',
        },
        {
          prompt: 'What does the staging area let you do?',
          options: [
            'Undo a pushed commit',
            'Compose the next commit selectively from your working changes',
            'Store credentials for the remote',
            'Run tests before committing',
          ],
          correctIndex: 1,
          explanation: 'The index is a staging buffer, allowing separate logical commits from one editing session.',
        },
        {
          prompt: 'What is the difference between git fetch and git pull?',
          options: [
            'fetch updates remote-tracking refs only; pull also integrates the changes',
            'pull is read-only while fetch writes to the working tree',
            'They are aliases for the same command',
            'fetch works offline while pull requires a network',
          ],
          correctIndex: 0,
          explanation: 'fetch downloads objects and moves origin/* refs; pull additionally merges or rebases.',
        },
        {
          prompt: 'Why are most Git mistakes recoverable?',
          options: [
            'Git uploads a backup to the remote automatically',
            'History-editing commands create new commits while the originals persist in the reflog',
            'Commits can be edited in place and reverted',
            'The staging area retains every previous state',
          ],
          correctIndex: 1,
          explanation: 'Commits are immutable; amend, rebase, and reset move pointers while old commits remain reachable via the reflog.',
        },
      ],
    },
    {
      title: 'Branching Strategies and Collaboration',
      summary: 'Trunk-based development, merge versus rebase, conflicts, and code review.',
      estimatedMinutes: 30,
      passMark: 75,
      rewardMinutes: 30,
      content: `## Choosing a strategy

**Trunk-based development** keeps one long-lived branch. Work happens on short-lived branches merged within a day or two, and unfinished features hide behind **feature flags**. It suits teams deploying continuously and keeps integration pain small and frequent.

**GitFlow** maintains separate \`develop\`, \`release\`, and \`hotfix\` branches. It fits versioned software with scheduled releases and support windows, and it is heavy overhead for a web service deployed daily.

The decision rests on release cadence. Long-lived branches guarantee painful merges: divergence compounds, and a branch open for six weeks is a conflict waiting to happen.

## Merge versus rebase

**Merge** creates a commit with two parents, preserving exactly what happened. History is truthful and non-linear.

**Rebase** replays your commits onto a new base, producing new commits with new hashes and a linear history that is easier to read and bisect.

The rule that prevents disasters: **never rebase commits that others have pulled**. Rewriting shared history forces every collaborator to reconcile a diverged branch manually. Rebase your own unpushed work freely; merge when integrating shared branches.

## Resolving conflicts

A conflict occurs when two branches change the same lines, and Git marks the region:

\`\`\`
<<<<<<< HEAD
const timeout = 30;
=======
const timeout = 60;
>>>>>>> feature/tuning
\`\`\`

Resolution means understanding *both* intentions and writing the correct result — which is sometimes neither side. Remove every marker, run the tests, then stage and continue. \`git merge --abort\` or \`git rebase --abort\` returns you to the pre-attempt state at any point.

## Commits and reviews

A commit should be one logical change with a message explaining **why**, since the diff already shows what. A subject line under about 50 characters in the imperative mood, a blank line, then a body covering rationale and trade-offs.

Keep pull requests small. A 200-line change receives real review; a 3,000-line change receives approval. Review for correctness, security, and clarity — formatting belongs to an automated formatter, not a human reviewer.

## Recovering

\`\`\`
git reflog                    # every position HEAD has held
git reset --hard HEAD@{3}     # return to a previous state
git revert <sha>              # a new commit undoing an old one, safe on shared branches
git restore --staged <file>   # unstage without touching the file
\`\`\`

Prefer \`revert\` over \`reset\` on anything already pushed: it undoes the change without rewriting history others depend on.`,
      questions: [
        {
          prompt: 'What is the defining rule about rebasing?',
          options: [
            'Never rebase more than ten commits at once',
            'Never rebase commits that others have already pulled',
            'Always rebase before every commit',
            'Rebase only on the main branch',
          ],
          correctIndex: 1,
          explanation: 'Rebasing rewrites hashes; doing so on shared commits forces everyone else to reconcile a diverged history.',
        },
        {
          prompt: 'Why do long-lived feature branches cause trouble?',
          options: [
            'Git limits branch lifetime',
            'Divergence compounds over time, making integration conflicts larger and riskier',
            'They consume excessive disk space',
            'They cannot be merged after 30 days',
          ],
          correctIndex: 1,
          explanation: 'The longer a branch diverges, the more conflicting change accumulates on both sides.',
        },
        {
          prompt: 'How should a merge conflict be resolved?',
          options: [
            'Always keep the incoming change',
            'Always keep HEAD',
            'Understand both intentions and write the correct result, which may be neither side verbatim',
            'Delete the file and recommit it',
          ],
          correctIndex: 2,
          explanation: 'Conflict resolution is a semantic decision, not a mechanical choice between two sides.',
        },
        {
          prompt: 'A bad commit was already pushed to a shared branch. What is the safe way to undo it?',
          options: [
            'git reset --hard and force-push',
            'git revert, creating a new commit that undoes the change',
            'Delete and recreate the branch',
            'git commit --amend and force-push',
          ],
          correctIndex: 1,
          explanation: 'revert undoes the effect without rewriting history that others have already pulled.',
        },
        {
          prompt: 'What should a commit message primarily explain?',
          options: [
            'Which files were touched',
            'Why the change was made, since the diff already shows what changed',
            'How long the work took',
            'Who reviewed it',
          ],
          correctIndex: 1,
          explanation: 'Rationale is the information the diff cannot carry.',
        },
      ],
    },
    {
      title: 'Continuous Integration',
      summary: 'Pipeline stages, the testing pyramid, reproducible builds, and keeping the build green.',
      estimatedMinutes: 30,
      passMark: 75,
      rewardMinutes: 30,
      content: `## What CI is for

Continuous integration means every change is merged to the mainline frequently and verified automatically. Its purpose is to shorten the gap between introducing a defect and discovering it — a bug found in CI costs minutes, the same bug found in production costs hours and reputation.

A typical pipeline runs on every push:

1. **Checkout and restore cache** — dependencies from a lockfile.
2. **Static analysis** — lint and type-check. Fastest signal, so it runs first.
3. **Unit tests** — fast, isolated, no external dependencies.
4. **Build** — compile and produce the artefact once, then reuse it downstream.
5. **Integration tests** — run against a real database in a disposable container.
6. **Security scanning** — dependency vulnerabilities and secret detection.
7. **Publish artefact** — a versioned, immutable image or bundle.

Order stages cheapest-first so failures surface in seconds rather than after a twenty-minute suite.

## The testing pyramid

Many fast unit tests, fewer integration tests, and a small number of end-to-end tests. Inverting this — mostly end-to-end — produces a suite that is slow, flaky, and eventually ignored.

The distinguishing property of a good test is determinism. A test that depends on wall-clock time, network access, execution order, or shared mutable state will fail randomly. **A flaky test is worse than no test**, because it teaches the team to re-run red builds rather than read them.

## Reproducible builds

Commit the lockfile and install from it (\`npm ci\`, not \`npm install\`) so CI resolves exactly the versions that were tested. Pin base image tags by digest rather than \`latest\`. Build the artefact once and promote that same artefact through environments — rebuilding per environment means what you tested is not what you deploy.

## Keeping the build green

A red mainline blocks everyone, so a broken build is the team's highest priority. Two rules make that workable: **revert first, investigate second** — restore the mainline, then diagnose at leisure; and run the same checks locally via a pre-commit hook or a make target, so obvious failures never reach CI.

Secrets belong in the CI platform's secret store, injected at runtime and masked in logs. A pipeline that echoes an environment variable containing a token has published it to everyone with read access to build logs.`,
      questions: [
        {
          prompt: 'Why should static analysis run before the test suite in a pipeline?',
          options: [
            'Linters find more bugs than tests',
            'It is the cheapest stage, so failures surface in seconds rather than after a long suite',
            'Tests cannot run until linting passes',
            'It reduces artefact size',
          ],
          correctIndex: 1,
          explanation: 'Ordering stages cheapest-first shortens the feedback loop on common failures.',
        },
        {
          prompt: 'Why is a flaky test considered worse than no test at all?',
          options: [
            'It consumes more CI minutes',
            'It trains the team to re-run red builds instead of reading them, so real failures get ignored',
            'It prevents the artefact from being published',
            'It cannot be deleted once merged',
          ],
          correctIndex: 1,
          explanation: 'Non-deterministic tests destroy trust in the signal, which is the whole value of CI.',
        },
        {
          prompt: 'Why use `npm ci` rather than `npm install` in a pipeline?',
          options: [
            'It is the only command that works offline',
            'It installs exactly the versions in the lockfile, making the build reproducible',
            'It skips devDependencies automatically',
            'It updates dependencies to their latest versions',
          ],
          correctIndex: 1,
          explanation: 'ci installs strictly from the lockfile, so CI tests the same dependency tree that was committed.',
        },
        {
          prompt: 'Why build the deployment artefact once and promote it between environments?',
          options: [
            'It saves storage costs',
            'Rebuilding per environment means the tested artefact is not the deployed one',
            'It is required for container registries',
            'It allows environment-specific source changes',
          ],
          correctIndex: 1,
          explanation: 'Promoting one immutable artefact guarantees that what was verified is what runs.',
        },
        {
          prompt: 'The mainline build has been red for two hours. What is the correct response?',
          options: [
            'Continue merging and fix it at the end of the sprint',
            'Revert the offending change to restore the mainline, then investigate',
            'Disable the failing test',
            'Merge only on a separate branch until it is fixed',
          ],
          correctIndex: 1,
          explanation: 'A red mainline blocks the whole team; reverting restores the signal immediately without hiding the defect.',
        },
      ],
    },
    {
      title: 'Continuous Delivery and Safe Deployment',
      summary: 'Deployment strategies, feature flags, migrations, and rollback planning.',
      estimatedMinutes: 30,
      passMark: 75,
      rewardMinutes: 35,
      content: `## Delivery versus deployment

**Continuous delivery** means every green build is *releasable*; a human decides when to release. **Continuous deployment** means every green build is released automatically. The engineering work is identical — the difference is whether a person presses the button.

## Deployment strategies

- **Rolling** — replace instances gradually. Simple, but two versions run at once, so the change must be backward compatible.
- **Blue-green** — run two complete environments and switch traffic at the load balancer. Rollback is a switch flip, at the cost of double infrastructure.
- **Canary** — send a small traffic percentage to the new version, watch error rate and latency, then widen or abort. The best risk-to-cost ratio, and it requires real monitoring to be meaningful.

Canary and rolling both imply version coexistence, which constrains database changes.

## Migrations must be backward compatible

If old and new code run simultaneously, a migration that drops a column breaks the old version instantly. Use the **expand-contract** pattern:

1. **Expand** — add the new column, nullable, and deploy code that writes both old and new.
2. **Migrate** — backfill existing rows in batches.
3. **Switch** — deploy code that reads the new column.
4. **Contract** — in a *later* release, once no running code references it, drop the old column.

Each step is independently reversible. Combining them into one deployment removes that property.

## Feature flags

A flag separates deployment from release: merge incomplete work behind a disabled flag, deploy it safely, and enable it for a subset of users when ready. Disabling a flag is a far faster remediation than a rollback.

Flags are debt. Every one is a branch in the code and a doubling of the states to test, so remove them once a feature is fully rolled out.

## Rollback is part of the plan

Before deploying, know how to undo it, and know how long the undo takes. A deployment strategy without a tested rollback is a hope. Deploy in small increments — a small change that fails is easy to isolate — and keep the previous artefact ready to redeploy.

## Verify after deploying

Automated smoke tests against the deployed environment plus a dashboard watch for the first minutes. Define **rollback criteria in advance**: error rate above a set threshold, p99 latency beyond a limit. Deciding what counts as "bad enough" while an incident is in progress produces slow, disputed calls.`,
      questions: [
        {
          prompt: 'What separates continuous delivery from continuous deployment?',
          options: [
            'Delivery skips automated testing',
            'Deployment releases every green build automatically; delivery keeps a human decision point',
            'Delivery applies only to mobile applications',
            'Deployment requires blue-green infrastructure',
          ],
          correctIndex: 1,
          explanation: 'Both keep the mainline releasable; only continuous deployment removes the manual release step.',
        },
        {
          prompt: 'Why must a database migration be backward compatible during a rolling deployment?',
          options: [
            'Migrations cannot run while the service is live',
            'Old and new versions run simultaneously, so a destructive change breaks the still-running old code',
            'Rolling deployments do not support transactions',
            'The load balancer caches the schema',
          ],
          correctIndex: 1,
          explanation: 'Version coexistence means the schema must satisfy both versions at once.',
        },
        {
          prompt: 'In the expand-contract pattern, when is the old column dropped?',
          options: [
            'In the same deployment that adds the new column',
            'Immediately after the backfill completes',
            'In a later release, once no running code references it',
            'It is never dropped',
          ],
          correctIndex: 2,
          explanation: 'The contract step is deferred until every deployed version has stopped using the old column.',
        },
        {
          prompt: 'What is the main operational benefit of a feature flag?',
          options: [
            'It removes the need for tests',
            'It separates deployment from release, so a problem is remediated by disabling the flag rather than rolling back',
            'It makes the build faster',
            'It guarantees backward-compatible migrations',
          ],
          correctIndex: 1,
          explanation: 'Turning a flag off is faster and lower-risk than redeploying a previous artefact.',
        },
        {
          prompt: 'Why define rollback criteria before a deployment rather than during an incident?',
          options: [
            'It is a compliance requirement in all industries',
            'Deciding thresholds under pressure produces slow, disputed decisions',
            'Monitoring tools require thresholds to collect data',
            'It allows the pipeline to skip the canary stage',
          ],
          correctIndex: 1,
          explanation: 'Pre-agreed thresholds turn an incident judgement call into an execution step.',
        },
      ],
    },
  ],
};
