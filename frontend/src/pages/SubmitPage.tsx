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

const ratingLabels: Record<keyof typeof initialRatings, string> = {
  people_noise: 'Noise from neighbors',
  animal_noise: 'Noise from animals',
  insulation: 'Sound insulation',
  pest_issues: 'Pest problems',
  area_safety: 'Area safety',
  neighbourhood_vibe: 'Neighborhood vibe',
  outdoor_spaces: 'Outdoor spaces',
  parking: 'Parking availability',
  building_maintenance: 'Building maintenance',
  construction_quality: 'Construction quality'
};

const ratingScale: Record<keyof typeof initialRatings, { min: string; max: string }> = {
  people_noise: { min: 'constantly loud', max: 'peaceful and quiet' },
  animal_noise: { min: 'frequent disturbance', max: 'rarely noticeable' },
  insulation: { min: 'everything carries through', max: 'excellent sound isolation' },
  pest_issues: { min: 'serious pest problems', max: 'never saw any pests' },
  area_safety: { min: 'often feels unsafe', max: 'consistently feels safe' },
  neighbourhood_vibe: { min: 'unpleasant atmosphere', max: 'great community vibe' },
  outdoor_spaces: { min: 'none or unusable', max: 'excellent usable spaces' },
  parking: { min: 'painfully difficult', max: 'easy and reliable' },
  building_maintenance: { min: 'neglected and broken', max: 'well-maintained and responsive' },
  construction_quality: { min: 'flimsy and drafty', max: 'solid and well-built' }
};

export function SubmitPage() {
  const { t, i18n } = useTranslation();
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
        setPlaceError('No matches found. Try a broader search (city + street name).');
      }
    } catch {
      setPlaceError('Sorry—search is unavailable right now. Please try again.');
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
      next.building = 'Please search and select a street before submitting.';
    }

    const hasDoor = typeof doorNumber === 'number' && Number.isFinite(doorNumber);
    if (!hasDoor) {
      if (!Number.isFinite(rangeStart) || rangeStart < 1 || rangeStart > 99999) {
        next.range = 'Please enter a start number between 1 and 99999.';
      }
      if (!Number.isFinite(rangeEnd) || rangeEnd < 1 || rangeEnd > 99999) {
        next.range = 'Please enter an end number between 1 and 99999.';
      }
      if (!next.range && rangeEnd < rangeStart) {
        next.range = 'End number should be the same as or after start number.';
      }
      if (!next.range && rangeEnd - rangeStart > 500) {
        next.range = 'Please keep the range within 500 numbers.';
      }
    }

    if (!Number.isFinite(fromYear) || fromYear < 1900 || fromYear > 2100) {
      next.fromYear = 'Please enter a real year (e.g., 2019).';
    }

    if (!Number.isFinite(toYear) || toYear < 1900 || toYear > 2100) {
      next.toYear = 'Please enter a real year (e.g., 2024).';
    }

    if (!next.fromYear && !next.toYear && toYear < fromYear) {
      next.toYear = '“To year” should be the same as or after “From year”.';
    }

    if (!Number.isFinite(durationMonths) || durationMonths <= 0 || durationMonths > 600) {
      next.durationMonths = 'Please enter a duration between 1 and 600 months.';
    }

    if (comment.trim().length < 20) {
      next.comment = 'A short note helps others—please write at least 20 characters.';
    }

    const effectiveComment = `${comment.trim()}\n\nStayed about ${durationMonths} month${durationMonths === 1 ? '' : 's'}.`;
    if (effectiveComment.length > 4000) {
      next.comment = 'Your note is a bit too long. Please shorten it to fit within 4000 characters.';
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
        setApiError(`You're submitting too quickly. Please wait a bit and try again.${detail ? ` (${detail})` : ''}`);
      } else if (typeof detail === 'string' && detail.trim()) {
        setApiError(detail);
      } else {
        setApiError('Sorry—something went wrong while submitting. Please try again in a moment.');
      }
    }
  }

  return (
    <main className="space-y-6">
      <section className="card">
        <h1 className="text-2xl font-bold text-ink">Help others make better housing decisions.</h1>
        <p className="mt-2 text-ink/75">Your review will be moderated and anonymized.</p>
      </section>

      <form className="space-y-6" onSubmit={submit}>
        <section className="card">
          <h2 className="text-lg font-bold text-ink">About your stay</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-ink">Place</label>
              <div className="mt-1 flex gap-2">
                <input
                  className="input"
                  value={placeQuery}
                  onChange={(event) => setPlaceQuery(event.target.value)}
                  placeholder="Search by street, area, or city…"
                />
                <button className="btn px-4" type="button" onClick={() => void searchPlaces()}>
                  Find
                </button>
              </div>
              {selectedStreet && (
                <p className="mt-2 text-sm text-ink/70">
                  Selected: <span className="font-semibold text-ink">{selectedStreet.label}</span>
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
                  <p className="text-sm font-semibold text-ink">Choose a target on this street</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="text-sm text-ink/80">
                      Door number (optional)
                      <input
                        className="input mt-1"
                        type="number"
                        value={doorNumber}
                        onChange={(e) => setDoorNumber(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="e.g. 12"
                      />
                    </label>
                    <label className="text-sm text-ink/80">
                      Range start
                      <input className="input mt-1" type="number" value={rangeStart} onChange={(e) => setRangeStart(Number(e.target.value))} />
                    </label>
                    <label className="text-sm text-ink/80">
                      Range end
                      <input className="input mt-1" type="number" value={rangeEnd} onChange={(e) => setRangeEnd(Number(e.target.value))} />
                    </label>
                  </div>
                  <p className="text-xs text-ink/60">
                    Leave door number blank to review a portion of the street (we’ll store it as a range).
                  </p>
                </div>
              )}

              <p className="mt-2 text-xs text-ink/60">Tip: If you can’t find the street, try searching by city + street name.</p>
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-ink">From year</label>
              <input className="input mt-1" type="number" value={fromYear} onChange={(event) => setFromYear(Number(event.target.value))} />
              {errors.fromYear && <p className="mt-1 text-sm text-red-700">{errors.fromYear}</p>}
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-ink">To year</label>
              <input className="input mt-1" type="number" value={toYear} onChange={(event) => setToYear(Number(event.target.value))} />
              {errors.toYear && <p className="mt-1 text-sm text-red-700">{errors.toYear}</p>}
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-ink">Duration (months)</label>
              <input
                className="input mt-1"
                type="number"
                value={durationMonths}
                onChange={(event) => setDurationMonths(Number(event.target.value))}
                min={1}
                max={600}
              />
              {errors.durationMonths && <p className="mt-1 text-sm text-red-700">{errors.durationMonths}</p>}
              <p className="mt-1 text-xs text-ink/60">Suggested: {suggestedDurationMonths || '—'} months (you can edit this).</p>
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="text-lg font-bold text-ink">Your experience</h2>
          <p className="mt-2 text-sm text-ink/70">Pick a rating from 1 to 5 for each topic.</p>

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
          <h2 className="text-lg font-bold text-ink">Additional notes</h2>
          <label className="mt-4 block text-sm font-medium text-ink">Anything else you'd like to share?</label>
          <textarea
            className="input mt-1 min-h-32"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Focus on what future residents should know. Please avoid names or personal details."
          />
          {errors.comment && <p className="mt-1 text-sm text-red-700">{errors.comment}</p>}
          <p className="mt-2 text-xs text-ink/60">We’ll include your duration (months) with your note for clarity.</p>
        </section>

        <section className="card">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button className="btn h-11 px-6 text-base" type="submit">
              Submit review
            </button>
            <p className="text-sm text-ink/70">All reviews are reviewed before publication.</p>
          </div>
          {apiError && <p className="mt-3 text-sm text-red-700">{apiError}</p>}
        </section>
      </form>

      {result && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-ink">Thanks—your review was received.</h2>
          <p className="mt-2 text-sm text-ink/70">Save these codes to check status or edit later.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-sand p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Tracking code</p>
              <p className="mt-1 font-mono text-sm text-ink">{result.tracking_code}</p>
            </div>
            <div className="rounded-xl bg-sand p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Edit token</p>
              <p className="mt-1 font-mono text-sm text-ink">{result.edit_token}</p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
