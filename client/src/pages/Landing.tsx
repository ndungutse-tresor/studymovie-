import { Link } from 'react-router-dom';
import type { Level } from '../lib/types';
import { accentColors } from '../lib/format';
import { Icon, type IconName } from '../components/Icon';
import { LevelIndicator, LinkButton } from '../components/ui';
import { Poster } from '../components/Poster';
import { CourseCover } from '../components/CourseCover';

const TRACKS: { icon: IconName; label: string }[] = [
  { icon: 'code', label: 'Software Engineering' },
  { icon: 'cloud', label: 'Cloud and DevOps' },
  { icon: 'shield', label: 'Cybersecurity' },
  { icon: 'database', label: 'Data Engineering' },
  { icon: 'server', label: 'IT Support and Infrastructure' },
];

const STATS: [string, string][] = [
  ['8', 'Professional courses'],
  ['32', 'Chapters, each with an exam'],
  ['160', 'Graded exam questions'],
  ['5', 'Admission tracks'],
];

const STEPS: { icon: IconName; title: string; body: string; reward?: boolean }[] = [
  {
    icon: 'clipboard',
    title: 'Apply and get admitted',
    body: 'Choose a track and a level, state the hours you can commit, and receive a one-time access code.',
  },
  {
    icon: 'document',
    title: 'Study the chapter',
    body: 'Each chapter has a minimum reading time. The exam stays closed until it has genuinely elapsed.',
  },
  {
    icon: 'target',
    title: 'Pass the exam',
    body: 'Graded on the server against the published pass mark — usually 70 to 80 percent.',
  },
  {
    icon: 'ticket',
    title: 'Earn viewing time',
    body: 'A pass grants a timed session. Pick a film; the player closes itself when the minutes run out.',
    reward: true,
  },
  {
    icon: 'unlock',
    title: 'Unlock the next chapter',
    body: 'The moment the session ends, the next chapter opens. Repeat until the course is complete.',
  },
];

const CURRICULUM: { level: Level; blurb: string; courses: { title: string; category: string; accent: string }[] }[] = [
  {
    level: 'BEGINNER',
    blurb: 'No professional experience assumed.',
    courses: [
      { title: 'IT Systems Foundations', category: 'Core Infrastructure', accent: 'sky' },
      { title: 'Web Development Foundations', category: 'Software Engineering', accent: 'amber' },
      { title: 'Linux Command Line Essentials', category: 'Systems Administration', accent: 'emerald' },
    ],
  },
  {
    level: 'INTERMEDIATE',
    blurb: 'For people already building.',
    courses: [
      { title: 'Relational Databases and SQL', category: 'Data Engineering', accent: 'violet' },
      { title: 'Backend APIs with Node.js', category: 'Software Engineering', accent: 'cyan' },
      { title: 'Git and CI/CD Workflows', category: 'DevOps', accent: 'orange' },
    ],
  },
  {
    level: 'ADVANCED',
    blurb: 'Architecture and defence for practitioners.',
    courses: [
      { title: 'Cloud Architecture and Scalability', category: 'Cloud Architecture', accent: 'indigo' },
      { title: 'Applied Cybersecurity Defence', category: 'Security', accent: 'rose' },
    ],
  },
];

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'calendar',
    title: 'A schedule that prompts you',
    body: 'Set weekly study blocks in your own time zone and get an alert before each one, with desktop notifications when you allow them.',
  },
  {
    icon: 'bookmark',
    title: 'Watch later, or decline',
    body: 'Save a title for a future session, or decline it and it stops appearing in your recommendations.',
  },
  {
    icon: 'layers',
    title: 'Three levels, one path',
    body: 'Beginner to advanced across infrastructure, software engineering, data, DevOps, and security.',
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: 'How do I get an account?',
    a: 'Registration is by admission only. Submit an application with your track, level, and weekly commitment. Applications that meet the published criteria are admitted immediately with a one-time access code; the rest are held for a reviewer. The access code is what creates your account.',
  },
  {
    q: 'What happens if I fail an exam?',
    a: 'You see a full answer review with explanations, and you can retake the exam. After repeated failures a short cool-down applies, which is a prompt to go back to the material before trying again.',
  },
  {
    q: 'Can I save viewing time for later?',
    a: 'Earned time waits for you until you pick a film. Once the session starts its end time is fixed, and it is not paused or extended — minutes you do not use are not carried over.',
  },
  {
    q: 'Where do the films come from?',
    a: 'From collections that are free to watch and free to link to — primarily public-domain and freely redistributable features on the Internet Archive — not from unlicensed streaming sites.',
  },
  {
    q: 'Can I skip ahead if I already know the material?',
    a: 'No. Study time, exam grading, and the viewing clock are enforced on the server, so reloading or closing the tab does not skip a step. That is the point: the gate is what makes the reward mean something.',
  },
];

export default function Landing() {
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[46rem]" />
        <div className="pointer-events-none absolute left-1/2 top-[-18rem] -z-10 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-brand-500/20 blur-[120px]" />

        <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[1.08fr_1fr] lg:pb-28 lg:pt-20">
          <div className="animate-fade-up">
            <Link
              to="/apply"
              className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-xs font-medium text-slate-300 transition hover:border-white/20"
            >
              <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-2xs font-semibold text-brand-200">
                Admissions
              </span>
              Applications are reviewed on submission
              <Icon name="arrow-right" size={13} className="text-slate-500 transition group-hover:translate-x-0.5" />
            </Link>

            <h1 className="mt-7 text-[2.6rem] font-semibold leading-[1.04] tracking-[-0.035em] text-white sm:text-6xl lg:text-[3.5rem]">
              Finish the chapter.
              <br />
              Pass the exam.
              <span className="mt-1 block font-display font-normal italic tracking-normal text-reel-200">
                Then the film starts.
              </span>
            </h1>

            <p className="mt-7 max-w-lg text-[1.0625rem] leading-8 text-slate-400">
              StudyReel is a professional IT curriculum where screen time is earned. Clear each chapter’s exam
              at the published pass mark and unlock a timed viewing session — then the next chapter opens.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <LinkButton to="/apply" size="lg" iconAfter="arrow-right">
                Apply for a place
              </LinkButton>
              <LinkButton to="/catalog" size="lg" variant="secondary">
                Explore the curriculum
              </LinkButton>
            </div>

            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              {['Server-enforced progress', 'Public-domain films', 'Reminders in your time zone'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Icon name="check" size={14} className="text-brand-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <HeroMockup />
        </div>
      </section>

      {/* Tracks and numbers */}
      <section className="border-y border-white/[0.06] bg-ink-900/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Five admission tracks, one method
          </p>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {TRACKS.map((track) => (
              <li key={track.label} className="flex items-center gap-2.5 text-sm font-medium text-slate-300">
                <Icon name={track.icon} size={18} className="text-slate-500" />
                {track.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pt-20 sm:px-6">
        <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-white/[0.07] lg:grid-cols-4">
          {STATS.map(([value, label], index) => (
            <div
              key={label}
              className={`bg-ink-900/60 px-6 py-7 ${index % 2 === 1 ? 'border-l border-white/[0.07]' : ''} ${
                index >= 2 ? 'border-t border-white/[0.07] lg:border-t-0' : ''
              } ${index === 2 ? 'lg:border-l' : ''}`}
            >
              <dt className="sr-only">{label}</dt>
              <dd className="text-4xl font-semibold tracking-tight text-white">{value}</dd>
              <dd className="mt-1.5 text-sm text-slate-500">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* The loop */}
      <section className="py-24">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="How it works"
            title="Five steps, repeated until the course is finished"
            body="Every chapter runs the same loop. It is simple on purpose — the discipline comes from the fact that no step can be skipped."
          />

          <ol className="relative mt-14 grid gap-8 md:grid-cols-5 md:gap-5">
            <span className="absolute left-5 right-5 top-5 hidden h-px bg-gradient-to-r from-white/5 via-white/15 to-white/5 md:block" />
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative flex gap-4 md:block">
                <span
                  className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm ${
                    step.reward
                      ? 'border-reel-400/40 bg-reel-400/15 text-reel-200 shadow-glow-reel'
                      : 'border-white/10 bg-ink-800 text-slate-300'
                  }`}
                >
                  <Icon name={step.icon} size={17} />
                </span>
                <div className="md:mt-5">
                  <p className="font-mono text-2xs font-medium text-slate-600">0{index + 1}</p>
                  <h3 className="mt-1 font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Curriculum */}
      <section className="border-t border-white/[0.06] bg-ink-900/30 py-24">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              eyebrow="Curriculum"
              title="A progression from first principles to architecture"
              body="Eight courses across three levels. Every chapter carries its own pass mark and its own reward."
            />
            <LinkButton to="/catalog" variant="secondary" iconAfter="arrow-right">
              View the full curriculum
            </LinkButton>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {CURRICULUM.map((group) => (
              <div key={group.level} className="panel p-5">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                  <LevelIndicator level={group.level} className="text-sm text-white" />
                  <span className="text-xs text-slate-500">{group.blurb}</span>
                </div>
                <ul className="mt-2 divide-y divide-white/[0.05]">
                  {group.courses.map((course) => (
                    <li key={course.title} className="flex items-center gap-3.5 py-3.5">
                      <CourseCover
                        accent={course.accent}
                        category={course.category}
                        compact
                        className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-inset ring-white/10"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-100">{course.title}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: accentColors(course.accent)[0] }}
                          />
                          {course.category}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Built to be finished"
            title="The reward is real, and so is the gate"
            body="Every checkpoint is enforced on the server — which is precisely why it works."
            centered
          />

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            <div className="panel relative flex flex-col overflow-hidden p-7 lg:col-span-2 lg:row-span-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-400/25">
                <Icon name="shield" size={19} />
              </span>
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-white">Gates you cannot skip</h3>
              <p className="mt-2 max-w-lg text-sm leading-7 text-slate-400">
                The exam will not open before the minimum study time has elapsed, answers are graded where you
                cannot see them, and the viewing clock is fixed the moment it starts. Closing the tab does not
                buy extra minutes.
              </p>

              <div className="mt-8 rounded-xl border border-white/[0.07] bg-ink-950/70 p-2 lg:mt-auto">
                {[
                  { icon: 'document' as IconName, label: 'Study time', value: '30:00 elapsed', tone: 'text-emerald-300', done: true },
                  { icon: 'target' as IconName, label: 'Chapter exam', value: '80% · pass mark 75%', tone: 'text-emerald-300', done: true },
                  { icon: 'ticket' as IconName, label: 'Viewing session', value: '28:14 remaining', tone: 'text-reel-300', done: false },
                  { icon: 'lock' as IconName, label: 'Next chapter', value: 'Opens when the session ends', tone: 'text-slate-500', done: false },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 rounded-lg px-3.5 py-3 odd:bg-white/[0.02]"
                  >
                    <span className="flex items-center gap-3 text-sm text-slate-300">
                      <Icon name={row.icon} size={16} className="text-slate-500" />
                      {row.label}
                    </span>
                    <span className={`flex items-center gap-1.5 text-right text-sm font-medium ${row.tone}`}>
                      {row.done ? <Icon name="check" size={14} /> : null}
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {FEATURES.map((feature) => (
              <div key={feature.title} className="panel p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05] text-slate-300 ring-1 ring-inset ring-white/10">
                  <Icon name={feature.icon} size={17} />
                </span>
                <h3 className="mt-4 font-semibold text-white">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-400">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/[0.06] py-24">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading
            eyebrow="Questions"
            title="Frequently asked"
            body="How admission, exams, and viewing sessions work in practice."
          />
          <div className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left font-medium text-slate-100">
                  {item.q}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-slate-400 transition group-open:rotate-45">
                    <Icon name="plus" size={14} />
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl pr-10 text-sm leading-7 text-slate-400">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="relative isolate mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-900 px-6 py-16 text-center sm:px-12">
          <div className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-60" />
          <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-64 w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/25 blur-[90px]" />
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Your next film is one chapter away.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[0.9375rem] leading-7 text-slate-400">
            Apply in a few minutes. Meet the criteria and you are admitted immediately, with an access code to
            create your account.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkButton to="/apply" size="lg" variant="light" iconAfter="arrow-right">
              Start your application
            </LinkButton>
            <LinkButton to="/application-status" size="lg" variant="secondary">
              Track an application
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
  centered,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className="text-sm font-medium text-brand-300">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-[2.25rem] sm:leading-[1.15]">
        {title}
      </h2>
      {body ? <p className="mt-4 text-[0.9375rem] leading-7 text-slate-400">{body}</p> : null}
    </div>
  );
}

/** A still of the learner application, composed from the real UI pieces. */
function HeroMockup() {
  const films = [
    { title: 'Metropolis', year: 1927, genre: 'Science Fiction' },
    { title: 'The General', year: 1926, genre: 'Comedy' },
    { title: 'Charade', year: 1963, genre: 'Mystery' },
    { title: 'Nosferatu', year: 1922, genre: 'Horror' },
  ];

  return (
    <div className="relative animate-fade-up [animation-delay:120ms]" aria-hidden="true">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] ring-1 ring-black/40">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-white/[0.07] bg-ink-950/80 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="ml-3 flex-1 rounded-md bg-white/[0.04] px-3 py-1 text-center text-2xs text-slate-500">
            StudyReel — Dashboard
          </span>
        </div>

        <div className="flex">
          {/* Rail */}
          <div className="hidden w-12 shrink-0 flex-col items-center gap-3 border-r border-white/[0.06] py-4 sm:flex">
            {(['dashboard', 'library', 'calendar', 'film', 'bookmark'] as IconName[]).map((name, index) => (
              <span
                key={name}
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  index === 0 ? 'bg-white/[0.08] text-brand-300' : 'text-slate-600'
                }`}
              >
                <Icon name={name} size={15} />
              </span>
            ))}
          </div>

          <div className="min-w-0 flex-1 space-y-3.5 p-4 sm:p-5">
            <div>
              <p className="text-2xs text-slate-500">Good evening</p>
              <p className="text-sm font-semibold text-white">Amina, here is where you left off</p>
            </div>

            <div className="flex items-center gap-3.5 rounded-xl border border-white/[0.07] bg-ink-850 p-3">
              <CourseCover
                accent="emerald"
                category="Systems Administration"
                compact
                className="h-12 w-12 shrink-0 rounded-lg ring-1 ring-inset ring-white/10"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-2xs text-slate-500">Linux Command Line Essentials · Chapter 3</p>
                <p className="truncate text-[0.8rem] font-semibold text-white">Users, Permissions, and Ownership</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.08]">
                  <div className="h-full w-1/2 rounded-full bg-brand-500" />
                </div>
              </div>
              <span className="hidden rounded-md bg-brand-500 px-2.5 py-1.5 text-2xs font-semibold text-white sm:block">
                Take exam
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-reel-400/25 bg-gradient-to-r from-reel-400/[0.12] to-transparent p-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-reel-400/20 text-reel-200">
                  <Icon name="ticket" size={17} />
                </span>
                <div>
                  <p className="text-[0.8rem] font-semibold text-white">35 minutes earned</p>
                  <p className="text-2xs text-reel-200/70">Pipes, Redirection, and Text Processing</p>
                </div>
              </div>
              <span className="rounded-md bg-reel-400 px-2.5 py-1.5 text-2xs font-semibold text-ink-950">
                Choose a film
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {films.map((film) => (
                <Poster
                  key={film.title}
                  title={film.title}
                  year={film.year}
                  genre={film.genre}
                  size="xs"
                  className="aspect-[2/3] rounded-md ring-1 ring-white/10"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating details */}
      <div className="absolute -bottom-9 -left-5 hidden items-center gap-3 rounded-xl border border-white/10 bg-ink-850/95 px-4 py-3 shadow-lift backdrop-blur sm:flex">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
          <Icon name="check" size={16} />
        </span>
        <div>
          <p className="text-xs font-semibold text-white">Exam passed · 80%</p>
          <p className="text-2xs text-slate-500">Viewing session granted</p>
        </div>
      </div>

      <div className="absolute -right-3 -top-5 hidden rounded-xl border border-white/10 bg-ink-850/95 px-4 py-2.5 text-center shadow-lift backdrop-blur sm:block">
        <p className="text-2xs uppercase tracking-wider text-slate-500">Session closes in</p>
        <p className="font-mono text-lg font-semibold tabular-nums text-reel-200">28:14</p>
      </div>
    </div>
  );
}

