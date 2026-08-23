import { Link } from 'react-router-dom';
import type { CourseSummary } from '../lib/types';
import { LEVEL_LABEL, LEVEL_TONE } from '../lib/format';
import { Badge, ProgressBar } from './ui';
import { Icon } from './Icon';

export function CourseCard({ course, to }: { course: CourseSummary; to: string }) {
  return (
    <Link
      to={to}
      className="panel group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-lift"
    >
      <div className="flex items-start justify-between gap-3">
        <Badge tone={LEVEL_TONE[course.level]}>{LEVEL_LABEL[course.level]}</Badge>
        {course.enrolled ? (
          <Badge tone="border-brand-500/30 bg-brand-500/10 text-brand-200" icon="check">
            Enrolled
          </Badge>
        ) : null}
      </div>

      <h3 className="mt-4 text-base font-semibold leading-snug text-white transition group-hover:text-brand-100">
        {course.title}
      </h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-slate-400">{course.summary}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Icon name="layers" size={13} />
          {course.chapterCount} chapters
        </span>
        <span className="flex items-center gap-1.5">
          <Icon name="clock" size={13} />
          {course.durationHours} hours
        </span>
        <span className="flex items-center gap-1.5">
          <Icon name="target" size={13} />
          {course.category}
        </span>
      </div>

      {course.enrolled ? (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {course.completedChapters} of {course.chapterCount} complete
            </span>
            <span className="font-semibold text-slate-300">{course.percentComplete}%</span>
          </div>
          <ProgressBar
            value={course.percentComplete}
            tone={course.percentComplete === 100 ? 'bg-emerald-500' : 'bg-brand-500'}
          />
        </div>
      ) : null}
    </Link>
  );
}
