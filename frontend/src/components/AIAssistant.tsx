import { FormEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { api } from '../api/client';

type Message = {
  role: 'user' | 'assistant';
  text: string;
  action?: { type: string; query: string };
};

export function AIAssistant() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { locale = 'en' } = useParams();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setLoading(true);

    try {
      const res = await api.post<{ reply: string; action?: { type: string; query: string } }>(
        '/assistant',
        { message: trimmed, locale },
      );
      const { reply, action } = res.data;
      setMessages((prev) => [...prev, { role: 'assistant', text: reply, action }]);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg = status === 429 ? t('submit_err_rate_limit') : t('assistant_error');
      setMessages((prev) => [...prev, { role: 'assistant', text: msg }]);
    } finally {
      setLoading(false);
    }
  }

  function onSearchAction(query: string) {
    navigate(`/${locale}/search?q=${encodeURIComponent(query)}`);
    setOpen(false);
  }

  // ---- Collapsed: floating bubble ----
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50"
        aria-label={t('assistant_title')}
        title={t('assistant_title')}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </button>
    );
  }

  // ---- Expanded: chat panel ----
  return (
    <div className="fixed bottom-6 right-4 z-50 flex w-[340px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl sm:right-6 sm:w-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-2xl bg-primary px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <span className="font-semibold">{t('assistant_title')}</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-xl leading-none hover:opacity-80"
          aria-label={t('cancel')}
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
        style={{ maxHeight: '350px', minHeight: '180px' }}
      >
        {messages.length === 0 && (
          <p className="text-sm leading-relaxed text-ink/60">{t('assistant_welcome')}</p>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={
                m.role === 'user'
                  ? 'max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-white'
                  : 'max-w-[85%] rounded-2xl rounded-bl-sm bg-sand px-3 py-2 text-sm text-ink'
              }
            >
              <p className="whitespace-pre-line">{m.text}</p>
              {m.action?.type === 'search' && (
                <button
                  type="button"
                  onClick={() => onSearchAction(m.action!.query)}
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary/90"
                >
                  {t('assistant_search_on_map')} →
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-sand px-4 py-2 text-sm text-ink/40">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">·</span>
                <span className="animate-bounce" style={{ animationDelay: '0.15s' }}>·</span>
                <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>·</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={onSend} className="flex gap-2 border-t border-slate-200 px-3 py-2">
        <input
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('assistant_placeholder')}
          maxLength={500}
          disabled={loading}
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
        >
          {t('assistant_send')}
        </button>
      </form>
    </div>
  );
}
