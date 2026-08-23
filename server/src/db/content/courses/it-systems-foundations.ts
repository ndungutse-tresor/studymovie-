import type { SeedCourse } from "../types.js";

export const itSystemsFoundations: SeedCourse = {
    slug: 'it-systems-foundations',
    title: 'IT Systems Foundations',
    summary: 'How hardware, operating systems, and networks combine into the computing platforms every IT role depends on.',
    description:
      'A ground-up introduction to the machinery of information technology. You will learn how a computer executes work, how an operating system arbitrates between programs, how data moves across a network, and how support professionals reason about faults methodically instead of by guesswork.',
    category: 'Core Infrastructure',
    level: 'BEGINNER',
    durationHours: 8,
    accent: 'sky',
    outcomes: [
      'Describe the role of the CPU, memory hierarchy, and persistent storage',
      'Explain what an operating system kernel actually does for a running program',
      'Trace a request across the OSI and TCP/IP models',
      'Apply a structured troubleshooting method to real faults',
    ],
    prerequisites: ['Comfort using a desktop or laptop computer'],
    chapters: [
      {
        title: 'Inside the Machine',
        summary: 'The processor, the memory hierarchy, and why storage choices dominate perceived performance.',
        estimatedMinutes: 30,
        passMark: 70,
        rewardMinutes: 30,
        content: `## The fetch-decode-execute cycle

Every program, no matter the language it was written in, ends up as machine instructions the CPU repeats in a tight loop:

1. **Fetch** the next instruction from memory, using the program counter as the address.
2. **Decode** the instruction to determine the operation and its operands.
3. **Execute** the operation in an arithmetic-logic unit or issue a memory access.
4. **Advance** the program counter and repeat.

Modern processors overlap these stages through *pipelining*, and run several pipelines at once across multiple **cores**. A four-core processor can genuinely execute four instruction streams simultaneously; a single core switching rapidly between programs only appears to.

## The memory hierarchy

Speed and capacity pull in opposite directions, so machines stack several tiers:

- **Registers** — a few hundred bytes inside the core, accessed in a single cycle.
- **L1/L2/L3 cache** — kilobytes to tens of megabytes, a few to a few dozen cycles away.
- **Main memory (RAM)** — gigabytes, roughly 100x slower than L1, and **volatile**: contents vanish when power is lost.
- **Persistent storage** — SSDs and hard disks, thousands of times slower than RAM but durable across reboots.

Each tier exists to hide the latency of the tier below it. When a program's working set fits in cache it runs fast; when it does not, the CPU spends most of its time waiting.

## Why storage dominates what users feel

A CPU upgrade rarely changes how responsive a machine *feels*. Replacing a spinning hard disk with an SSD almost always does. A mechanical disk must physically move a head to a track and wait for the platter to rotate — several milliseconds per seek. An SSD has no moving parts and answers in tens of microseconds.

The practical rule for support work: when a machine is slow, measure before you buy. If the disk is saturated, more RAM will not help. If the machine is **swapping** — evicting memory pages to disk because RAM is exhausted — then RAM is exactly the fix, because the symptom is disk saturation caused by a memory shortage.`,
        questions: [
          {
            prompt: 'Which sequence correctly describes the instruction cycle a CPU repeats?',
            options: [
              'Decode, fetch, execute, store',
              'Fetch, decode, execute, advance the program counter',
              'Execute, fetch, cache, decode',
              'Fetch, execute, decode, retire',
            ],
            correctIndex: 1,
            explanation: 'The processor fetches the instruction at the program counter, decodes it, executes it, then advances to the next instruction.',
          },
          {
            prompt: 'What distinguishes RAM from an SSD in a running system?',
            options: [
              'RAM is volatile and loses its contents when power is removed',
              'RAM has far greater capacity than an SSD',
              'RAM is only used when the SSD is full',
              'RAM stores the operating system permanently',
            ],
            correctIndex: 0,
            explanation: 'RAM is volatile working memory; SSDs are persistent and retain data without power.',
          },
          {
            prompt: 'A four-core processor differs from a single-core processor because it can:',
            options: [
              'Store four times as much data in main memory',
              'Genuinely execute four instruction streams at the same time',
              'Run each instruction four times faster',
              'Avoid the need for cache memory',
            ],
            correctIndex: 1,
            explanation: 'Multiple cores provide true parallelism; a single core only interleaves work to create the appearance of concurrency.',
          },
          {
            prompt: 'Why does CPU cache exist between the registers and main memory?',
            options: [
              'To provide permanent storage for the operating system',
              'To hide the latency of slower memory by keeping hot data close to the core',
              'To increase the total addressable memory of the machine',
              'To replace RAM entirely on modern systems',
            ],
            correctIndex: 1,
            explanation: 'Each tier of the memory hierarchy exists to mask the latency of the tier beneath it.',
          },
          {
            prompt: 'A workstation is unresponsive and monitoring shows sustained disk saturation with memory fully consumed. What is the most likely cause?',
            options: [
              'The CPU is thermally throttled',
              'The network interface is negotiating at the wrong speed',
              'The system is swapping memory pages to disk because RAM is exhausted',
              'The display driver is out of date',
            ],
            correctIndex: 2,
            explanation: 'Exhausted RAM forces the OS to page to disk, which shows up as disk saturation even though the real shortage is memory.',
          },
        ],
      },
      {
        title: 'What an Operating System Actually Does',
        summary: 'Kernel responsibilities, processes versus threads, file systems, and permission models.',
        estimatedMinutes: 30,
        passMark: 70,
        rewardMinutes: 30,
        content: `## The kernel as arbitrator

An operating system exists because hardware is a shared, finite resource and application programs cannot be trusted to share it politely. The **kernel** runs in a privileged CPU mode and owns four responsibilities:

- **Process scheduling** — deciding which runnable thread gets a core, and for how long.
- **Memory management** — giving each process a private virtual address space mapped onto physical RAM.
- **File systems** — presenting named, hierarchical storage over raw blocks on a device.
- **Device and I/O mediation** — turning generic requests into device-specific driver calls.

Application code runs in **user mode**, where privileged instructions are forbidden. When a program needs the kernel it issues a **system call**, which traps into kernel mode, performs the work, and returns. This boundary is what stops one misbehaving program from corrupting another.

## Processes and threads

A **process** is an isolated container: its own virtual address space, its own file descriptors, its own security context. A **thread** is a unit of execution inside a process. Threads within a process share memory, which makes communication between them cheap and data races possible. Processes do not share memory, which makes them robust but requires explicit inter-process communication.

Crashing a thread usually takes down its whole process. Crashing a process does not touch its neighbours. That trade-off drives a lot of architecture.

## File systems and permissions

A file system maps human-readable paths onto blocks and records metadata: size, timestamps, and ownership. Unix-family systems express permissions as three classes — **owner**, **group**, and **other** — each with read, write, and execute bits. Written in octal, \`chmod 640 report.txt\` grants the owner read and write, the group read-only, and everyone else nothing.

Note that on a directory, the execute bit means "may traverse into", not "may run". A directory with read but not execute permission lets you list names and nothing more.

## Least privilege

The rule that survives every platform change: grant an account the narrowest permissions that let it do its job. Administrative rights should be requested for a task and dropped afterwards, never held by default.`,
        questions: [
          {
            prompt: 'What mechanism does a user-mode program use to request a privileged operation from the kernel?',
            options: ['A system call', 'A compiler directive', 'A device driver rewrite', 'A direct hardware interrupt'],
            correctIndex: 0,
            explanation: 'System calls are the controlled entry point from user mode into kernel mode.',
          },
          {
            prompt: 'Which statement about threads and processes is correct?',
            options: [
              'Threads in the same process each get a private address space',
              'Threads in the same process share memory, while separate processes do not',
              'Processes are always faster to create than threads',
              'A process can contain only one thread',
            ],
            correctIndex: 1,
            explanation: 'Shared memory between threads is the defining difference, and the source of both efficiency and data races.',
          },
          {
            prompt: 'What does the permission mode 640 grant on a regular file?',
            options: [
              'Owner read and write, group read, others nothing',
              'Owner full control, group full control, others read',
              'Everyone read and write',
              'Owner read only, group write only, others execute',
            ],
            correctIndex: 0,
            explanation: 'Octal 6 is read+write for the owner, 4 is read for the group, and 0 removes all access for others.',
          },
          {
            prompt: 'Which responsibility does the kernel NOT hold?',
            options: [
              'Scheduling which thread runs on a CPU core',
              'Mapping virtual addresses to physical memory',
              'Deciding the visual layout of an application window',
              'Mediating access to storage devices',
            ],
            correctIndex: 2,
            explanation: 'Window layout is the job of user-space applications and desktop environments, not the kernel.',
          },
          {
            prompt: 'Applying the principle of least privilege to a daily-use account means:',
            options: [
              'Granting administrative rights permanently to avoid interruptions',
              'Running with the minimum permissions needed, and elevating only per task',
              'Sharing one administrator account across the team',
              'Disabling permission checks on trusted machines',
            ],
            correctIndex: 1,
            explanation: 'Least privilege means holding no more access than the current task requires, and dropping elevation afterwards.',
          },
        ],
      },
      {
        title: 'Networking from the Ground Up',
        summary: 'Layered models, addressing, DNS resolution, and what really happens when a page loads.',
        estimatedMinutes: 35,
        passMark: 70,
        rewardMinutes: 35,
        content: `## Why networking is layered

Networking is built in layers so each one can change without rewriting the others. The **TCP/IP model** has four:

1. **Link** — moving frames between devices on the same physical segment (Ethernet, Wi-Fi). Addressing is by **MAC address**.
2. **Internet** — moving packets between networks. Addressing is by **IP address**; routers make forwarding decisions here.
3. **Transport** — delivering data to the right program on a host, identified by **port number**. TCP and UDP live here.
4. **Application** — the protocol two programs actually speak: HTTP, DNS, SMTP, SSH.

The seven-layer **OSI model** is the teaching reference; its layers 5 to 7 collapse into TCP/IP's application layer.

## Addressing

An IPv4 address such as \`192.168.1.42\` is paired with a **subnet mask** like \`255.255.255.0\` (written \`/24\`) that splits it into a network portion and a host portion. Two hosts on the same subnet talk directly at the link layer. To reach anything else, a host sends the packet to its **default gateway** — the router — which forwards it onward.

Addresses in \`10.0.0.0/8\`, \`172.16.0.0/12\`, and \`192.168.0.0/16\` are **private**: not routable on the public internet, and translated at the edge by NAT.

## TCP versus UDP

**TCP** establishes a connection with a three-way handshake (SYN, SYN-ACK, ACK), numbers every byte, retransmits what is lost, and delivers a reliable ordered stream. **UDP** sends independent datagrams with no handshake, no ordering, and no retransmission — which is exactly what live audio and video want, because a late packet is worse than a missing one.

## What happens when a page loads

1. The browser resolves the hostname through **DNS**, walking from resolver to root to top-level domain to authoritative server unless a cached answer is found first.
2. It opens a **TCP connection** to the resulting IP address on port 443.
3. It performs a **TLS handshake**, validating the server certificate against a trusted authority and agreeing on session keys.
4. It sends an **HTTP request** and receives a response over the encrypted channel.

Almost every "the internet is down" report resolves to one of these four steps. Identifying which one saves hours.`,
        questions: [
          {
            prompt: 'At which layer of the TCP/IP model do routers make forwarding decisions?',
            options: ['Link layer', 'Internet layer', 'Transport layer', 'Application layer'],
            correctIndex: 1,
            explanation: 'Routers forward packets between networks using IP addresses, which is the internet layer.',
          },
          {
            prompt: 'Why is UDP preferred over TCP for live video calls?',
            options: [
              'UDP encrypts traffic while TCP does not',
              'UDP guarantees delivery order more strictly',
              'UDP avoids retransmission delays, and a late packet is worse than a lost one',
              'UDP uses fewer IP addresses',
            ],
            correctIndex: 2,
            explanation: 'Real-time media tolerates loss but not latency, so UDP’s lack of retransmission is an advantage.',
          },
          {
            prompt: 'A host with address 192.168.1.42/24 needs to reach 203.0.113.10. What does it do?',
            options: [
              'Send the packet directly to the destination at the link layer',
              'Send the packet to its default gateway for forwarding',
              'Broadcast the packet to every host on the subnet',
              'Refuse the connection because the address is private',
            ],
            correctIndex: 1,
            explanation: 'The destination is outside the local subnet, so the host hands the packet to its default gateway.',
          },
          {
            prompt: 'What is the correct order of the TCP three-way handshake?',
            options: ['ACK, SYN, SYN-ACK', 'SYN, SYN-ACK, ACK', 'SYN, ACK, FIN', 'SYN-ACK, SYN, ACK'],
            correctIndex: 1,
            explanation: 'The client sends SYN, the server replies SYN-ACK, and the client confirms with ACK.',
          },
          {
            prompt: 'Which step happens first when a browser loads https://example.com?',
            options: [
              'The TLS handshake negotiates session keys',
              'The HTTP request is transmitted',
              'DNS resolution converts the hostname to an IP address',
              'The TCP connection is established',
            ],
            correctIndex: 2,
            explanation: 'The browser must resolve the hostname to an IP address before it can open a TCP connection to it.',
          },
        ],
      },
      {
        title: 'Structured Troubleshooting',
        summary: 'A repeatable diagnostic method, plus the evidence sources that make it work.',
        estimatedMinutes: 25,
        passMark: 70,
        rewardMinutes: 30,
        content: `## Why method beats intuition

Unstructured troubleshooting means changing things until the symptom disappears. It sometimes works, it never explains, and it frequently introduces a second fault. A structured method produces a fix *and* an explanation.

## The six steps

1. **Identify the problem.** Gather the exact symptom, its scope, and when it started. "Email is broken" is not a symptom; "Outlook returns error 0x800CCC0E for three users in the Kigali office since 09:00" is.
2. **Establish a theory of probable cause.** Start from what changed. Most faults follow a change: a deployment, an update, an expiry, a configuration edit.
3. **Test the theory.** Design a test that can *disprove* it. A theory that no observation could contradict is not useful.
4. **Establish a plan of action.** Consider blast radius, rollback path, and whether a maintenance window is needed.
5. **Implement the fix and verify** — not only that the symptom is gone, but that nothing adjacent broke.
6. **Document the outcome.** Record cause, fix, and prevention. Undocumented fixes get rediscovered at 03:00 by someone else.

## Narrowing the scope

The fastest diagnostic question is *how wide is this?*

- One user, one machine, everyone else fine → local: profile, client configuration, hardware.
- Every user on one subnet → network segment: switch, VLAN, DHCP scope.
- Every user everywhere → shared service: the server, DNS, authentication, or the internet link.

## Reading the evidence

Logs, monitoring dashboards, and reproduction attempts beat speculation every time. Two habits matter most: **change one variable at a time**, so a successful test tells you something specific, and **read the actual error text** rather than paraphrasing it, because error codes are searchable and paraphrases are not.

When escalating, hand over the symptom, the scope, the theories already eliminated, and the evidence for each. An escalation without eliminated theories just restarts the work.`,
        questions: [
          {
            prompt: 'What is the correct first step of a structured troubleshooting method?',
            options: [
              'Apply the most likely fix immediately',
              'Identify the problem precisely, including its scope and start time',
              'Restart the affected server',
              'Escalate to the vendor',
            ],
            correctIndex: 1,
            explanation: 'Every later step depends on an accurate description of the symptom and its scope.',
          },
          {
            prompt: 'Users on one subnet cannot reach any internal service, while all other subnets are fine. Where should you look first?',
            options: [
              'The individual user workstations',
              'The network segment: switch, VLAN, or DHCP scope for that subnet',
              'The public internet link',
              'The application source code',
            ],
            correctIndex: 1,
            explanation: 'The scope of the fault points directly at infrastructure shared by exactly that subnet.',
          },
          {
            prompt: 'Why should you change only one variable at a time while testing?',
            options: [
              'It reduces the number of tickets raised',
              'It ensures each result attributes the outcome to a specific change',
              'It is required by most software licences',
              'It makes the fix permanent',
            ],
            correctIndex: 1,
            explanation: 'Multiple simultaneous changes make it impossible to know which one mattered.',
          },
          {
            prompt: 'A good theory of probable cause should be:',
            options: [
              'Broad enough that it cannot be contradicted',
              'Testable, so that an observation could disprove it',
              'Based on the most expensive component',
              'Kept private until the fix is applied',
            ],
            correctIndex: 1,
            explanation: 'A theory is only useful if a test could falsify it.',
          },
          {
            prompt: 'Why does documenting the resolution matter after the symptom is gone?',
            options: [
              'It satisfies a formality with no practical value',
              'It records cause, fix, and prevention so the fault is not rediagnosed later',
              'It transfers responsibility to another team',
              'It is only needed for hardware faults',
            ],
            correctIndex: 1,
            explanation: 'Documentation preserves the diagnosis so recurrence is recognised immediately.',
          },
        ],
      },
    ],
  };
