import { useEffect, useState, type ChangeEvent } from 'react';
import { ApiError, api } from '../lib/api';
import { Button, Callout, Field, LinkButton, Select, TextArea, TextInput } from '../components/ui';

type Level = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
type StorageMode = 'object' | 'local' | 'disabled';

interface ResourceDraft {
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

interface DraftQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const EMPTY_COURSE = { title: '', summary: '', description: '', category: '', level: 'BEGINNER' as Level };
const EMPTY_LESSON = {
  title: '',
  summary: '',
  content: '',
  estimatedMinutes: 25,
  passMark: 70,
  rewardMinutes: 30,
};

function readableSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminLearning() {
  const [course, setCourse] = useState(EMPTY_COURSE);
  const [lesson, setLesson] = useState(EMPTY_LESSON);
  const [resources, setResources] = useState<ResourceDraft[]>([]);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [questionCount, setQuestionCount] = useState(5);
  const [storageMode, setStorageMode] = useState<StorageMode>('disabled');
  const [aiConfigured, setAiConfigured] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ mode: StorageMode; aiConfigured: boolean }>('/learning-content/admin/upload-mode')
      .then((settings) => {
        setStorageMode(settings.mode);
        setAiConfigured(settings.aiConfigured);
      })
      .catch(() => setError('Could not load upload and AI settings.'))
      .finally(() => setLoadingSettings(false));
  }, []);

  function updateCourse(field: keyof typeof EMPTY_COURSE, value: string) {
    setCourse((current) => ({ ...current, [field]: value }));
  }

  function updateLesson(field: keyof typeof EMPTY_LESSON, value: string | number) {
    setLesson((current) => ({ ...current, [field]: value }));
  }

  async function uploadResources(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (resources.length + files.length > 10) {
      setError('Upload no more than 10 resources for a lesson.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      for (const file of files) {
        let resource: ResourceDraft;
        if (storageMode === 'object') {
          const ticket = await api.post<{
            uploadUrl: string;
            resourceUrl: string;
            contentType: string;
            headers: Record<string, string>;
          }>('/learning-content/admin/upload-url', { fileName: file.name, size: file.size });
          const response = await fetch(ticket.uploadUrl, {
            method: 'PUT',
            headers: ticket.headers,
            body: file,
          });
          if (!response.ok) throw new Error('Cloud storage rejected the upload. Check the bucket CORS settings.');
          resource = { name: file.name, url: ticket.resourceUrl, mimeType: ticket.contentType, sizeBytes: file.size };
        } else if (storageMode === 'local') {
          const result = await api.upload<{ resource: ResourceDraft }>(
            '/learning-content/admin/upload',
            file,
            'resource',
          );
          resource = result.resource;
        } else {
          throw new Error('Configure cloud object storage to upload resources on this deployment.');
        }
        setResources((current) => [...current, resource]);
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : 'Resource upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function draftQuestions() {
    setGenerating(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.post<{ questions: DraftQuestion[] }>('/learning-content/admin/generate-questions', {
        courseTitle: course.title,
        lessonTitle: lesson.title,
        lessonContent: lesson.content,
        resources: resources.map(({ name, url, sizeBytes }) => ({ name, url, sizeBytes })),
        questionCount,
      });
      setQuestions(result.questions);
      setNotice('Question draft ready. Review every answer before publishing.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'DeepSeek could not draft the exam.');
    } finally {
      setGenerating(false);
    }
  }

  function updateQuestion(index: number, update: Partial<DraftQuestion>) {
    setQuestions((current) => current.map((question, position) => position === index ? { ...question, ...update } : question));
  }

  async function publishCourse() {
    setPublishing(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.post<{ course: { title: string; slug: string } }>('/learning-content/admin/courses', {
        course,
        lesson,
        resources: resources.map(({ name, url, sizeBytes }) => ({ name, url, sizeBytes })),
        questions,
      });
      setNotice(`${result.course.title} is published in the learner course catalog.`);
      setCourse(EMPTY_COURSE);
      setLesson(EMPTY_LESSON);
      setResources([]);
      setQuestions([]);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not publish this course.');
    } finally {
      setPublishing(false);
    }
  }

  const canPublish = course.title.trim().length >= 3 && lesson.title.trim().length >= 3 && resources.length > 0 && questions.length >= 3;

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 border-b border-white/[0.08] pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow text-reel-300">Curriculum authoring</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Create a learning course</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Upload study material, review an AI-drafted exam, then publish.</p>
        </div>
        <LinkButton to="/admin" variant="secondary" icon="arrow-left">Admin overview</LinkButton>
      </section>

      {error ? <Callout tone="danger" title="Action failed">{error}</Callout> : null}
      {notice ? <Callout tone="success">{notice}</Callout> : null}
      {!aiConfigured && !loadingSettings ? (
        <Callout tone="warning" title="DeepSeek is not configured">
          Add <code>DEEPSEEK_API_KEY</code> to the server environment and restart the API to draft exam questions.
        </Callout>
      ) : null}

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
        <div className="space-y-8">
          <section className="space-y-4 border-b border-white/[0.08] pb-8">
            <h2 className="section-title text-lg">Course details</h2>
            <Field label="Course title" required>
              <TextInput required maxLength={160} value={course.title} onChange={(event) => updateCourse('title', event.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" required>
                <TextInput required maxLength={80} value={course.category} onChange={(event) => updateCourse('category', event.target.value)} placeholder="e.g. Web Development" />
              </Field>
              <Field label="Level" required>
                <Select value={course.level} onChange={(event) => updateCourse('level', event.target.value as Level)}>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </Select>
              </Field>
            </div>
            <Field label="Course summary" required>
              <TextInput required minLength={10} maxLength={300} value={course.summary} onChange={(event) => updateCourse('summary', event.target.value)} />
            </Field>
            <Field label="Course description" required>
              <TextArea required minLength={10} maxLength={2000} rows={3} value={course.description} onChange={(event) => updateCourse('description', event.target.value)} />
            </Field>
          </section>

          <section className="space-y-4 border-b border-white/[0.08] pb-8">
            <h2 className="section-title text-lg">First lesson</h2>
            <Field label="Lesson title" required>
              <TextInput required maxLength={160} value={lesson.title} onChange={(event) => updateLesson('title', event.target.value)} />
            </Field>
            <Field label="Lesson summary" required>
              <TextInput required minLength={10} maxLength={500} value={lesson.summary} onChange={(event) => updateLesson('summary', event.target.value)} />
            </Field>
            <Field label="Lesson notes or transcript" hint="Video resources need notes or a transcript for AI question drafting. Text from PDFs and Office files is extracted automatically.">
              <TextArea rows={7} maxLength={30000} value={lesson.content} onChange={(event) => updateLesson('content', event.target.value)} placeholder="Add key ideas, learning objectives, or a video transcript." />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Estimated lesson length (minutes)">
                <TextInput type="number" min={1} max={600} value={lesson.estimatedMinutes} onChange={(event) => updateLesson('estimatedMinutes', Number(event.target.value))} />
              </Field>
              <Field label="Pass mark (%)">
                <TextInput type="number" min={50} max={100} value={lesson.passMark} onChange={(event) => updateLesson('passMark', Number(event.target.value))} />
              </Field>
              <Field label="Watch reward (minutes)">
                <TextInput type="number" min={1} max={180} value={lesson.rewardMinutes} onChange={(event) => updateLesson('rewardMinutes', Number(event.target.value))} />
              </Field>
            </div>
          </section>

          <section className="space-y-4 border-b border-white/[0.08] pb-8">
            <div>
              <h2 className="section-title text-lg">Study resources</h2>
              <p className="mt-1 text-xs text-slate-500">PDF, DOC, DOCX, PPT, PPTX, MP4, WebM, OGG, MOV, M4V, MKV</p>
            </div>
            <input
              className="input file:mr-3 file:rounded-md file:border-0 file:bg-white/[0.1] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.webm,.ogg,.mov,.m4v,.mkv"
              disabled={uploading || storageMode === 'disabled' || loadingSettings}
              onChange={(event) => void uploadResources(event)}
            />
            {storageMode === 'disabled' ? <p className="hint">Configure object storage to upload files on this deployment.</p> : null}
            {storageMode === 'local' ? <p className="hint">Resources are saved on this development server.</p> : null}
            {uploading ? <p className="hint">Uploading resources...</p> : null}
            {resources.length > 0 ? (
              <ul className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
                {resources.map((resource, index) => (
                  <li key={resource.url} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <span className="min-w-0 truncate text-slate-200">{resource.name}</span>
                    <span className="flex shrink-0 items-center gap-3 text-xs text-slate-500">
                      {readableSize(resource.sizeBytes)}
                      <button type="button" className="text-slate-400 hover:text-white" aria-label={`Remove ${resource.name}`} onClick={() => setResources((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="section-title text-lg">Exam draft</h2>
                <p className="mt-1 text-xs text-slate-500">Review and correct every question before publishing.</p>
              </div>
              <div className="flex items-end gap-2">
                <Field label="Questions">
                  <Select value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))}>
                    {[5, 8, 10, 15].map((count) => <option key={count} value={count}>{count}</option>)}
                  </Select>
                </Field>
                <Button icon="refresh" loading={generating} disabled={!aiConfigured || resources.length === 0} onClick={() => void draftQuestions()}>
                  Draft with DeepSeek
                </Button>
              </div>
            </div>
            {questions.map((question, index) => (
              <article key={index} className="space-y-3 border-y border-white/[0.08] py-5">
                <Field label={`Question ${index + 1}`} required>
                  <TextArea rows={2} value={question.prompt} onChange={(event) => updateQuestion(index, { prompt: event.target.value })} />
                </Field>
                <div className="grid gap-2 sm:grid-cols-2">
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-answer-${index}`}
                        checked={question.correctIndex === optionIndex}
                        onChange={() => updateQuestion(index, { correctIndex: optionIndex })}
                        aria-label={`Mark option ${optionIndex + 1} as correct`}
                      />
                      <TextInput value={option} onChange={(event) => updateQuestion(index, { options: question.options.map((entry, item) => item === optionIndex ? event.target.value : entry) })} aria-label={`Question ${index + 1}, option ${optionIndex + 1}`} />
                    </div>
                  ))}
                </div>
                <Field label="Answer explanation" required>
                  <TextInput value={question.explanation} onChange={(event) => updateQuestion(index, { explanation: event.target.value })} />
                </Field>
              </article>
            ))}
          </section>

          <Button block icon="check" loading={publishing} disabled={!canPublish || uploading || generating} onClick={() => void publishCourse()}>
            Publish course to learner catalog
          </Button>
        </div>

        <aside className="h-fit space-y-4 border-t border-white/[0.08] pt-6 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
          <h2 className="section-title text-lg">Learner gate</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Estimated lesson</dt><dd className="text-slate-200">{lesson.estimatedMinutes} min</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Pass mark</dt><dd className="text-slate-200">{lesson.passMark}%</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Watch reward</dt><dd className="text-reel-300">{lesson.rewardMinutes} min</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Resources</dt><dd className="text-slate-200">{resources.length}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Reviewed questions</dt><dd className="text-slate-200">{questions.length}</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
}