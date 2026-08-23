import type { SeedCourse } from '../types.js';

export const appliedCybersecurity: SeedCourse = {
  slug: 'applied-cybersecurity-defence',
  title: 'Applied Cybersecurity Defence',
  summary: 'Threat modelling, application security, cryptography in practice, and incident response.',
  description:
    'A defensive security course for engineers who build and operate systems. You will model threats systematically, recognise and remediate the vulnerability classes that account for most real breaches, apply cryptography correctly rather than inventively, and run an incident from detection through to a blameless post-incident review.',
  category: 'Security',
  level: 'ADVANCED',
  durationHours: 13,
  accent: 'rose',
  outcomes: [
    'Produce a threat model using STRIDE and a trust-boundary diagram',
    'Identify and remediate the most exploited web vulnerability classes',
    'Apply cryptographic primitives correctly for transit, storage, and identity',
    'Run detection, containment, eradication, and recovery during an incident',
  ],
  prerequisites: ['Backend APIs with Node.js', 'Cloud Architecture and Scalability'],
  chapters: [
    {
      title: 'Threat Modelling and Security Architecture',
      summary: 'Trust boundaries, STRIDE, defence in depth, and zero trust.',
      estimatedMinutes: 35,
      passMark: 80,
      rewardMinutes: 30,
      content: `## Model before you mitigate

Security controls chosen without a model are a shopping list. Threat modelling asks four questions in order: what are we building, what can go wrong, what will we do about it, and did we do a good enough job.

Start with a **data flow diagram** and mark the **trust boundaries** — every point where data crosses from a less trusted zone into a more trusted one. Browser to API, API to database, service to third-party integration, CI pipeline to production. Vulnerabilities concentrate at boundaries, because that is where assumptions change.

## STRIDE

STRIDE enumerates threat categories against each element and each boundary crossing:

| Threat | Violates | Mitigated by |
|---|---|---|
| **S**poofing | Authentication | Strong authentication, MFA, mutual TLS |
| **T**ampering | Integrity | Signatures, checksums, access control |
| **R**epudiation | Non-repudiation | Tamper-evident audit logs |
| **I**nformation disclosure | Confidentiality | Encryption, least privilege, redaction |
| **D**enial of service | Availability | Rate limiting, quotas, autoscaling |
| **E**levation of privilege | Authorisation | Least privilege, server-side authorisation checks |

Walk each element against all six. The value is systematic coverage — it surfaces the threats nobody thought to imagine.

## Rank by risk, not novelty

Risk is likelihood multiplied by impact. Teams reliably over-invest in exotic attacks and under-invest in the dull ones that actually cause breaches: credential reuse, unpatched dependencies, over-permissive access, and misconfigured storage. Fix the boring things first.

## Defence in depth

Assume every control eventually fails, and layer them so no single failure is catastrophic. A database holding personal data should sit behind network segmentation *and* authentication *and* least-privilege grants *and* encryption at rest *and* audit logging. Any one of those can fail without the data being lost.

The corollary is that a perimeter is not a security model. **Zero trust** discards the idea of a trusted internal network: every request is authenticated and authorised on its own merits regardless of origin, services hold identities, and access is granted per-resource. It exists because flat internal networks turn one compromised laptop into total access.

## Secure defaults

The default configuration is what most deployments will actually run, so it must be the safe one: deny by default and allow explicitly, encrypt unless told otherwise, no default credentials, verbose errors only outside production. A system that is secure only when configured carefully will be insecure in the majority of its installations.`,
      questions: [
        {
          prompt: 'Why do trust boundaries deserve particular attention in a threat model?',
          options: [
            'They are where encryption is legally required',
            'They are where assumptions about the caller change, so vulnerabilities concentrate there',
            'They mark the edges of the network diagram',
            'They determine the database schema',
          ],
          correctIndex: 1,
          explanation: 'A boundary is where data moves between trust levels, which is exactly where validation and authorisation must be enforced.',
        },
        {
          prompt: 'In STRIDE, which threat category does tamper-evident audit logging primarily address?',
          options: ['Spoofing', 'Repudiation', 'Denial of service', 'Elevation of privilege'],
          correctIndex: 1,
          explanation: 'Audit logs establish non-repudiation by making actions attributable and their records tamper-evident.',
        },
        {
          prompt: 'What does defence in depth assume?',
          options: [
            'That the perimeter firewall is sufficient',
            'That every individual control will eventually fail, so controls must be layered',
            'That encryption removes the need for access control',
            'That internal traffic is trustworthy',
          ],
          correctIndex: 1,
          explanation: 'Layering ensures no single control failure is catastrophic.',
        },
        {
          prompt: 'What is the core principle of zero trust?',
          options: [
            'No user is ever granted access to production',
            'Every request is authenticated and authorised on its own merits, regardless of network origin',
            'All internal traffic is encrypted but unauthenticated',
            'Only VPN users may reach internal services',
          ],
          correctIndex: 1,
          explanation: 'Zero trust removes the assumption that network location confers trust.',
        },
        {
          prompt: 'Why must secure defaults be the shipped configuration rather than a documented option?',
          options: [
            'Documentation is expensive to maintain',
            'Most deployments run the defaults, so an insecure default means most installations are insecure',
            'Configuration files are frequently corrupted',
            'Auditors only inspect default settings',
          ],
          correctIndex: 1,
          explanation: 'Security that depends on careful configuration fails in the majority of real deployments.',
        },
      ],
    },
    {
      title: 'Application Security in Practice',
      summary: 'Injection, broken access control, XSS, SSRF, and dependency risk.',
      estimatedMinutes: 40,
      passMark: 80,
      rewardMinutes: 30,
      content: `## Broken access control

Consistently the most prevalent web vulnerability class. It appears as a missing ownership check (\`GET /invoices/1042\` returned to anyone signed in), a client-side-only restriction (an admin button hidden in the UI while the endpoint stays open), or a role check that is performed on some routes and forgotten on others.

Three defences: **deny by default**, enforce authorisation **server-side on every request**, and centralise the check in one place — a policy layer or middleware — so a new endpoint cannot silently skip it. Never treat an identifier supplied by the client as proof of entitlement to it.

## Injection

Injection occurs whenever untrusted input is concatenated into an interpreted language: SQL, shell, LDAP, or a template.

\`\`\`js
// Vulnerable
db.query(\`SELECT * FROM users WHERE email = '\${email}'\`);

// Safe: the driver sends the query and the value separately
db.query('SELECT * FROM users WHERE email = ?', [email]);
\`\`\`

Parameterisation works because the value never becomes part of the query text. Escaping is a fallback that people get wrong. For shell execution, avoid the shell entirely and pass an argument array to the process directly.

## Cross-site scripting

XSS runs attacker-controlled script in a victim's browser, in that victim's session. **Stored** XSS persists in the database, **reflected** XSS comes back in a response, and **DOM-based** XSS never reaches the server at all.

Defences, in order of value: encode on output according to context (HTML body, attribute, URL, and JavaScript contexts each need different encoding), prefer \`textContent\` over \`innerHTML\`, sanitise any HTML you must accept with a maintained library, and deploy a **Content Security Policy** to constrain what can execute even when something slips through. Mark session cookies \`HttpOnly\` so a successful XSS cannot read them.

## SSRF

Server-side request forgery tricks your server into making a request on the attacker's behalf — typically to internal addresses or a cloud instance metadata endpoint, which is how many cloud credential thefts begin.

Mitigate by allow-listing permitted destinations rather than blocking known-bad ones, resolving the hostname and validating the **resolved IP** against private ranges (blocking the string \`169.254.169.254\` is defeated by a DNS name that resolves to it), disabling redirect following or re-validating after each hop, and requiring credentials on the metadata service.

## Dependencies and secrets

Most application code in a modern service is third-party. Keep a lockfile, run automated vulnerability scanning in CI, and treat an unmaintained dependency as a liability regardless of its current CVE count. Pin what you can and update deliberately and often — a stack that is never updated becomes unpatchable.

Secrets belong in a secret manager, injected at runtime. A secret committed to a repository is compromised the moment it lands: rotate it, and do not assume that deleting the file removes it from history.`,
      questions: [
        {
          prompt: 'An endpoint returns any invoice by id to any authenticated user. Which vulnerability class is this?',
          options: ['Injection', 'Broken access control', 'Cross-site scripting', 'Server-side request forgery'],
          correctIndex: 1,
          explanation: 'Authentication was verified but object-level authorisation was not, which is broken access control.',
        },
        {
          prompt: 'Why does parameterisation prevent SQL injection where escaping often fails?',
          options: [
            'Parameters are encrypted in transit',
            'The value is transmitted separately and never becomes part of the query text',
            'Parameters are validated against the schema',
            'The database rejects any query containing quotes',
          ],
          correctIndex: 1,
          explanation: 'Separating code from data removes the possibility of the value being parsed as SQL.',
        },
        {
          prompt: 'Which control limits the damage of an XSS flaw even after it has been exploited?',
          options: [
            'A Content Security Policy restricting what may execute',
            'Rate limiting the affected endpoint',
            'Rotating the database password',
            'Enabling HTTP compression',
          ],
          correctIndex: 0,
          explanation: 'CSP is a defence-in-depth layer constraining script execution when output encoding fails.',
        },
        {
          prompt: 'Why is blocking the literal string 169.254.169.254 an inadequate SSRF defence?',
          options: [
            'The metadata service uses a different address',
            'An attacker can supply a hostname that resolves to that address, so the resolved IP must be validated',
            'The string is case-sensitive',
            'Blocking it breaks legitimate cloud calls',
          ],
          correctIndex: 1,
          explanation: 'Validation must occur on the resolved IP, since DNS can point any name at an internal address.',
        },
        {
          prompt: 'A secret was committed to a repository and the file has since been deleted. What is required?',
          options: [
            'Nothing; deletion removes the risk',
            'Rotate the secret, because it remains recoverable from history and must be treated as compromised',
            'Add the file to .gitignore',
            'Make the repository private',
          ],
          correctIndex: 1,
          explanation: 'Git history retains the object, so the only sound remediation is rotation.',
        },
      ],
    },
    {
      title: 'Applied Cryptography',
      summary: 'Symmetric and asymmetric use, TLS, hashing versus encryption, and key management.',
      estimatedMinutes: 35,
      passMark: 80,
      rewardMinutes: 30,
      content: `## The first rule

Do not design your own cryptographic scheme or implement your own primitive. Use a vetted library at the highest level of abstraction available. Cryptographic failures are usually failures of *composition* — a correct algorithm used with a reused nonce, a missing authentication step, or an unvalidated certificate.

## Hashing, MAC, and encryption

These solve different problems and are not interchangeable:

- **Hashing** is one-way. It proves integrity and stores passwords. It is not encryption and cannot be reversed by design.
- **Password hashing** additionally requires slowness and a per-password salt: bcrypt, scrypt, Argon2id. A general-purpose hash such as SHA-256 is far too fast for this purpose.
- **HMAC** proves both integrity and authenticity using a shared secret. A bare hash of a message an attacker can also compute proves nothing.
- **Encryption** is reversible and provides confidentiality. On its own it does **not** provide integrity, which is why authenticated modes such as **AES-GCM** or ChaCha20-Poly1305 are the modern default — they encrypt and authenticate in one operation.

## Symmetric and asymmetric

**Symmetric** encryption uses one shared key and is fast, suitable for bulk data. Its problem is distributing the key.

**Asymmetric** encryption uses a public/private key pair and solves distribution, at perhaps a thousandfold performance cost. Real protocols therefore use both: asymmetric cryptography to authenticate the parties and agree a session key, then symmetric encryption for the traffic. That is precisely what TLS does.

## TLS

A TLS handshake authenticates the server via a certificate chained to a trusted authority, agrees on a cipher suite, and derives session keys — with **forward secrecy** when ephemeral Diffie-Hellman is used, so a later compromise of the server's private key cannot decrypt recorded past sessions.

Operationally: TLS 1.2 or 1.3 only, **always validate the certificate chain and hostname**, and use HSTS so browsers refuse to downgrade. Disabling certificate validation to make a client work is the single most common way a team removes all the protection TLS provides while believing it is still encrypted.

## Randomness and nonces

Use a cryptographically secure random source — \`crypto.randomBytes\`, not \`Math.random\` — for tokens, salts, session identifiers, and initialisation vectors. Predictable randomness has broken more systems than weak ciphers.

A **nonce or IV must never be reused with the same key**. Under AES-GCM, nonce reuse is catastrophic: it can reveal plaintext relationships and, worse, allow forgery.

## Key management

Keys need a lifecycle: generated in a key management service or HSM, never written to source control or logs, scoped narrowly, rotated on a schedule, and revocable. Design for rotation from the start — store a key identifier alongside every ciphertext so old data remains decryptable while new data uses the current key. Retrofitting rotation onto a system that assumed one eternal key is far harder than building it in.`,
      questions: [
        {
          prompt: 'Why is AES-GCM preferred over an unauthenticated encryption mode?',
          options: [
            'It uses a longer key',
            'It provides integrity and authenticity alongside confidentiality in one operation',
            'It does not require a nonce',
            'It is faster on all hardware',
          ],
          correctIndex: 1,
          explanation: 'Encryption alone does not detect tampering; authenticated modes bind integrity to confidentiality.',
        },
        {
          prompt: 'What is the consequence of reusing a nonce with the same key under AES-GCM?',
          options: [
            'Slightly reduced performance',
            'Catastrophic failure: plaintext relationships can be revealed and forgery becomes possible',
            'The ciphertext becomes longer',
            'Decryption silently returns an empty result',
          ],
          correctIndex: 1,
          explanation: 'GCM security depends on nonce uniqueness per key; reuse breaks both confidentiality and authenticity.',
        },
        {
          prompt: 'Why does TLS combine asymmetric and symmetric cryptography?',
          options: [
            'To satisfy regulatory requirements',
            'Asymmetric authenticates and agrees a key; symmetric encrypts bulk traffic efficiently',
            'Symmetric cryptography cannot encrypt binary data',
            'Asymmetric encryption is more secure for all payload sizes',
          ],
          correctIndex: 1,
          explanation: 'Asymmetric solves key distribution; symmetric provides the throughput.',
        },
        {
          prompt: 'A team disables certificate validation to make an internal client work. What is the effect?',
          options: [
            'Traffic remains fully protected because it is still encrypted',
            'The connection becomes trivially interceptable, removing TLS’s protection against man-in-the-middle attacks',
            'Only performance is affected',
            'The server rejects the connection',
          ],
          correctIndex: 1,
          explanation: 'Without chain and hostname validation, an interceptor can present any certificate and read the traffic.',
        },
        {
          prompt: 'Why store a key identifier alongside every ciphertext?',
          options: [
            'To compress the ciphertext',
            'So keys can be rotated while previously encrypted data remains decryptable',
            'To allow the key to be recovered from the ciphertext',
            'To satisfy the nonce uniqueness requirement',
          ],
          correctIndex: 1,
          explanation: 'A key identifier makes rotation possible without a full re-encryption outage.',
        },
      ],
    },
    {
      title: 'Detection, Response, and Recovery',
      summary: 'Logging for security, the incident lifecycle, forensics, backups, and blameless review.',
      estimatedMinutes: 35,
      passMark: 80,
      rewardMinutes: 35,
      content: `## Detection depends on evidence collected in advance

You cannot investigate what you did not log. Security-relevant events must be captured before an incident: authentication successes and failures, authorisation denials, privilege changes, configuration changes, data exports, and administrative actions — each with actor, source address, timestamp, and outcome.

Ship logs **off the host** to a store the host's own credentials cannot modify. An attacker with root on a compromised machine will edit local logs; centralised, append-only storage is what preserves the record. Synchronise clocks with NTP, because correlating events across systems with skewed clocks is close to impossible.

Alert on patterns rather than single events: many failed logins followed by a success, authentication from a new country minutes after a normal-location session, a sudden spike in data egress, or an account granting itself permissions.

## The incident lifecycle

1. **Preparation** — an on-call rotation, a contact list, a communication channel that survives the compromised system, and rehearsed runbooks.
2. **Detection and analysis** — confirm it is real, then establish scope: which systems, which accounts, what data, since when.
3. **Containment** — stop the spread. Short-term containment (isolate the host, revoke the session, disable the key) buys time for a considered fix. **Preserve evidence before you clean up**: snapshot disks and capture memory, because rebuilding a host destroys the record of how it was breached.
4. **Eradication** — remove the foothold and close the entry point. Patch the vulnerability, rotate every credential that was exposed, and remove persistence mechanisms.
5. **Recovery** — restore from known-good state, monitor closely for reappearance, and return to production deliberately rather than all at once.
6. **Post-incident review** — what happened, why it was possible, why detection took as long as it did, and what changes prevent recurrence.

## Backups are only as good as the last restore test

Follow **3-2-1**: three copies, on two media types, one off-site. Add one modern requirement: at least one copy **immutable or offline**. Ransomware specifically targets reachable backups, and a backup the production credentials can delete is not a backup.

An untested backup is a hypothesis. Restore drills on a schedule are what convert it into a recovery capability, and they surface the things nobody documented — a missing encryption key, an undocumented dependency, a restore that takes eleven hours when the recovery objective is two.

## Blameless review

A post-incident review exists to fix systems, not to identify a culprit. If people are punished for causing incidents, they hide the early evidence, and the organisation loses its ability to detect problems while they are still small.

Ask *why the system allowed the mistake*. A misconfiguration deployed to production is a missing guardrail before it is a human error. Actions from the review need owners and dates, or the same incident recurs with the same conclusions.`,
      questions: [
        {
          prompt: 'Why must security logs be shipped off the originating host?',
          options: [
            'Local disks are too slow for logging',
            'An attacker with control of the host can alter local logs; centralised append-only storage preserves the record',
            'Regulations forbid local log storage',
            'It reduces the host’s memory usage',
          ],
          correctIndex: 1,
          explanation: 'Log integrity requires storage the compromised host cannot modify.',
        },
        {
          prompt: 'Why capture disk and memory images before rebuilding a compromised host?',
          options: [
            'To speed up the rebuild',
            'Rebuilding destroys the evidence of how the breach occurred and what was accessed',
            'It is required to restore from backup',
            'To verify the backup integrity',
          ],
          correctIndex: 1,
          explanation: 'Evidence preservation must precede eradication, or the investigation loses its source material.',
        },
        {
          prompt: 'What must be added to the classic 3-2-1 backup rule to survive ransomware?',
          options: [
            'A fourth copy on the same array',
            'At least one immutable or offline copy that production credentials cannot delete',
            'Daily rather than hourly snapshots',
            'Compression of all archives',
          ],
          correctIndex: 1,
          explanation: 'Ransomware targets reachable backups, so immutability or air-gapping is essential.',
        },
        {
          prompt: 'Why is an untested backup considered unreliable?',
          options: [
            'Backup software corrupts data over time',
            'Only a restore drill proves recoverability and surfaces missing keys, dependencies, and unrealistic restore times',
            'Untested backups expire automatically',
            'Compliance frameworks do not recognise them',
          ],
          correctIndex: 1,
          explanation: 'A backup is a hypothesis until a restore has been performed and timed.',
        },
        {
          prompt: 'What is the purpose of a blameless post-incident review?',
          options: [
            'To determine which individual was responsible',
            'To fix the systemic conditions that allowed the incident, preserving people’s willingness to report early',
            'To satisfy an insurance requirement',
            'To decide whether to disclose publicly',
          ],
          correctIndex: 1,
          explanation: 'Blame suppresses reporting; the review targets the guardrails that were missing.',
        },
      ],
    },
  ],
};
