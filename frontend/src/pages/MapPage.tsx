import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const qParam = (searchParams.get('q') ?? '').trim();
  const [query, setQuery] = useState('');
  const clickCardRef = useRef<HTMLDivElement>(null);
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

  // ---- Map interaction mode: off | find | write ----
  type MapMode = 'off' | 'find' | 'write';
  const [mapMode, setMapMode] = useState<MapMode>('off');
  const [clickedPoint, setClickedPoint] = useState<{
    lat: number;
    lng: number;
    label?: string;
    street_name?: string;
    city_name?: string;
    area_name?: string;
    country_code?: string;
    house_number?: string | null;
  } | null>(null);
  const [reverseLoading, setReverseLoading] = useState(false);
  // Reviews found at the clicked point (find mode)
  const [clickedResults, setClickedResults] = useState<SearchResult[]>([]);
  const [clickedSearchDone, setClickedSearchDone] = useState(false);

  type ReverseResult = {
    label: string;
    street_name: string;
    city_name: string;
    area_name: string;
    country_code: string;
    house_number?: string | null;
    lat: number;
    lng: number;
  };

  function toggleMode(mode: MapMode) {
    if (mapMode === mode) {
      // Turn off
      setMapMode('off');
      setClickedPoint(null);
      setClickedResults([]);
      setClickedSearchDone(false);
    } else {
      setMapMode(mode);
      setClickedPoint(null);
      setClickedResults([]);
      setClickedSearchDone(false);
    }
  }

  const onMapClick = useCallback(
    async (latlng: { lat: number; lng: number }) => {
      if (mapMode === 'off') return;

      setClickedPoint({ lat: latlng.lat, lng: latlng.lng });
      setReverseLoading(true);
      setClickedResults([]);
      setClickedSearchDone(false);

      try {
        const res = await api.get<ReverseResult | null>('/geocode/reverse', {
          params: { lat: latlng.lat, lng: latlng.lng },
        });

        if (res.data) {
          const point = {
            lat: latlng.lat,
            lng: latlng.lng,
            label: res.data.label,
            street_name: res.data.street_name,
            city_name: res.data.city_name,
            area_name: res.data.area_name,
            country_code: res.data.country_code,
            house_number: res.data.house_number,
          };
          setClickedPoint(point);

          // In find mode, auto-search for reviews at this address
          if (mapMode === 'find' && res.data.street_name) {
            try {
              const searchQ = `${res.data.street_name}, ${res.data.city_name}`;
              const searchRes = await api.get<SearchResponse>('/search', {
                params: { q: searchQ, verified_only: false, sort: 'recency' },
              });
              setClickedResults(searchRes.data.results ?? []);
            } catch {
              setClickedResults([]);
            }
            setClickedSearchDone(true);
          }
        } else {
          setClickedPoint({
            lat: latlng.lat,
            lng: latlng.lng,
            label: t('map_pin_no_address'),
          });
          if (mapMode === 'find') setClickedSearchDone(true);
        }
      } catch {
        setClickedPoint({
          lat: latlng.lat,
          lng: latlng.lng,
          label: t('map_pin_error'),
        });
        if (mapMode === 'find') setClickedSearchDone(true);
      } finally {
        setReverseLoading(false);
      }
    },
    [mapMode, t],
  );

  function navigateToSubmit() {
    if (!clickedPoint?.street_name) return;
    const params = new URLSearchParams();
    params.set('street', clickedPoint.street_name);
    params.set('city', clickedPoint.city_name ?? '');
    params.set('area', clickedPoint.area_name ?? '');
    params.set('country', clickedPoint.country_code ?? '');
    params.set('lat', String(clickedPoint.lat));
    params.set('lng', String(clickedPoint.lng));
    if (clickedPoint.house_number) {
      params.set('door', clickedPoint.house_number);
    }
    navigate(`/${locale}/submit?${params.toString()}`);
  }

  function dismissPin() {
    setClickedPoint(null);
    setClickedResults([]);
    setClickedSearchDone(false);
  }

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
      // Clear any click-based state when doing a text search
      setClickedPoint(null);
      setClickedResults([]);
      setClickedSearchDone(false);
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

  // Auto-scroll the sidebar card into view when it appears
  useEffect(() => {
    if (clickedPoint && mapMode !== 'off' && clickCardRef.current) {
      clickCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [clickedPoint, mapMode]);

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
    // Called from sidebar result list — just pans to the pin, no navigation
    const fromResult = results.find((r) => r.building_id === id);
    const fromPin = allBuildings.find((b) => b.id === id);
    const lat = fromResult?.lat ?? fromPin?.lat;
    const lng = fromResult?.lng ?? fromPin?.lng;
    if (lat == null || lng == null) return;

    setActiveId(id);
    setPanTo([lat, lng]);
    setPanZoom(16);
  }

  function onMapPinClick(id: number) {
    // Called when a building pin is clicked directly on the map
    const fromResult = results.find((r) => r.building_id === id);
    const fromPin = allBuildings.find((b) => b.id === id);
    const lat = fromResult?.lat ?? fromPin?.lat;
    const lng = fromResult?.lng ?? fromPin?.lng;

    if (mapMode === 'write' && lat != null && lng != null) {
      // Reverse-geocode and show submit card
      void onMapClick({ lat, lng });
      return;
    }

    // In off or find mode, navigate to the building's review page
    navigate(`/${locale}/building/${id}`);
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

        {/* Map interaction mode toggle */}
        <div className="mt-4 flex flex-wrap items-stretch gap-3">
          {/* Find Reviews button */}
          <button
            type="button"
            onClick={() => toggleMode('find')}
            className={
              mapMode === 'find'
                ? 'inline-flex items-center gap-2 rounded-lg border-2 border-blue-500 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition-all'
                : 'inline-flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-ink/70 transition-all hover:border-blue-300 hover:text-ink'
            }
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {t('map_mode_find')}
            {mapMode === 'find' && (
              <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-white">{t('map_mode_active_label')}</span>
            )}
          </button>

          {/* Write a Review button */}
          <button
            type="button"
            onClick={() => toggleMode('write')}
            className={
              mapMode === 'write'
                ? 'inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition-all'
                : 'inline-flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-ink/70 transition-all hover:border-primary/30 hover:text-ink'
            }
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {t('map_mode_write')}
            {mapMode === 'write' && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-white">{t('map_mode_active_label')}</span>
            )}
          </button>
        </div>

        {/* Mode hint */}
        {mapMode !== 'off' && (
          <p className="mt-2 text-xs text-ink/60">
            {mapMode === 'find' ? t('map_mode_find_hint') : t('map_mode_write_hint')}
          </p>
        )}

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
          {/* === Clicked-point interaction card (sidebar, visible beside map) === */}
          {clickedPoint && mapMode !== 'off' && (
            <section ref={clickCardRef} className={`card border-2 ${mapMode === 'find' ? 'border-blue-300 bg-blue-50/50' : 'border-primary/30 bg-primary/5'}`}>
              {reverseLoading ? (
                <div className="flex items-center gap-2 text-sm text-ink/60">
                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('map_pin_loading')}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Address header + dismiss */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {clickedPoint.street_name ? (
                        <>
                          <p className="font-semibold text-ink">
                            {clickedPoint.street_name}
                            {clickedPoint.house_number ? ` ${clickedPoint.house_number}` : ''}
                          </p>
                          <p className="text-sm text-ink/70">
                            {clickedPoint.area_name}, {clickedPoint.city_name}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-ink/70">{clickedPoint.label}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={dismissPin}
                      className="rounded-md p-1 text-ink/40 hover:text-ink/70"
                      aria-label={t('cancel')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* ========== FIND MODE: show review results ========== */}
                  {mapMode === 'find' && clickedSearchDone && (
                    <>
                      {clickedResults.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                            {clickedResults.length} {clickedResults.length === 1 ? t('map_results').toLowerCase().replace(/s$/, '') : t('map_results').toLowerCase()}
                          </p>
                          {clickedResults.slice(0, 6).map((item) => (
                            <Link
                              key={item.building_id}
                              to={`/${locale}/building/${item.building_id}`}
                              className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:bg-sand"
                            >
                              <p className="text-sm font-semibold text-ink">
                                {item.street},{' '}
                                {item.range_start != null && item.range_end != null
                                  ? `${item.range_start}–${item.range_end}`
                                  : item.number}
                              </p>
                              <p className="mt-0.5 text-xs text-ink/70">
                                {item.area}, {item.city} &middot;{' '}
                                {item.review_count > 0 && item.avg_score != null ? (
                                  <span>⭐ {item.avg_score.toFixed(1)} ({item.review_count})</span>
                                ) : (
                                  <span>{t('map_no_reviews_yet')}</span>
                                )}
                              </p>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-ink/70">{t('map_pin_no_reviews')}</p>
                          {clickedPoint.street_name && (
                            <button
                              type="button"
                              onClick={navigateToSubmit}
                              className="inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/20"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              {t('map_pin_be_first')}
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* ========== WRITE MODE: navigate to submit ========== */}
                  {mapMode === 'write' && clickedPoint.street_name && (
                    <button
                      type="button"
                      onClick={navigateToSubmit}
                      className="btn flex w-full items-center justify-center gap-2 py-2 text-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      {t('map_pin_write_review')}
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

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
            onSelectBuilding={onMapPinClick}
            onCenterChange={(center, zoom) => {
              setMapCenter(center);
              setMapZoom(zoom);
            }}
            onMapClick={mapMode !== 'off' ? onMapClick : undefined}
            clickedPoint={clickedPoint}
            pinMode={mapMode !== 'off'}
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
