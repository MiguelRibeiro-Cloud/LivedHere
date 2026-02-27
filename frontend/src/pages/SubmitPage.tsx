import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { api } from '../api/client';
import { StarRating } from '../components/StarRating';

const initialRatings = {
  people_noise: 3,
  animal_noise: 3,
  insulation: 3,
  pest_issues: 3,
  area_safety: 3,
  neighbourhood_vibe: 3,
  outdoor_spaces: 3,
  parking: 3,
  building_maintenance: 3,
  construction_quality: 3
};

type RatingKey = keyof typeof initialRatings;

function useRatingLabels(): Record<RatingKey, string> {
  const { t } = useTranslation();
  return useMemo(() => ({
    people_noise: t('rating_people_noise'),
    animal_noise: t('rating_animal_noise'),
    insulation: t('rating_insulation'),
    pest_issues: t('rating_pest_issues'),
    area_safety: t('rating_area_safety'),
    neighbourhood_vibe: t('rating_neighbourhood_vibe'),
    outdoor_spaces: t('rating_outdoor_spaces'),
    parking: t('rating_parking'),
    building_maintenance: t('rating_building_maintenance'),
    construction_quality: t('rating_construction_quality')
  }), [t]);
}

function useRatingScale(): Record<RatingKey, { min: string; max: string }> {
  const { t } = useTranslation();
  return useMemo(() => ({
    people_noise: { min: t('rating_people_noise_min'), max: t('rating_people_noise_max') },
    animal_noise: { min: t('rating_animal_noise_min'), max: t('rating_animal_noise_max') },
    insulation: { min: t('rating_insulation_min'), max: t('rating_insulation_max') },
    pest_issues: { min: t('rating_pest_issues_min'), max: t('rating_pest_issues_max') },
    area_safety: { min: t('rating_area_safety_min'), max: t('rating_area_safety_max') },
    neighbourhood_vibe: { min: t('rating_neighbourhood_vibe_min'), max: t('rating_neighbourhood_vibe_max') },
    outdoor_spaces: { min: t('rating_outdoor_spaces_min'), max: t('rating_outdoor_spaces_max') },
    parking: { min: t('rating_parking_min'), max: t('rating_parking_max') },
    building_maintenance: { min: t('rating_building_maintenance_min'), max: t('rating_building_maintenance_max') },
    construction_quality: { min: t('rating_construction_quality_min'), max: t('rating_construction_quality_max') }
  }), [t]);
}

export function SubmitPage() {
  const { t, i18n } = useTranslation();
  const ratingLabels = useRatingLabels();
  const ratingScale = useRatingScale();
  const [searchParams] = useSearchParams();
  const placeParam = (searchParams.get('place') ?? '').trim();
  const [fromYear, setFromYear] = useState(2020);
  const [toYear, setToYear] = useState(2024);
  const [durationMonths, setDurationMonths] = useState(12);
  const [comment, setComment] = useState('');
  const [ratings, setRatings] = useState(initialRatings);
  const [result, setResult] = useState<{ tracking_code: string; edit_token: string } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeError, setPlaceError] = useState<string | null>(null);

  type GeocodeResult = {
    label: string;
    country_code: string;
    city_name: string;
    area_name: string;
    street_name: string;
    lat: number;
    lng: number;
  };

  const [placeResults, setPlaceResults] = useState<GeocodeResult[]>([]);
  const [selectedStreet, setSelectedStreet] = useState<GeocodeResult | null>(null);
  const [rangeStart, setRangeStart] = useState(10);
  const [rangeEnd, setRangeEnd] = useState(30);
  const [doorNumber, setDoorNumber] = useState<number | ''>('');
  const [errors, setErrors] = useState<{
    building?: string;
    range?: string;
    fromYear?: string;
    toYear?: string;
    durationMonths?: string;
    comment?: string;
  }>({});

  const suggestedDurationMonths = useMemo(() => {
    if (!Number.isFinite(fromYear) || !Number.isFinite(toYear)) return 0;
    if (toYear < fromYear) return 0;
    return (toYear - fromYear) * 12;
  }, [fromYear, toYear]);

  const searchPlaces = useCallback(async (q?: string) => {
    const trimmed = (q ?? placeQuery).trim();
    if (trimmed.length < 2) {
      setPlaceResults([]);
      return;
    }
    setPlaceError(null);
    try {
      const response = await api.get<GeocodeResult[]>('/geocode', { params: { q: trimmed } });
      setPlaceResults(response.data);
      if (response.data.length === 0) {
        setPlaceError(t('submit_place_not_found'));
      }
    } catch {
      setPlaceError(t('submit_place_unavailable'));
      setPlaceResults([]);
    }
  }, [placeQuery]);

  useEffect(() => {
    if (!placeParam) return;
    setPlaceQuery(placeParam);
    void searchPlaces(placeParam);
  }, [placeParam, searchPlaces]);

  function validate() {
    const next: typeof errors = {};

    if (!selectedStreet) {
      next.building = t('submit_err_building');
    }

    const hasDoor = typeof doorNumber === 'number' && Number.isFinite(doorNumber);
    if (!hasDoor) {
      if (!Number.isFinite(rangeStart) || rangeStart < 1 || rangeStart > 99999) {
        next.range = t('submit_err_range_start');
      }
      if (!Number.isFinite(rangeEnd) || rangeEnd < 1 || rangeEnd > 99999) {
        next.range = t('submit_err_range_end');
      }
      if (!next.range && rangeEnd < rangeStart) {
        next.range = t('submit_err_range_start');
      }
      if (!next.range && rangeEnd - rangeStart > 500) {
        next.range = t('submit_err_range_end');
      }
    }

    if (!Number.isFinite(fromYear) || fromYear < 1900 || fromYear > 2100) {
      next.fromYear = t('submit_err_year');
    }

    if (!Number.isFinite(toYear) || toYear < 1900 || toYear > 2100) {
      next.toYear = t('submit_err_year');
    }

    if (!next.fromYear && !next.toYear && toYear < fromYear) {
      next.toYear = t('submit_err_year_order');
    }

    if (!Number.isFinite(durationMonths) || durationMonths <= 0 || durationMonths > 600) {
      next.durationMonths = t('submit_err_duration');
    }

    if (comment.trim().length < 20) {
      next.comment = t('submit_err_comment_short');
    }

    const effectiveComment = `${comment.trim()}\n\nStayed about ${durationMonths} month${durationMonths === 1 ? '' : 's'}.`;
    if (effectiveComment.length > 4000) {
      next.comment = t('submit_err_comment_long');
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setApiError(null);
    setResult(null);
    if (!validate()) return;

    const effectiveComment = `${comment.trim()}\n\nStayed about ${durationMonths} month${durationMonths === 1 ? '' : 's'}.`;

    try {
      const hasDoor = typeof doorNumber === 'number' && Number.isFinite(doorNumber);
      const resolveResponse = await api.post<{ building_id: number }>('/places/resolve', {
        country_code: selectedStreet!.country_code,
        city_name: selectedStreet!.city_name,
        area_name: selectedStreet!.area_name,
        street_name: selectedStreet!.street_name,
        street_number: hasDoor ? doorNumber : null,
        range_start: hasDoor ? null : rangeStart,
        range_end: hasDoor ? null : rangeEnd,
        lat: selectedStreet!.lat,
        lng: selectedStreet!.lng
      });

      const response = await api.post('/reviews', {
        building_id: resolveResponse.data.building_id,
        language_tag: i18n.language,
        lived_from_year: fromYear,
        lived_to_year: toYear,
        comment: effectiveComment,
        ...ratings
      });
      setResult(response.data);
    } catch (err: any) {
      const status = err?.response?.status as number | undefined;
      const detail = err?.response?.data?.detail as string | undefined;
      if (status === 429) {
        setApiError(t('submit_err_rate_limit') + (detail ? ` (${detail})` : ''));
      } else if (typeof detail === 'string' && detail.trim()) {
        setApiError(detail);
      } else {
        setApiError(t('submit_err_generic'));
      }
    }
  }

  return (
    <main className="space-y-6">
      <section className="card">
        <h1 className="text-2xl font-bold text-ink">{t('submit_title')}</h1>
        <p className="mt-2 text-ink/75">{t('submit_subtitle')}</p>
      </section>

      <form className="space-y-6" onSubmit={submit}>
        <section className="card">
          <h2 className="text-lg font-bold text-ink">{t('submit_about_stay')}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-ink">{t('submit_place_label')}</label>
              <div className="mt-1 flex gap-2">
                <input
                  className="input"
                  value={placeQuery}
                  onChange={(event) => setPlaceQuery(event.target.value)}
                  placeholder={t('submit_place_placeholder')}
                />
                <button className="btn px-4" type="button" onClick={() => void searchPlaces()}>
                  {t('submit_place_find')}
                </button>
              </div>
              {selectedStreet && (
                <p className="mt-2 text-sm text-ink/70">
                  {t('submit_place_selected')} <span className="font-semibold text-ink">{selectedStreet.label}</span>
                </p>
              )}
              {errors.building && <p className="mt-1 text-sm text-red-700">{errors.building}</p>}
              {errors.range && <p className="mt-1 text-sm text-red-700">{errors.range}</p>}
              {placeError && <p className="mt-2 text-sm text-ink/70">{placeError}</p>}

              {placeResults.length > 0 && (
                <div className="mt-3 grid gap-2">
                  {placeResults.slice(0, 6).map((item) => {
                    const label = item.label;
                    const key = `${item.country_code}-${item.city_name}-${item.street_name}-${item.lat}-${item.lng}`;
                    return (
                      <button
                        key={key}
                        type="button"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-sand"
                        onClick={() => {
                          setSelectedStreet(item);
                          setDoorNumber('');
                          setRangeStart(10);
                          setRangeEnd(30);
                          setPlaceResults([]);
                        }}
                      >
                        <p className="font-semibold text-ink">{label}</p>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedStreet && (
                <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-ink">{t('submit_choose_target')}</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="text-sm text-ink/80">
                      {t('submit_door_number')}
                      <input
                        className="input mt-1"
                        type="number"
                        value={doorNumber}
                        onChange={(e) => setDoorNumber(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder={t('submit_door_placeholder')}
                      />
                    </label>
                    <label className="text-sm text-ink/80">
                      {t('submit_range_start')}
                      <input className="input mt-1" type="number" value={rangeStart} onChange={(e) => setRangeStart(Number(e.target.value))} />
                    </label>
                    <label className="text-sm text-ink/80">
                      {t('submit_range_end')}
                      <input className="input mt-1" type="number" value={rangeEnd} onChange={(e) => setRangeEnd(Number(e.target.value))} />
                    </label>
                  </div>
                  <p className="text-xs text-ink/60">
                    {t('submit_range_hint')}
                  </p>
                </div>
              )}

              <p className="mt-2 text-xs text-ink/60">{t('submit_place_tip')}</p>
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-ink">{t('submit_from_year')}</label>
              <input className="input mt-1" type="number" value={fromYear} onChange={(event) => setFromYear(Number(event.target.value))} />
              {errors.fromYear && <p className="mt-1 text-sm text-red-700">{errors.fromYear}</p>}
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-ink">{t('submit_to_year')}</label>
              <input className="input mt-1" type="number" value={toYear} onChange={(event) => setToYear(Number(event.target.value))} />
              {errors.toYear && <p className="mt-1 text-sm text-red-700">{errors.toYear}</p>}
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-ink">{t('submit_duration')}</label>
              <input
                className="input mt-1"
                type="number"
                value={durationMonths}
                onChange={(event) => setDurationMonths(Number(event.target.value))}
                min={1}
                max={600}
              />
              {errors.durationMonths && <p className="mt-1 text-sm text-red-700">{errors.durationMonths}</p>}
              <p className="mt-1 text-xs text-ink/60">{t('submit_duration_suggested', { months: suggestedDurationMonths || '—' })}</p>
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="text-lg font-bold text-ink">{t('submit_experience')}</h2>
          <p className="mt-2 text-sm text-ink/70">{t('submit_experience_hint')}</p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {(Object.keys(ratings) as Array<keyof typeof initialRatings>).map((key) => (
              <div key={key} className="rounded-xl border border-slate-200 bg-white p-4">
                <StarRating
                  value={ratings[key]}
                  onChange={(value) => setRatings((prev) => ({ ...prev, [key]: value }))}
                  label={ratingLabels[key]}
                  minLabel={ratingScale[key].min}
                  maxLabel={ratingScale[key].max}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="text-lg font-bold text-ink">{t('submit_notes')}</h2>
          <label className="mt-4 block text-sm font-medium text-ink">{t('submit_notes_label')}</label>
          <textarea
            className="input mt-1 min-h-32"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={t('submit_notes_placeholder')}
          />
          {errors.comment && <p className="mt-1 text-sm text-red-700">{errors.comment}</p>}
          <p className="mt-2 text-xs text-ink/60">{t('submit_notes_duration_hint')}</p>
        </section>

        <section className="card">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button className="btn h-11 px-6 text-base" type="submit">
              {t('submit_button')}
            </button>
            <p className="text-sm text-ink/70">{t('submit_all_reviewed')}</p>
            <p className="mt-1 text-xs text-ink/60">{t('submit_privacy_notice')}</p>
          </div>
          {apiError && <p className="mt-3 text-sm text-red-700">{apiError}</p>}
        </section>
      </form>

      {result && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-ink">{t('submit_success_title')}</h2>
          <p className="mt-2 text-sm text-ink/70">{t('submit_success_hint')}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-sand p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">{t('submit_tracking_code')}</p>
              <p className="mt-1 font-mono text-sm text-ink">{result.tracking_code}</p>
            </div>
            <div className="rounded-xl bg-sand p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">{t('submit_edit_token')}</p>
              <p className="mt-1 font-mono text-sm text-ink">{result.edit_token}</p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
