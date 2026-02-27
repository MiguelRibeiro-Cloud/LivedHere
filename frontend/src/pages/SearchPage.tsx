import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { api } from '../api/client';

type SearchResult = {
  building_id: number;
  street: string;
  number: number;
  area: string;
  city: string;
  review_count: number;
  avg_score: number;
};

export function SearchPage() {
  const { t } = useTranslation();
  const { locale = 'en' } = useParams();
  const [searchParams] = useSearchParams();
  const qParam = (searchParams.get('q') ?? '').trim();
  const [query, setQuery] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const runSearch = useCallback(
    async (q: string, verified: boolean) => {
      const response = await api.get<{ results: SearchResult[]; corrected_query: string | null }>('/search', {
        params: { q, verified_only: verified, sort: 'recency' }
      });
      setResults(response.data.results);
    },
    []
  );

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    await runSearch(trimmed, verifiedOnly);
  }

  useEffect(() => {
    if (!qParam) return;
    setQuery(qParam);
    void runSearch(qParam, verifiedOnly);
  }, [qParam, runSearch]);

  return (
    <main className="space-y-4">
      <form onSubmit={onSearch} className="card space-y-3">
        <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('hero_search_placeholder')} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} />
          {t('verified_only')}
        </label>
        <button className="btn" type="submit">
          {t('search')}
        </button>
      </form>
      <section className="space-y-3">
        {results.map((item) => (
          <article key={item.building_id} className="card">
            <p className="font-semibold">
              {item.street}, {item.number} · {item.area}, {item.city}
            </p>
            <p>
              ⭐ {item.avg_score} ({item.review_count})
            </p>
            <Link className="text-primary underline" to={`/${locale}/building/${item.building_id}`}>
              {t('building')}
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
