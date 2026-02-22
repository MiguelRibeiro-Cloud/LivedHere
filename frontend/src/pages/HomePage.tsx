import { FormEvent, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export function HomePage() {
  const navigate = useNavigate();
  const { locale = 'en' } = useParams();
  const [query, setQuery] = useState('');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/${locale}/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <main className="space-y-12">
      <section className="px-2 py-10 sm:py-14">
        <div className="mx-auto max-w-[1100px] text-center">
          <h1 className="text-balance text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Know before you move.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg font-medium text-ink/80 sm:text-xl">
            Real experiences. Moderated. Private.
          </p>

          <form onSubmit={onSubmit} className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
            <input
              className="input h-12 text-base"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by street, area, or city…"
              aria-label="Search"
            />
            <button className="btn h-12 px-6 text-base" type="submit">
              Search
            </button>
          </form>

          <p className="mx-auto mt-4 max-w-2xl text-sm text-ink/70">
            All reviews are reviewed. No personal data allowed.
          </p>
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl font-bold text-ink">How it works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sand text-sm font-bold text-primary">1</div>
            <p className="mt-3 font-semibold text-ink">Search an address</p>
            <p className="mt-1 text-sm text-ink/70">Find buildings and areas by street, neighborhood, or city.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sand text-sm font-bold text-primary">2</div>
            <p className="mt-3 font-semibold text-ink">Read real experiences</p>
            <p className="mt-1 text-sm text-ink/70">Understand what it’s like to live there—before you commit.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sand text-sm font-bold text-primary">3</div>
            <p className="mt-3 font-semibold text-ink">Share yours</p>
            <p className="mt-1 text-sm text-ink/70">Help others make better housing decisions with a private review.</p>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl font-bold text-ink">Built for trust</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="font-semibold text-ink">Pre-moderated</p>
            <p className="text-sm text-ink/70">Every review is checked before publishing.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="font-semibold text-ink">Privacy-first</p>
            <p className="text-sm text-ink/70">No personal data allowed. Content is anonymized.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="font-semibold text-ink">Portugal-focused</p>
            <p className="text-sm text-ink/70">Designed for local housing realities and context.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="font-semibold text-ink">Community-driven</p>
            <p className="text-sm text-ink/70">Built around shared experiences, not clicks.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
