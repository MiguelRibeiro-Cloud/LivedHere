import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { api } from '../api/client';
import { MapView } from '../components/MapView';

type BuildingPin = {
  id: number;
  lat: number;
  lng: number;
  number?: number;
};

type SearchResult = {
  building_id: number;
  street: string;
  number: number;
  area: string;
  city: string;
  lat: number;
  lng: number;
  review_count: number;
  avg_score: number;
};

export function MapPage() {
  const { locale = 'en' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const qParam = (searchParams.get('q') ?? '').trim();
  const [query, setQuery] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const [allBuildings, setAllBuildings] = useState<BuildingPin[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const center = useMemo<[number, number]>(() => {
    const active = activeId ? results.find((r) => r.building_id === activeId) : null;
    if (active) return [active.lat, active.lng];
    if (results.length > 0) return [results[0].lat, results[0].lng];
    return [38.7223, -9.1393];
  }, [activeId, results]);

  const zoom = results.length > 0 ? 15 : 11;

  const markers = useMemo<BuildingPin[]>(() => {
    if (results.length > 0) {
      return results.map((r) => ({ id: r.building_id, lat: r.lat, lng: r.lng, number: r.number }));
    }
    return allBuildings;
  }, [allBuildings, results]);

  const runSearch = useCallback(
    async (q: string, verified: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<SearchResult[]>('/search', {
          params: { q, verified_only: verified, sort: 'recency' }
        });
        setResults(response.data);
        setActiveId(response.data[0]?.building_id ?? null);
      } catch {
        setError('Could not search right now. Please try again.');
        setResults([]);
        setActiveId(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    api.get<BuildingPin[]>('/map/buildings').then((response) => setAllBuildings(response.data));
  }, []);

  useEffect(() => {
    setQuery(qParam);
    if (!qParam) {
      setResults([]);
      setActiveId(null);
      return;
    }
    void runSearch(qParam, verifiedOnly);
  }, [qParam, runSearch]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchParams({}, { replace: true });
      setResults([]);
      setActiveId(null);
      return;
    }
    setSearchParams({ q: trimmed }, { replace: true });
    await runSearch(trimmed, verifiedOnly);
  }

  return (
    <main className="space-y-4">
      <section className="card">
        <h1 className="text-xl font-bold text-ink">Search and explore</h1>
        <p className="mt-1 text-sm text-ink/70">Search by street, area, or city to jump the map to matching places.</p>

        <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <input
            className="input h-11"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by street, area, or city…"
            aria-label="Search"
          />
          <button className="btn h-11 px-6" type="submit" disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>

        <label className="mt-3 inline-flex items-center gap-2 text-sm text-ink/80">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(event) => setVerifiedOnly(event.target.checked)}
          />
          Verified accounts only
        </label>

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </section>

      <section className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <div className="space-y-3">
          {results.length > 0 ? (
            <section className="card">
              <h2 className="text-sm font-semibold text-ink">Results</h2>
              <div className="mt-3 space-y-2">
                {results.slice(0, 12).map((item) => (
                  <button
                    key={item.building_id}
                    type="button"
                    onClick={() => setActiveId(item.building_id)}
                    className={
                      item.building_id === activeId
                        ? 'w-full rounded-xl border border-primary/30 bg-sand px-4 py-3 text-left'
                        : 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-sand'
                    }
                  >
                    <p className="font-semibold text-ink">
                      {item.street}, {item.number}
                    </p>
                    <p className="mt-1 text-sm text-ink/70">
                      {item.area}, {item.city} · ⭐ {item.avg_score} ({item.review_count})
                    </p>
                    <Link
                      className="mt-2 inline-block text-sm font-semibold text-primary underline"
                      to={`/${locale}/building/${item.building_id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      View building
                    </Link>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <section className="card">
              <p className="text-sm text-ink/70">Search to see matching places and jump the map.</p>
            </section>
          )}
        </div>

        <section className="card">
          <MapView buildings={markers} center={center} zoom={zoom} />
        </section>
      </section>
    </main>
  );
}
