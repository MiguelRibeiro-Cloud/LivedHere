import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { api } from '../api/client';

type Message = {
  role: 'user' | 'assistant';
  text: string;
  action?: { type: string; query: string };
  suggestions?: string[];
};

type HistoryEntry = { role: 'user' | 'assistant'; text: string };

export function AIAssistant() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { locale = 'en' } = useParams();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setInput('');
      const userMsg: Message = { role: 'user', text: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      // Build history from previous messages (last 10 turns)
      const history: HistoryEntry[] = messages.slice(-10).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      try {
        const res = await api.post<{
          reply: string;
          action?: { type: string; query: string };
          suggestions?: string[];
        }>('/assistant', { message: trimmed, locale, history });
        const { reply, action, suggestions } = res.data;
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: reply, action, suggestions },
        ]);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        let msg: string;
        if (status === 429) {
          msg = t('assistant_rate_limit');
        } else if (status === 503) {
          msg = t('assistant_unavailable');
        } else {
          msg = t('assistant_error');
        }
        setMessages((prev) => [...prev, { role: 'assistant', text: msg }]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, locale, t],
  );

  function onSend(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function onSuggestionClick(suggestion: string) {
    sendMessage(suggestion);
  }

  function onSearchAction(query: string) {
    navigate(`/${locale}/search?q=${encodeURIComponent(query)}`);
    setOpen(false);
  }

  function onClearChat() {
    setMessages([]);
  }

  // Keyboard shortcut: Escape closes panel
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) setOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // ---- Default suggestions for empty state ----
  const defaultSuggestions =
    locale === 'pt'
      ? [
          'Pesquisar Rua Augusta, Lisboa',
          'Como funciona a moderação?',
          'Como submeto uma avaliação?',
        ]
      : [
          'Search for Rua Augusta, Lisboa',
          'How does moderation work?',
          'How do I submit a review?',
        ];

  // ---- Collapsed: floating bubble ----
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary/50 active:scale-95"
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

  // Get last assistant message's suggestions
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
  const activeSuggestions =
    !loading && lastAssistantMsg?.suggestions?.length
      ? lastAssistantMsg.suggestions
      : !loading && messages.length === 0
        ? defaultSuggestions
        : [];

  // ---- Expanded: chat panel ----
  return (
    <div className="fixed bottom-4 right-3 z-50 flex w-[360px] max-w-[calc(100vw-1.5rem)] flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl sm:bottom-6 sm:right-6 sm:w-[420px]">
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-2xl bg-primary px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
            />
          </svg>
          <span className="font-semibold">{t('assistant_title')}</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={onClearChat}
              className="rounded-md p-1 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
              aria-label={t('assistant_clear')}
              title={t('assistant_clear')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            aria-label={t('cancel')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
        style={{ maxHeight: '400px', minHeight: '200px' }}
      >
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-ink/60">{t('assistant_welcome')}</p>
          </div>
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
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-primary/90 active:scale-[0.98]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {t('assistant_search_on_map')}
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
                <span className="animate-bounce" style={{ animationDelay: '0.15s' }}>
                  ·
                </span>
                <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>
                  ·
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Suggestion chips */}
      {activeSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-3 py-2">
          {activeSuggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSuggestionClick(s)}
              disabled={loading}
              className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary transition-all hover:bg-primary/10 hover:border-primary/40 active:scale-95 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={onSend} className="flex gap-2 border-t border-slate-200 px-3 py-2">
        <input
          ref={inputRef}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('assistant_placeholder')}
          maxLength={500}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-white transition-all hover:bg-primary/90 disabled:opacity-40 active:scale-95"
          aria-label={t('assistant_send')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
}
