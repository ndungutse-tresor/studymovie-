import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';
import { Badge, LinkButton } from '../components/ui';

const STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'clipboard',
    title: 'Apply and get admitted',
    body: 'Choose a track and a level, state the hours you can commit, and receive an access code once your application clears admissions.',
  },
  {
    icon: 'document',
    title: 'Study the chapter',
    body: 'Each chapter is a self-contained lesson with a minimum reading time. The exam stays closed until that time has genuinely elapsed.',
  },
  {
    icon: 'target',
    title: 'Pass the exam',
    body: 'Answer the chapter’s question bank. Grading happens on the server against the published pass mark — usually 70 to 80 percent.',
  },
  {
    icon: 'film',
    title: 'Earn viewing time',
    body: 'A pass unlocks a timed viewing session. Pick a film, watch it, and the player closes itself when the granted minutes run out.',
  },
  {
    icon: 'unlock',
    title: 'Continue to the next chapter',
    body: 'The moment the session ends, the next chapter unlocks. The cycle repeats until the course is complete.',
  },
];

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'layers',
    title: 'Three levels, one path',
    body: 'Beginner, intermediate, and advanced courses across infrastructure, software engineering, data, DevOps, and security.',
  },
  {
    icon: 'calendar',
    title: 'A schedule that prompts you',
    body: 'Set weekly study blocks in your own time zone and get an alert before each one, with browser notifications when you allow them.',
  },
  {
    icon: 'bookmark',
    title: 'Watch later or decline',
    body: 'Browsing in your free time? Save a title for a future session, or decline it and it stops appearing in your recommendations.',
  },
  {
    icon: 'shield',
    title: 'Gates you cannot skip',
    body: 'Study time, exam grading, and the viewing clock are all enforced server-side. Closing the tab does not buy extra minutes.',
  },
];

export default function Landing() {
  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-16 sm:px-6 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-up">
            <Badge tone="border-brand-500/30 bg-brand-500/10 text-brand-200" icon="target">
              Study-gated streaming
            </Badge>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
              Finish the chapter.
              <br />
              Pass the exam.
              <span className="block text-brand-300">Then the film starts.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-400">
              StudyReel turns screen time into something you earn. Work through a professional IT
              curriculum, clear each chapter’s exam at the published pass mark, and unlock a timed
              viewing session that closes itself and hands you the next chapter.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton to="/apply" size="lg" iconAfter="arrow-right">
                Apply for a place
              </LinkButton>
              <LinkButton to="/catalog" size="lg" variant="secondary" icon="library">
                Browse the catalog
              </LinkButton>
            </div>
            <dl className="mt-11 grid max-w-lg grid-cols-3 gap-6 border-t border-ink-800 pt-7">
              {[
                ['8', 'Courses'],
                ['32', 'Chapters'],
                ['160', 'Exam questions'],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="text-2xl font-bold text-white">{value}</dt>
                  <dd className="mt-0.5 text-xs uppercase tracking-wider text-slate-500">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="animate-fade-up panel overflow-hidden p-1.5">
            <div className="rounded-[0.85rem] bg-ink-950/60 p-5">
              <div className="flex items-center justify-between border-b border-ink-800 pb-4">
                <div>
                  <p className="eyebrow">Chapter 2 of 4</p>
                  <p className="mt-1 font-semibold text-white">Pipes, Redirection, and Text Processing</p>
                </div>
                <Badge tone="border-emerald-500/30 bg-emerald-500/10 text-emerald-300" icon="check">
                  Passed 80%
                </Badge>
              </div>

              <div className="space-y-3 py-5">
                {[
                  { label: 'Study time', value: 'Complete', tone: 'text-emerald-300', icon: 'check-circle' as IconName },
                  { label: 'Exam', value: '4 of 5 correct', tone: 'text-emerald-300', icon: 'check-circle' as IconName },
                  { label: 'Viewing session', value: '28:14 remaining', tone: 'text-violet-300', icon: 'clock' as IconName },
                  { label: 'Chapter 3', value: 'Unlocks when the session ends', tone: 'text-slate-500', icon: 'lock' as IconName },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-lg bg-ink-900/60 px-3.5 py-3">
                    <span className="flex items-center gap-2.5 text-sm text-slate-400">
                      <Icon name={row.icon} size={16} className={row.tone} />
                      {row.label}
                    </span>
                    <span className={`text-sm font-medium ${row.tone}`}>{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-violet-500/25 bg-violet-500/[0.07] p-4">
                <p className="text-xs uppercase tracking-wider text-violet-300/80">Now playing</p>
                <p className="mt-1.5 font-semibold text-white">Night of the Living Dead (1968)</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-700">
                  <div className="h-full w-[56%] rounded-full bg-violet-400" />
                </div>
                <p className="mt-2 text-xs text-slate-500">Closes automatically when the granted time expires.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-ink-800/70 bg-ink-950/40 py-16">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <p className="eyebrow">The loop</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Five steps, repeated until the course is finished
          </h2>

          <ol className="mt-10 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            {STEPS.map((step, index) => (
              <li key={step.title} className="panel flex flex-col p-5">
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/12 text-brand-300 ring-1 ring-inset ring-brand-500/25">
                  <Icon name={step.icon} size={19} />
                </span>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Step {index + 1}
                </p>
                <h3 className="mt-1.5 font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="eyebrow">Built for people who actually want to finish</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                The reward is real, and so is the gate
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-400">
                Every checkpoint is enforced on the server. The exam will not open before the minimum
                study time has elapsed, answers are graded where you cannot see them, and the viewing
                clock is fixed at the moment it starts. There is no version of this where you skip
                ahead — which is precisely why it works.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <LinkButton to="/apply" iconAfter="arrow-right">
                  Start your application
                </LinkButton>
                <Link
                  to="/application-status"
                  className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-slate-300 transition hover:text-white"
                >
                  Already applied? Track it
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="panel p-5">
                  <span className="mb-3.5 flex h-9 w-9 items-center justify-center rounded-lg bg-ink-800 text-slate-300">
                    <Icon name={feature.icon} size={17} />
                  </span>
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-400">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
