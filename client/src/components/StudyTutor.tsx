import { useState, type FormEvent } from 'react';
import { ApiError, api } from '../lib/api';
import { Button, Callout, TextArea } from './ui';
import { Icon } from './Icon';

interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function StudyTutor({ chapterId }: { chapterId: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || sending) return;

    setOpen(true);
    setSending(true);
    setInput('');
    setError(null);
    const history = messages.slice(-8);
    setMessages((current) => [...current, { role: 'user', content: message }]);

    try {
      const result = await api.post<{ reply: string }>(`/learning/chapters/${chapterId}/assistant`, {
        message,
        history,
      });
      setMessages((current) => [...current, { role: 'assistant', content: result.reply }]);
    } catch (caught) {
      setInput(message);
      setError(caught instanceof ApiError ? caught.message : 'The study tutor could not respond. Try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mt-10 border-y border-white/[0.08]" aria-label="AI study tutor">
      <div className="flex items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-400/10 text-brand-300">
            <Icon name="info" size={16} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-white">Study tutor</h2>
            <p className="mt-0.5 text-xs text-slate-500">Ask about this lesson</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" icon={open ? 'close' : 'chevron-down'} onClick={() => setOpen((current) => !current)}>
          {open ? 'Close' : 'Ask a question'}
        </Button>
      </div>

      {open ? (
        <div className="space-y-4 pb-5">
          <div className="max-h-96 space-y-4 overflow-y-auto border-t border-white/[0.06] py-4" aria-live="polite">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-500">Ask for an explanation of any concept in this lesson.</p>
            ) : messages.map((entry, index) => (
              <article key={`${entry.role}-${index}`} className={entry.role === 'user' ? 'ml-6 text-right' : 'mr-6'}>
                <p className="mb-1 text-[0.6875rem] font-semibold uppercase text-slate-500">
                  {entry.role === 'user' ? 'You' : 'Tutor'}
                </p>
                <p className={`inline-block whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-left text-sm leading-6 ${entry.role === 'user' ? 'bg-white/[0.08] text-slate-100' : 'bg-brand-400/[0.08] text-slate-200'}`}>
                  {entry.content}
                </p>
              </article>
            ))}
            {sending ? <p className="text-sm text-slate-500">Thinking through the lesson...</p> : null}
          </div>

          {error ? <Callout tone="danger">{error}</Callout> : null}

          <form onSubmit={(event) => void sendMessage(event)} className="flex items-end gap-3">
            <TextArea
              rows={2}
              maxLength={1500}
              required
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about a lesson concept"
              aria-label="Ask the study tutor"
              className="min-h-14"
            />
            <Button type="submit" icon="arrow-right" loading={sending} disabled={!input.trim()} aria-label="Send question" />
          </form>
        </div>
      ) : null}
    </section>
  );
}