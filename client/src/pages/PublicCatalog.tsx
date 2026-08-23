import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { CourseSummary, Level } from '../lib/types';
import { LEVEL_LABEL, LEVEL_TONE } from '../lib/format';
import { Badge, LinkButton, Skeleton } from '../components/ui';
import { Icon } from '../components/Icon';

const LEVELS: Level[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

const LEVEL_BLURB: Record<Level, string> = {
  BEGINNER: 'Entry points that assume no prior professional experience.',
  INTERMEDIATE: 'For people already building, who need depth and correctness.',
  ADVANCED: 'Architecture and defence work for practising engineers.',
};

export default function PublicCatalog() {
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ courses: CourseSummary[] }>('/learning/courses')
      .then((payload) => setCourses(payload.courses))
      .catch(() => setError('The catalog could not be loaded. Refresh to try again.'));
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
      <p className="eyebrow">Curriculum</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Courses across three levels
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
        Every course is split into chapters, and every chapter ends in an exam. Clear the pass mark and
        you earn a timed viewing session before the next chapter opens.
      </p>

      {error ? <p className="mt-8 text-sm text-rose-300">{error}</p> : null}

      {!courses && !error ? (
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-52" />
          ))}
        </div>
      ) : null}

      {courses
        ? LEVELS.map((level) => {
            const group = courses.filter((course) => course.level === level);
            if (group.length === 0) return null;

            return (
              <section key={level} className="mt-14">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-ink-800 pb-4">
                  <h2 className="text-xl font-bold tracking-tight text-white">{LEVEL_LABEL[level]}</h2>
                  <Badge tone={LEVEL_TONE[level]}>{group.length} courses</Badge>
                  <p className="text-sm text-slate-500">{LEVEL_BLURB[level]}</p>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.map((course) => (
                    <article key={course.id} className="panel flex flex-col p-5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        {course.category}
                      </span>
                      <h3 className="mt-2 font-semibold leading-snug text-white">{course.title}</h3>
                      <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">{course.summary}</p>

                      <ul className="mt-4 space-y-1.5 border-t border-ink-800 pt-4">
                        {course.outcomes.slice(0, 3).map((outcome) => (
                          <li key={outcome} className="flex gap-2 text-xs leading-5 text-slate-400">
                            <Icon name="check" size={13} className="mt-0.5 shrink-0 text-brand-400" />
                            {outcome}
                          </li>
                        ))}
                      </ul>

                      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Icon name="layers" size={13} />
                          {course.chapterCount} chapters
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Icon name="clock" size={13} />
                          {course.durationHours} hours
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })
        : null}

      <div className="panel mt-16 flex flex-wrap items-center justify-between gap-5 p-7">
        <div>
          <h2 className="text-lg font-semibold text-white">Ready to enroll?</h2>
          <p className="mt-1.5 text-sm text-slate-400">
            Applications are reviewed on submission. Approved applicants receive an access code to create
            their account.
          </p>
        </div>
        <LinkButton to="/apply" size="lg" iconAfter="arrow-right">
          Apply now
        </LinkButton>
      </div>
    </div>
  );
}
