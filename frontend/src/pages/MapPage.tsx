import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { api } from '../api/client';
import { BuildingPin, MapView } from '../components/MapView';

type SearchResult = {
  building_id: number;
  street: string;
  number: number;
  range_start?: number | null;
  range_end?: number | null;
  area: string;
  city: string;
  lat: number;
  lng: number;
  review_count: number;
  avg_score: number | null;
};

type SearchResponse = {
  results: SearchResult[];
  corrected_query: string | null;
};

type GeocodeResult = {
  label: string;
  lat: number;
  lng: number;
  country_code?: string;
  city_name?: string;
  area_name?: string;
  street_name?: string;
};

export function MapPage() {
  const { t } = useTranslation();
  const { locale = 'en' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const qParam = (searchParams.get('q') ?? '').trim();
  const [query, setQuery] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const [allBuildings, setAllBuildings] = useState<BuildingPin[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [geoResults, setGeoResults] = useState<GeocodeResult[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emptyNote, setEmptyNote] = useState<string | null>(null);
  const [correctedQuery, setCorrectedQuery] = useState<string | null>(null);

  const [mapCenter, setMapCenter] = useState<[number, number]>([38.7223, -9.1393]);
  const [mapZoom, setMapZoom] = useState(11);
  const [panTo, setPanTo] = useState<[number, number] | null>(null);
  const [panZoom, setPanZoom] = useState<number | null>(null);

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
      setEmptyNote(null);
      setCorrectedQuery(null);
      setGeoResults([]);
      setActiveId(null);
      try {
        const [dbRes, geoRes] = await Promise.allSettled([
          api.get<SearchResponse>('/search', { params: { q, verified_only: verified, sort: 'recency' } }),
          api.get<GeocodeResult[]>('/geocode', { params: { q } }),
        ]);

        const searchData = dbRes.status === 'fulfilled' ? dbRes.value.data : null;
        const list = searchData?.results ?? [];
        const aiCorrected = searchData?.corrected_query ?? null;
        let geoItems = geoRes.status === 'fulfilled' ? geoRes.value.data : [];

        // If AI corrected the query and geocode was empty, re-geocode with corrected text
        if (aiCorrected && geoItems.length === 0) {
          try {
            const correctedGeo = await api.get<GeocodeResult[]>('/geocode', { params: { q: aiCorrected } });
            geoItems = correctedGeo.data;
          } catch { /* keep original empty */ }
        }

        setCorrectedQuery(aiCorrected);

        setResults(list);
        setGeoResults(geoItems);

        const first = list[0] ?? null;
        const geoFirst = geoItems[0] ?? null;

        setActiveId(first?.building_id ?? null);

        if (geoFirst) {
          setPanTo([geoFirst.lat, geoFirst.lng]);
          setPanZoom(15);
          setActiveId(null);
          if (list.length === 0) {
            setEmptyNote(t('map_empty_note_geo'));
          }
        } else if (first) {
          setPanTo([first.lat, first.lng]);
          setPanZoom(15);
        } else {
          // IMPORTANT: do NOT pan back to the default view on empty results.
          setPanTo(null);
          setPanZoom(null);
          setEmptyNote(t('map_empty_note_none'));
        }
      } catch {
        setError(t('map_error'));
        setResults([]);
        setGeoResults([]);
        setCorrectedQuery(null);
        setActiveId(null);
        setPanTo(null);
        setPanZoom(null);
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
  }, [qParam]);

  useEffect(() => {
    if (!qParam) {
      setResults([]);
      setActiveId(null);
      setError(null);
      setEmptyNote(null);
      setCorrectedQuery(null);
      setPanTo(null);
      setPanZoom(null);
      return;
    }
    void runSearch(qParam, verifiedOnly);
  }, [qParam, verifiedOnly, runSearch]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchParams({}, { replace: true });
      setResults([]);
      setActiveId(null);
      setError(null);
      setEmptyNote(null);
      setPanTo(null);
      setPanZoom(null);
      return;
    }
    setSearchParams({ q: trimmed }, { replace: true });
    await runSearch(trimmed, verifiedOnly);
  }

  function onSelectById(id: number) {
    // Select from current results if present, otherwise from all pins.
    const fromResult = results.find((r) => r.building_id === id);
    if (fromResult) {
      setActiveId(id);
      setPanTo([fromResult.lat, fromResult.lng]);
      setPanZoom(16);
      return;
    }
    const fromPin = allBuildings.find((b) => b.id === id);
    if (fromPin) {
      setActiveId(id);
      setPanTo([fromPin.lat, fromPin.lng]);
      setPanZoom(16);
    }
  }

  return (
    <main className="space-y-4">
      <section className="card">
        <h1 className="text-xl font-bold text-ink">{t('map_title')}</h1>
        <p className="mt-1 text-sm text-ink/70">{t('map_subtitle')}</p>

        <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <input
            className="input h-11"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('map_search_placeholder')}
            aria-label={t('map_search_button')}
          />
          <button className="btn h-11 px-6" type="submit" disabled={loading}>
            {loading ? t('map_searching') : t('map_search_button')}
          </button>
        </form>

        <label className="mt-3 inline-flex items-center gap-2 text-sm text-ink/80">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(event) => setVerifiedOnly(event.target.checked)}
          />
          {t('verified_only')}
        </label>

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        {!error && correctedQuery && (
          <p className="mt-3 text-sm text-ink/70">
            {t('map_ai_corrected')} <strong>{correctedQuery}</strong>
          </p>
        )}
        {!error && emptyNote && <p className="mt-3 text-sm text-ink/70">{emptyNote}</p>}
      </section>

      <section className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <div className="space-y-3">
          {results.length === 0 && geoResults.length === 0 ? (
            <section className="card">
              <p className="text-sm text-ink/70">{t('map_empty_search')}</p>
            </section>
          ) : (
            <>
              {results.length > 0 && (
                <section className="card">
                  <h2 className="text-sm font-semibold text-ink">{t('map_results')}</h2>
                  <div className="mt-3 space-y-2">
                    {results.slice(0, 12).map((item) => (
                      <button
                        key={item.building_id}
                        type="button"
                        onClick={() => onSelectById(item.building_id)}
                        className={
                          item.building_id === activeId
                            ? 'w-full rounded-xl border border-primary/30 bg-sand px-4 py-3 text-left'
                            : 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-sand'
                        }
                      >
                        <p className="font-semibold text-ink">
                          {item.street},{' '}
                          {item.range_start != null && item.range_end != null
                            ? `${item.range_start}–${item.range_end}`
                            : item.number}
                        </p>
                        <p className="mt-1 text-sm text-ink/70">
                          {item.area}, {item.city} ·{' '}
                          {item.review_count > 0 && item.avg_score != null ? (
                            <span>⭐ {item.avg_score.toFixed(1)} ({item.review_count})</span>
                          ) : (
                            <span>{t('map_no_reviews_yet')}</span>
                          )}
                        </p>
                        <Link
                          className="mt-2 inline-block text-sm font-semibold text-primary underline"
                          to={`/${locale}/building/${item.building_id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t('view_building')}
                        </Link>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {geoResults.length > 0 && (
                <section className="card">
                  <h2 className="text-sm font-semibold text-ink">{t('map_streets')}</h2>
                  <p className="mt-2 text-sm text-ink/70">{t('map_streets_note')}</p>
                  <div className="mt-3 space-y-2">
                    {geoResults.slice(0, 8).map((item) => {
                      const key = `${item.country_code ?? ''}-${item.city_name ?? ''}-${item.street_name ?? ''}-${item.lat}-${item.lng}`;
                      return (
                        <div key={key} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => {
                              setPanTo([item.lat, item.lng]);
                              setPanZoom(15);
                            }}
                          >
                            <p className="font-semibold text-ink">{item.label}</p>
                            <p className="mt-1 text-sm text-ink/70">{t('map_no_reviews_yet')}</p>
                          </button>
                          <Link
                            className="mt-2 inline-block text-sm font-semibold text-primary underline"
                            to={`/${locale}/submit?place=${encodeURIComponent(item.label)}`}
                          >
                            {t('submit_review')}
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <section className="card">
          <MapView
            buildings={markers}
            panTo={panTo}
            panZoom={panZoom}
            onSelectBuilding={onSelectById}
            onCenterChange={(center, zoom) => {
              setMapCenter(center);
              setMapZoom(zoom);
            }}
          />
          {/* Keep these in state so empty searches don't snap the user back to Lisbon */}
          <div className="mt-3 flex items-center justify-between text-xs text-ink/60">
            <span>
              Map: {mapCenter[0].toFixed(4)}, {mapCenter[1].toFixed(4)} · z{mapZoom}
            </span>
            {results.length === 0 && qParam && !error && (
              <span>{t('map_showing_all')}</span>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
