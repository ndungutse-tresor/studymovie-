import { Link } from 'react-router-dom';
import type { CourseSummary } from '../lib/types';
import { Badge, LevelIndicator, ProgressBar } from './ui';
import { Icon } from './Icon';
import { CourseCover } from './CourseCover';

export function CourseCard({ course, to }: { course: CourseSummary; to: string }) {
  const done = course.enrolled && course.percentComplete === 100;

  return (
    <Link
      to={to}
      className="panel panel-hover group flex flex-col overflow-hidden hover:-translate-y-0.5 hover:shadow-lift"
    >
      <CourseCover accent={course.accent} category={course.category} className="h-28 border-b border-white/[0.06]">
        <div className="absolute right-3 top-3">
          {done ? (
            <Badge tone="border-emerald-400/30 bg-ink-950/70 text-emerald-300 backdrop-blur" icon="check">
              Completed
            </Badge>
          ) : course.enrolled ? (
            <Badge tone="border-white/15 bg-ink-950/70 text-slate-200 backdrop-blur">Enrolled</Badge>
          ) : null}
        </div>
      </CourseCover>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-xs font-medium text-slate-500">{course.category}</p>
          <LevelIndicator level={course.level} className="shrink-0 text-slate-400" />
        </div>

        <h3 className="mt-2 text-base font-semibold leading-snug tracking-tight text-white transition group-hover:text-brand-100">
          {course.title}
        </h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-slate-400">{course.summary}</p>

        {course.enrolled ? (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                {course.completedChapters} of {course.chapterCount} chapters
              </span>
              <span className="font-semibold tabular-nums text-slate-200">{course.percentComplete}%</span>
            </div>
            <ProgressBar value={course.percentComplete} tone={done ? 'bg-emerald-400' : 'bg-brand-500'} />
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-4 border-t border-white/[0.06] pt-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Icon name="layers" size={13} />
              {course.chapterCount} chapters
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="clock" size={13} />
              {course.durationHours} hours
            </span>
            <Icon
              name="arrow-right"
              size={15}
              className="ml-auto text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-300"
            />
          </div>
        )}
      </div>
    </Link>
  );
}
