import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { CourseSummary, Level } from '../lib/types';
import { LevelIndicator, LinkButton, Skeleton } from '../components/ui';
import { Icon } from '../components/Icon';
import { CourseCover } from '../components/CourseCover';

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
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-12 sm:px-6 lg:pt-16">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-brand-300">Curriculum</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Courses across three levels
        </h1>
        <p className="mt-5 text-[1.0625rem] leading-8 text-slate-400">
          Every course is split into chapters, and every chapter ends in an exam. Clear the pass mark and you
          earn a timed viewing session before the next chapter opens.
        </p>
      </div>

      {error ? <p className="mt-8 text-sm text-rose-300">{error}</p> : null}

      {!courses && !error ? (
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-80" />
          ))}
        </div>
      ) : null}

      {courses
        ? LEVELS.map((level) => {
            const group = courses.filter((course) => course.level === level);
            if (group.length === 0) return null;

            return (
              <section key={level} className="mt-16">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-white/[0.07] pb-4">
                  <div className="flex items-center gap-3">
                    <LevelIndicator level={level} className="text-lg font-semibold text-white" />
                    <span className="text-sm text-slate-600">
                      {group.length} {group.length === 1 ? 'course' : 'courses'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{LEVEL_BLURB[level]}</p>
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {group.map((course) => (
                    <article key={course.id} className="panel flex flex-col overflow-hidden">
                      <CourseCover
                        accent={course.accent}
                        category={course.category}
                        className="h-24 border-b border-white/[0.06]"
                      />
                      <div className="flex flex-1 flex-col p-5">
                        <p className="text-xs font-medium text-slate-500">{course.category}</p>
                        <h3 className="mt-1.5 font-semibold leading-snug tracking-tight text-white">{course.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-400">{course.summary}</p>

                        <ul className="mt-5 flex-1 space-y-2 border-t border-white/[0.06] pt-4">
                          {course.outcomes.slice(0, 3).map((outcome) => (
                            <li key={outcome} className="flex gap-2.5 text-[0.8rem] leading-5 text-slate-400">
                              <Icon name="check" size={14} className="mt-0.5 shrink-0 text-brand-400" />
                              {outcome}
                            </li>
                          ))}
                        </ul>

                        <div className="mt-5 flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Icon name="layers" size={13} />
                            {course.chapterCount} chapters
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Icon name="clock" size={13} />
                            {course.durationHours} hours
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })
        : null}

      <div className="relative isolate mt-20 overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-900 p-8 sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-24 -z-10 h-64 w-64 rounded-full bg-brand-500/25 blur-[80px]" />
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold tracking-tight text-white">Ready to enroll?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Applications are reviewed on submission. Approved applicants receive an access code to create their
              account, and are enrolled in their track’s entry course automatically.
            </p>
          </div>
          <LinkButton to="/apply" size="lg" iconAfter="arrow-right">
            Apply now
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
