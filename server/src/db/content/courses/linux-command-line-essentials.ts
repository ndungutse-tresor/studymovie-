import type { SeedCourse } from '../types.js';

export const linuxCommandLineEssentials: SeedCourse = {
  slug: 'linux-command-line-essentials',
  title: 'Linux Command Line Essentials',
  summary: 'Navigate the filesystem, compose commands with pipes, manage permissions, and control services.',
  description:
    'Linux runs the overwhelming majority of servers, containers, and cloud instances. This course builds fluency at the shell: the filesystem layout, text-processing pipelines, permission and ownership models, process control, and the package and service tooling used on production hosts.',
  category: 'Systems Administration',
  level: 'BEGINNER',
  durationHours: 9,
  accent: 'emerald',
  outcomes: [
    'Navigate and manipulate the filesystem confidently from a shell',
    'Compose small tools into pipelines with redirection',
    'Reason about ownership, permission bits, and privilege escalation',
    'Inspect processes and manage services with systemd',
  ],
  prerequisites: ['IT Systems Foundations, or equivalent familiarity with operating systems'],
  chapters: [
    {
      title: 'The Shell and the Filesystem',
      summary: 'Absolute and relative paths, the standard directory layout, and core navigation commands.',
      estimatedMinutes: 30,
      passMark: 70,
      rewardMinutes: 30,
      content: `## One tree, no drive letters

Linux presents a single hierarchy rooted at \`/\`. Additional disks and network shares are **mounted** into that tree at a directory rather than given a separate letter. The Filesystem Hierarchy Standard assigns meaning to the top level:

- \`/etc\` — system-wide configuration, plain text by convention.
- \`/home/<user>\` — per-user files. The shell abbreviates the current user's home as \`~\`.
- \`/var\` — data that changes at runtime: logs in \`/var/log\`, spools, caches.
- \`/usr/bin\`, \`/usr/local/bin\` — executables; distribution-managed and locally installed respectively.
- \`/tmp\` — scratch space, typically cleared on reboot.
- \`/proc\`, \`/sys\` — virtual filesystems exposing kernel and process state as files.

## Paths

An **absolute** path starts at the root: \`/var/log/syslog\`. A **relative** path starts from the working directory: \`log/syslog\`. Two entries exist in every directory: \`.\` is the directory itself and \`..\` is its parent. \`cd ..\` therefore moves up one level, and \`./script.sh\` runs a script in the current directory — the explicit \`./\` is required because the working directory is deliberately absent from \`PATH\`.

## Core navigation

\`\`\`
pwd                 # print working directory
ls -lah /var/log    # long listing, all entries, human-readable sizes
cd /etc             # change directory
find /etc -name "*.conf" -type f
\`\`\`

\`ls -l\` output begins with ten characters: a file-type indicator (\`-\` regular, \`d\` directory, \`l\` symbolic link) followed by three permission triads.

## Names are case-sensitive

\`Report.txt\` and \`report.txt\` are different files. Filenames beginning with a dot are hidden from a plain \`ls\` and shown by \`ls -a\`. A space in a filename must be quoted or escaped, which is why configuration and script filenames conventionally use hyphens or underscores instead.`,
      questions: [
        {
          prompt: 'Where does a Linux system conventionally store system-wide configuration files?',
          options: ['/var', '/etc', '/usr/bin', '/proc'],
          correctIndex: 1,
          explanation: '/etc holds system-wide configuration, traditionally as editable plain text.',
        },
        {
          prompt: 'What does `..` refer to inside any directory?',
          options: ['The directory itself', 'The parent directory', 'The root of the filesystem', 'The user home directory'],
          correctIndex: 1,
          explanation: '`.` is the current directory and `..` is its parent.',
        },
        {
          prompt: 'Why must a script in the current directory be run as ./script.sh rather than script.sh?',
          options: [
            'The ./ prefix marks the file as executable',
            'The current directory is deliberately not part of PATH',
            'Bash requires a prefix for all shell scripts',
            'It selects the correct interpreter',
          ],
          correctIndex: 1,
          explanation: 'Omitting the working directory from PATH prevents accidentally running a look-alike binary; the explicit path bypasses PATH lookup.',
        },
        {
          prompt: 'In `ls -l` output, what does a leading `d` indicate?',
          options: ['The file is deleted', 'The entry is a directory', 'The file is a device node', 'The owner has no read access'],
          correctIndex: 1,
          explanation: 'The first character is the file type: `-` regular file, `d` directory, `l` symbolic link.',
        },
        {
          prompt: 'Which directory holds runtime log data?',
          options: ['/var/log', '/etc/log', '/usr/log', '/tmp/log'],
          correctIndex: 0,
          explanation: '/var holds variable runtime data, with logs under /var/log.',
        },
      ],
    },
    {
      title: 'Pipes, Redirection, and Text Processing',
      summary: 'Standard streams, composing small tools, and the grep/sort/awk toolkit.',
      estimatedMinutes: 30,
      passMark: 70,
      rewardMinutes: 30,
      content: `## Three standard streams

Every process starts with three open streams: **stdin** (0), **stdout** (1), and **stderr** (2). Keeping normal output and errors separate is what makes composition safe — a pipeline consumes stdout while errors still reach the terminal.

\`\`\`
command > out.txt        # redirect stdout, truncating the file
command >> out.txt       # redirect stdout, appending
command 2> errors.txt    # redirect stderr only
command > all.txt 2>&1   # both streams to one file
command < input.txt      # feed a file to stdin
\`\`\`

The order in \`> all.txt 2>&1\` matters: stdout is pointed at the file first, then stderr is pointed at wherever stdout now goes. Reversing them sends stderr to the terminal.

## Pipelines

A pipe connects one command's stdout to the next command's stdin, and this is the central idea of the Unix toolkit — many small programs, each doing one thing, combined at the shell:

\`\`\`
grep "ERROR" /var/log/app.log | awk '{print $5}' | sort | uniq -c | sort -rn | head -10
\`\`\`

That reads as: select error lines, extract the fifth whitespace-separated field, sort so identical values are adjacent, count each run, sort numerically descending, and show the ten most frequent. \`uniq -c\` only collapses *adjacent* duplicates, which is why the first \`sort\` is required rather than optional.

## The workhorses

- \`grep -i -r -n "pattern" path\` — search recursively, case-insensitively, with line numbers. \`-v\` inverts the match.
- \`sort\` — orders lines; \`-n\` numeric, \`-r\` reverse, \`-k2\` by second field.
- \`cut -d: -f1 /etc/passwd\` — split on a delimiter and select fields.
- \`awk '$3 > 100 {print $1, $3}'\` — filter by a field condition and print chosen columns.
- \`sed 's/old/new/g' file\` — stream substitution.
- \`wc -l\` — count lines.
- \`tail -f /var/log/app.log\` — follow a file as it grows, the standard way to watch a live service.

## Exit status

Every command returns a status: \`0\` means success, anything else is failure. \`$?\` holds the last status. \`&&\` runs the next command only on success and \`||\` only on failure, which is why \`make build && make deploy\` will not deploy a failed build.`,
      questions: [
        {
          prompt: 'What does the pipe operator connect?',
          options: [
            'The stdout of the left command to the stdin of the right command',
            'The stderr of both commands into one file',
            'Two files into a single stream',
            'A command to a background job',
          ],
          correctIndex: 0,
          explanation: 'A pipe wires stdout of one process into stdin of the next.',
        },
        {
          prompt: 'Why must `sort` precede `uniq -c` when counting occurrences?',
          options: [
            'uniq requires numeric input',
            'uniq only collapses adjacent duplicate lines',
            'sort removes error output',
            'uniq cannot read from a pipe',
          ],
          correctIndex: 1,
          explanation: 'uniq compares neighbouring lines only, so identical values must first be brought together by sorting.',
        },
        {
          prompt: 'Which redirection sends both stdout and stderr to the same file?',
          options: ['command > file', 'command 2> file', 'command > file 2>&1', 'command < file'],
          correctIndex: 2,
          explanation: 'stdout is redirected first, then stderr is duplicated onto the same destination.',
        },
        {
          prompt: 'What exit status conventionally indicates success?',
          options: ['1', '0', '-1', '200'],
          correctIndex: 1,
          explanation: 'Zero means success; any non-zero value signals a specific failure.',
        },
        {
          prompt: 'What does `make build && make deploy` guarantee?',
          options: [
            'Both commands run regardless of outcome',
            'deploy runs only if build exited successfully',
            'deploy runs only if build failed',
            'The two commands run concurrently',
          ],
          correctIndex: 1,
          explanation: '&& is short-circuiting: the right-hand command runs only on a zero exit status.',
        },
      ],
    },
    {
      title: 'Users, Permissions, and Ownership',
      summary: 'The permission triad, octal notation, sudo, and safe privilege escalation.',
      estimatedMinutes: 30,
      passMark: 75,
      rewardMinutes: 30,
      content: `## Every file has an owner and a group

Permissions are evaluated against three classes in order: the **owner**, then the **group**, then **others**. The first matching class applies — a file owned by you with mode \`044\` is unreadable *by you*, because the owner triad is checked first and grants nothing.

Each class carries three bits:

| Bit | Value | On a file | On a directory |
|---|---|---|---|
| r | 4 | read contents | list entry names |
| w | 2 | modify contents | create/delete entries |
| x | 1 | execute as a program | traverse into it |

The directory column is the part that trips people up. Read without execute on a directory lets you see names but not stat or open anything inside. Execute without read lets you open a known path but not list the directory.

## Octal notation

Sum the bits per class:

\`\`\`
chmod 644 notes.txt    # rw- r-- r--   owner writes, everyone reads
chmod 600 id_rsa       # rw- --- ---   private key: owner only
chmod 755 deploy.sh    # rwx r-x r-x   everyone runs, owner edits
chmod 750 /srv/app     # rwx r-x ---   team traverses, others excluded
\`\`\`

SSH refuses to use a private key whose mode is broader than \`600\`, which is a deliberate safety check rather than a bug.

## Changing ownership

\`chown user:group path\` sets both, and \`-R\` recurses. Ownership changes require root, because otherwise a user could hand a file to someone else to bypass quotas or auditing.

## sudo, not root

Logging in as root leaves no attribution and no safety net. \`sudo\` runs a single command as another user, logs who ran what, and can be restricted per-command in \`/etc/sudoers\`. Edit that file only with \`visudo\`, which validates syntax before saving — a malformed sudoers file can lock every administrator out of the machine.

Two habits worth keeping: never grant \`chmod 777\`, which makes a path world-writable and is almost always a symptom of a wrong ownership setting; and prefer adding a user to a group over widening a file's permissions.`,
      questions: [
        {
          prompt: 'What does mode 640 grant?',
          options: [
            'Owner read/write, group read, others nothing',
            'Owner read/write/execute, group read, others read',
            'Everyone read and write',
            'Owner read, group read/write, others execute',
          ],
          correctIndex: 0,
          explanation: '6 = rw- for the owner, 4 = r-- for the group, 0 = --- for others.',
        },
        {
          prompt: 'On a directory, what does the execute bit permit?',
          options: [
            'Running the directory as a program',
            'Traversing into the directory to reach entries inside it',
            'Deleting the directory',
            'Listing the names it contains',
          ],
          correctIndex: 1,
          explanation: 'On directories, execute means traverse; the read bit is what lists names.',
        },
        {
          prompt: 'Why does SSH refuse a private key file with mode 644?',
          options: [
            'The key is corrupted at that permission level',
            'The key is readable by other accounts, so SSH treats it as compromised',
            'SSH requires the execute bit on key files',
            '644 prevents the owner from reading the key',
          ],
          correctIndex: 1,
          explanation: 'A private key readable beyond its owner is considered exposed, so SSH refuses it deliberately.',
        },
        {
          prompt: 'Why should /etc/sudoers be edited only with visudo?',
          options: [
            'visudo encrypts the file',
            'visudo validates the syntax before saving, preventing an administrator lockout',
            'Other editors cannot open the file',
            'visudo automatically grants root to all users',
          ],
          correctIndex: 1,
          explanation: 'A syntax error in sudoers can make privilege escalation impossible; visudo validates before writing.',
        },
        {
          prompt: 'A colleague suggests chmod 777 to fix a permission error. Why is that the wrong fix?',
          options: [
            'It makes the path writable by every account on the system',
            'It removes the owner’s access',
            'It only works on directories',
            'It requires a reboot to take effect',
          ],
          correctIndex: 0,
          explanation: 'World-writable permissions expose the path to every account; the real fix is usually correct ownership or group membership.',
        },
      ],
    },
    {
      title: 'Processes, Services, and Packages',
      summary: 'Inspecting running work, signals, systemd units, and package management.',
      estimatedMinutes: 30,
      passMark: 70,
      rewardMinutes: 35,
      content: `## Seeing what is running

Every process has a **PID**, a parent, an owner, and a state.

\`\`\`
ps aux | grep nginx        # snapshot of running processes
top                        # live view, sorted by CPU
htop                       # interactive alternative where installed
kill -TERM 4821            # ask a process to shut down cleanly
kill -KILL 4821            # force termination, no cleanup
\`\`\`

\`SIGTERM\` (15) is a request: the process can flush buffers, close connections, and exit tidily. \`SIGKILL\` (9) is executed by the kernel and cannot be handled, so the process loses any chance to clean up. Always try TERM first; reserve KILL for a process that ignores it.

## Foreground, background, and detachment

\`command &\` starts a job in the background, \`jobs\` lists them, and \`fg %1\` brings one forward. Background jobs still belong to your shell session and die when it ends, so long-running work belongs in \`nohup\`, \`tmux\`, or — properly — a service unit.

## systemd

On modern distributions, **systemd** supervises long-running services. Units are described by files in \`/etc/systemd/system\` and controlled with \`systemctl\`:

\`\`\`
systemctl status nginx     # current state and recent log lines
systemctl start|stop|restart nginx
systemctl enable nginx     # start automatically at boot
systemctl daemon-reload    # re-read unit files after editing one
journalctl -u nginx -f     # follow this unit's logs
\`\`\`

The distinction that matters operationally: \`start\` affects the machine *now*, \`enable\` affects what happens *after a reboot*. A service that was started but never enabled disappears on the next restart, which is a common cause of "it worked until we rebooted".

## Packages

Debian and Ubuntu use \`apt\`; RHEL, Fedora, and derivatives use \`dnf\`.

\`\`\`
sudo apt update && sudo apt install nginx
sudo dnf install nginx
\`\`\`

\`apt update\` refreshes the package index and \`apt upgrade\` installs newer versions — updating the index alone changes nothing on disk. Package managers resolve dependencies and record what they installed, which is why installing from a distribution repository is preferable to unpacking a tarball by hand.

## Disk and resource checks

\`df -h\` shows free space per mounted filesystem and \`du -sh *\` shows what is consuming a directory. A full \`/var\` is one of the most common causes of a service that starts and immediately dies, because it can no longer write its logs.`,
      questions: [
        {
          prompt: 'What is the practical difference between SIGTERM and SIGKILL?',
          options: [
            'SIGTERM is faster than SIGKILL',
            'SIGTERM can be handled so the process shuts down cleanly; SIGKILL cannot be handled',
            'SIGKILL only works on background jobs',
            'SIGTERM restarts the process automatically',
          ],
          correctIndex: 1,
          explanation: 'SIGTERM is a catchable request allowing cleanup; SIGKILL is enforced by the kernel with no cleanup.',
        },
        {
          prompt: 'A service runs correctly after `systemctl start`, but is gone after a reboot. What was missed?',
          options: ['systemctl enable', 'systemctl daemon-reload', 'systemctl restart', 'journalctl -u'],
          correctIndex: 0,
          explanation: 'start affects the running system; enable registers the unit to start at boot.',
        },
        {
          prompt: 'Which command follows the live log output of a systemd unit?',
          options: ['systemctl status nginx', 'journalctl -u nginx -f', 'ps aux | grep nginx', 'df -h'],
          correctIndex: 1,
          explanation: 'journalctl -u selects the unit and -f follows new entries as they arrive.',
        },
        {
          prompt: 'What does `sudo apt update` do on its own?',
          options: [
            'Installs all available package upgrades',
            'Refreshes the package index without changing installed software',
            'Removes unused dependencies',
            'Reboots into the newest kernel',
          ],
          correctIndex: 1,
          explanation: 'update refreshes metadata; upgrade is what actually installs newer versions.',
        },
        {
          prompt: 'A service starts and immediately exits. `df -h` shows /var at 100%. What is the likely cause?',
          options: [
            'The CPU is saturated',
            'The service cannot write its log files because the filesystem is full',
            'The package index is stale',
            'The unit file has the wrong owner',
          ],
          correctIndex: 1,
          explanation: 'A full /var prevents log writes, which commonly causes services to fail immediately at startup.',
        },
      ],
    },
  ],
};
