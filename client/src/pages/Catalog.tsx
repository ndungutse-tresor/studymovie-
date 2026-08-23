import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { CourseSummary, Level } from '../lib/types';
import { LEVEL_LABEL } from '../lib/format';
import { Callout, EmptyState, PageHeader, Skeleton, TextInput } from '../components/ui';
import { CourseCard } from '../components/CourseCard';
import { Icon } from '../components/Icon';

type LevelFilter = Level | 'ALL';

const FILTERS: { value: LevelFilter; label: string }[] = [
  { value: 'ALL', label: 'All levels' },
  { value: 'BEGINNER', label: LEVEL_LABEL.BEGINNER },
  { value: 'INTERMEDIATE', label: LEVEL_LABEL.INTERMEDIATE },
  { value: 'ADVANCED', label: LEVEL_LABEL.ADVANCED },
];

export default function Catalog() {
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState<LevelFilter>('ALL');
  const [category, setCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api
      .get<{ courses: CourseSummary[] }>('/learning/courses')
      .then((payload) => setCourses(payload.courses))
      .catch(() => setError('The catalog could not be loaded. Refresh to try again.'));
  }, []);

  const categories = useMemo(
    () => ['ALL', ...new Set((courses ?? []).map((course) => course.category))],
    [courses],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (courses ?? []).filter((course) => {
      if (level !== 'ALL' && course.level !== level) return false;
      if (category !== 'ALL' && course.category !== category) return false;
      if (!needle) return true;
      return (
        course.title.toLowerCase().includes(needle) ||
        course.summary.toLowerCase().includes(needle) ||
        course.category.toLowerCase().includes(needle)
      );
    });
  }, [courses, level, category, search]);

  const enrolled = filtered.filter((course) => course.enrolled);
  const available = filtered.filter((course) => !course.enrolled);

  if (error) return <Callout tone="danger">{error}</Callout>;

  return (
    <>
      <PageHeader
        eyebrow="Curriculum"
        title="Courses"
        description="Eight IT courses across beginner, intermediate, and advanced levels. Each chapter ends in an exam, and each pass earns viewing time."
      />

      <div className="panel mb-7 flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Icon
            name="search"
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <TextInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search courses"
            className="pl-10"
            aria-label="Search courses"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setLevel(filter.value)}
              className={`h-9 rounded-lg border px-3.5 text-sm font-medium transition ${
                level === filter.value
                  ? 'border-brand-500/50 bg-brand-500/15 text-brand-100'
                  : 'border-ink-600 text-slate-400 hover:border-ink-500 hover:text-slate-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Filter by category"
          className="input h-9 w-full py-0 lg:w-52"
        >
          {categories.map((entry) => (
            <option key={entry} value={entry}>
              {entry === 'ALL' ? 'All categories' : entry}
            </option>
          ))}
        </select>
      </div>

      {!courses ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-56" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title="No courses match those filters"
          description="Try a different level, category, or search term."
        />
      ) : (
        <>
          {enrolled.length > 0 ? (
            <section className="mb-9">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
                In progress
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {enrolled.map((course) => (
                  <CourseCard key={course.id} course={course} to={`/app/courses/${course.slug}`} />
                ))}
              </div>
            </section>
          ) : null}

          {available.length > 0 ? (
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
                {enrolled.length > 0 ? 'Also available' : 'Available courses'}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {available.map((course) => (
                  <CourseCard key={course.id} course={course} to={`/app/courses/${course.slug}`} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </>
  );
}
