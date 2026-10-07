import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api } from '../lib/api';
import type { Movie } from '../lib/types';
import { Button, Callout, Field, LinkButton, TextArea, TextInput } from '../components/ui';

interface MovieDraft {
  title: string;
  year: string;
  synopsis: string;
  genres: string;
  runtimeMinutes: string;
  posterUrl: string;
  sourceUrl: string;
  streamUrl: string;
  embedUrl: string;
  licence: string;
}

const EMPTY_DRAFT: MovieDraft = {
  title: '',
  year: '',
  synopsis: '',
  genres: '',
  runtimeMinutes: '',
  posterUrl: '',
  sourceUrl: '',
  streamUrl: '',
  embedUrl: '',
  licence: '',
};

function draftFromMovie(movie: Movie): MovieDraft {
  return {
    title: movie.title,
    year: movie.year?.toString() ?? '',
    synopsis: movie.synopsis,
    genres: movie.genres.join(', '),
    runtimeMinutes: movie.runtimeMinutes?.toString() ?? '',
    posterUrl: movie.posterUrl ?? '',
    sourceUrl: movie.sourceUrl ?? '',
    streamUrl: movie.streamUrl ?? '',
    embedUrl: movie.embedUrl ?? '',
    licence: movie.licence,
  };
}

function moviePayload(draft: MovieDraft) {
  return {
    title: draft.title.trim(),
    year: draft.year ? Number(draft.year) : null,
    synopsis: draft.synopsis.trim(),
    genres: draft.genres.split(',').map((genre) => genre.trim()).filter(Boolean),
    runtimeMinutes: draft.runtimeMinutes ? Number(draft.runtimeMinutes) : null,
    posterUrl: draft.posterUrl.trim() || null,
    sourceUrl: draft.sourceUrl.trim() || null,
    streamUrl: draft.streamUrl.trim() || null,
    embedUrl: draft.embedUrl.trim() || null,
    licence: draft.licence.trim(),
  };
}

export default function AdminMovies() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MovieDraft>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [videoSource, setVideoSource] = useState<'link' | 'upload'>('link');
  const [storageMode, setStorageMode] = useState<'object' | 'local' | 'disabled'>('disabled');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadMovies() {
    setLoading(true);
    setError(null);
    try {
      const [result, storage] = await Promise.all([
        api.get<{ movies: Movie[] }>('/movies/admin/library'),
        api.get<{ mode: 'object' | 'local' | 'disabled' }>('/movies/admin/upload-mode'),
      ]);
      setMovies(result.movies);
      setStorageMode(storage.mode);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not load managed movies.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMovies();
  }, []);

  function startNewMovie() {
    setSelectedId(null);
    setDraft(EMPTY_DRAFT);
    setVideoSource('link');
    setError(null);
    setNotice(null);
  }

  function editMovie(movie: Movie) {
    setSelectedId(movie.id);
    setDraft(draftFromMovie(movie));
    setVideoSource(movie.streamUrl?.startsWith('/api/movies/uploads/') ? 'upload' : 'link');
    setError(null);
    setNotice(null);
  }

  function changeVideoSource(source: 'link' | 'upload') {
    if (source === videoSource) return;
    setVideoSource(source);
    setDraft((current) => ({ ...current, streamUrl: '', embedUrl: '' }));
  }

  async function uploadVideo(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    setNotice(null);
    try {
      if (storageMode === 'disabled') {
        throw new Error('Configure S3-compatible object storage to enable video uploads on this deployment.');
      }

      let streamUrl: string;
      if (storageMode === 'object') {
        const ticket = await api.post<{
          uploadUrl: string;
          streamUrl: string;
          headers: Record<string, string>;
        }>('/movies/admin/upload-url', { fileName: file.name, size: file.size });
        const response = await fetch(ticket.uploadUrl, {
          method: 'PUT',
          headers: ticket.headers,
          body: file,
        });
        if (!response.ok) throw new Error('Cloud storage rejected the upload. Check the bucket CORS settings.');
        streamUrl = ticket.streamUrl;
      } else {
        const result = await api.upload<{ streamUrl: string }>('/movies/admin/upload', file);
        streamUrl = result.streamUrl;
      }
      setDraft((current) => ({ ...current, streamUrl, embedUrl: '' }));
      setNotice('Video uploaded. Save the movie details to add it to the catalog.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not upload this video.');
    } finally {
      setUploading(false);
    }
  }

  async function saveMovie(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const body = moviePayload(draft);
      const result = selectedId
        ? await api.patch<{ movie: Movie }>(`/movies/admin/library/${encodeURIComponent(selectedId)}`, body)
        : await api.post<{ movie: Movie }>('/movies/admin/library', body);
      setMovies((current) => {
        const updated = current.filter((movie) => movie.id !== result.movie.id);
        return [...updated, result.movie].sort((left, right) => left.title.localeCompare(right.title));
      });
      setSelectedId(result.movie.id);
      setDraft(draftFromMovie(result.movie));
      setNotice(`${result.movie.title} was ${selectedId ? 'updated' : 'added'} to the movie catalog.`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not save this movie.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteMovie() {
    if (!selectedId || !window.confirm('Delete this managed movie from the catalog?')) return;
    setDeleting(true);
    setError(null);
    setNotice(null);
    try {
      await api.delete(`/movies/admin/library/${encodeURIComponent(selectedId)}`);
      setMovies((current) => current.filter((movie) => movie.id !== selectedId));
      startNewMovie();
      setNotice('Movie removed from the catalog.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not delete this movie.');
    } finally {
      setDeleting(false);
    }
  }

  function updateDraft(field: keyof MovieDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 border-b border-white/[0.08] pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow text-reel-300">Content operations</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Manage movies</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Add and maintain hosted movie links shown in the learner catalog.</p>
          <p className="mt-2 text-xs text-slate-500">
            {storageMode === 'object'
              ? 'Video uploads use cloud object storage.'
              : storageMode === 'local'
                ? 'Video uploads are stored on this development server.'
                : 'Video uploads are disabled until object storage is configured.'}
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton to="/admin" variant="secondary" icon="arrow-left">Admin overview</LinkButton>
          <Button icon="plus" onClick={startNewMovie}>Add movie</Button>
        </div>
      </section>

      {error ? <Callout tone="danger" title="Action failed">{error}</Callout> : null}
      {notice ? <Callout tone="success">{notice}</Callout> : null}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,25rem)]">
        <section aria-labelledby="managed-movies-heading">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <div>
              <h2 id="managed-movies-heading" className="section-title text-lg">Managed catalog</h2>
              <p className="mt-1 text-sm text-slate-500">{movies.length} {movies.length === 1 ? 'title' : 'titles'}</p>
            </div>
            <Button variant="ghost" size="sm" icon="refresh" loading={loading} onClick={() => void loadMovies()}>
              Refresh
            </Button>
          </div>
          <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {loading ? (
              <p className="py-12 text-center text-sm text-slate-400">Loading movies...</p>
            ) : movies.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-slate-200">No managed movies yet</p>
                <p className="mt-1 text-xs text-slate-500">Add a title with a hosted video or embed URL.</p>
              </div>
            ) : movies.map((movie) => (
              <article key={movie.id} className="flex items-center gap-4 py-4">
                {movie.posterUrl ? (
                  <img src={movie.posterUrl} alt="" className="h-20 w-14 shrink-0 object-cover" />
                ) : (
                  <div className="flex h-20 w-14 shrink-0 items-center justify-center bg-white/[0.05] text-slate-500">—</div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-white">{movie.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {[movie.year, movie.runtimeMinutes ? `${movie.runtimeMinutes} min` : null, movie.genres[0]].filter(Boolean).join(' · ') || 'No details'}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">{movie.embedUrl ?? movie.streamUrl}</p>
                </div>
                <Button variant="secondary" size="sm" icon="settings" onClick={() => editMovie(movie)}>
                  Edit
                </Button>
              </article>
            ))}
          </div>
        </section>

        <form onSubmit={(event) => void saveMovie(event)} className="space-y-4 border-t border-white/[0.08] pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title text-lg">{selectedId ? 'Edit movie' : 'New movie'}</h2>
            {selectedId ? <Button type="button" variant="danger" size="sm" icon="trash" loading={deleting} onClick={() => void deleteMovie()}>Delete</Button> : null}
          </div>

          <Field label="Title" required>
            <TextInput required maxLength={200} value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Release year">
              <TextInput type="number" min={1888} max={2200} value={draft.year} onChange={(event) => updateDraft('year', event.target.value)} />
            </Field>
            <Field label="Runtime (minutes)">
              <TextInput type="number" min={1} max={600} value={draft.runtimeMinutes} onChange={(event) => updateDraft('runtimeMinutes', event.target.value)} />
            </Field>
          </div>
          <Field label="Genres" hint="Separate genres with commas.">
            <TextInput value={draft.genres} onChange={(event) => updateDraft('genres', event.target.value)} placeholder="Drama, Adventure" />
          </Field>
          <Field label="Synopsis">
            <TextArea rows={3} maxLength={5000} value={draft.synopsis} onChange={(event) => updateDraft('synopsis', event.target.value)} />
          </Field>
          <Field label="Video source" required>
            <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/[0.08] bg-ink-900 p-1" role="group" aria-label="Video source">
              <button
                type="button"
                aria-pressed={videoSource === 'link'}
                onClick={() => changeVideoSource('link')}
                className={`h-9 rounded-md px-3 text-sm font-medium transition ${videoSource === 'link' ? 'bg-white/[0.1] text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Hosted link
              </button>
              <button
                type="button"
                aria-pressed={videoSource === 'upload'}
                onClick={() => changeVideoSource('upload')}
                className={`h-9 rounded-md px-3 text-sm font-medium transition ${videoSource === 'upload' ? 'bg-white/[0.1] text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Upload video
              </button>
            </div>
          </Field>
          {videoSource === 'link' ? (
            <>
              <Field label="Video stream URL" hint="Direct hosted media URL, if available.">
                <TextInput type="url" value={draft.streamUrl} onChange={(event) => updateDraft('streamUrl', event.target.value)} placeholder="https://…" />
              </Field>
              <Field label="Embed URL" hint="Provide a stream URL or an embed URL.">
                <TextInput type="url" value={draft.embedUrl} onChange={(event) => updateDraft('embedUrl', event.target.value)} placeholder="https://…" />
              </Field>
            </>
          ) : (
            <Field
              label="Video file"
              hint={storageMode === 'object'
                ? 'MP4, WebM, OGG, MOV, M4V, or MKV. Uploads go directly to the configured bucket.'
                : storageMode === 'local'
                  ? 'MP4, WebM, OGG, MOV, M4V, or MKV. Maximum size: 4 GB.'
                  : 'Configure an S3-compatible bucket to enable file uploads.'}
            >
              <input
                className="input file:mr-3 file:rounded-md file:border-0 file:bg-white/[0.1] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
                type="file"
                accept=".mp4,.webm,.ogg,.mov,.m4v,.mkv,video/*"
                disabled={uploading || storageMode === 'disabled'}
                onChange={(event) => void uploadVideo(event.target.files?.[0])}
              />
              {uploading ? <p className="hint mt-2">Uploading video...</p> : draft.streamUrl.startsWith('/api/movies/uploads/') ? <p className="hint mt-2">Uploaded video is ready to save.</p> : null}
            </Field>
          )}
          <Field label="Poster image URL">
            <TextInput type="url" value={draft.posterUrl} onChange={(event) => updateDraft('posterUrl', event.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Source / attribution URL">
            <TextInput type="url" value={draft.sourceUrl} onChange={(event) => updateDraft('sourceUrl', event.target.value)} placeholder="https://…" />
          </Field>
          <Field label="License or rights note">
            <TextInput maxLength={200} value={draft.licence} onChange={(event) => updateDraft('licence', event.target.value)} placeholder="Rights / license information" />
          </Field>
          <Button type="submit" icon={selectedId ? 'check' : 'plus'} loading={saving} disabled={uploading} block>
            {selectedId ? 'Save changes' : 'Add to catalog'}
          </Button>
        </form>
      </div>
    </div>
  );
}