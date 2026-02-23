import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { api } from '../api/client';
import { StarRating } from '../components/StarRating';

type Review = {
  id: number;
  score: number;
  lived_from_year: number;
  lived_to_year: number;
  people_noise: number;
  animal_noise: number;
  insulation: number;
  pest_issues: number;
  area_safety: number;
  neighbourhood_vibe: number;
  outdoor_spaces: number;
  parking: number;
  building_maintenance: number;
  construction_quality: number;
  comment: string;
  verified: boolean;
  created_at: string;
};
type BuildingResponse = {
  id: number;
  street: string;
  area: string;
  city: string;
  street_number: number;
  range_start?: number | null;
  range_end?: number | null;
  reviews: Review[];
};

export function BuildingPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [data, setData] = useState<BuildingResponse | null>(null);
  const [expandedReviewId, setExpandedReviewId] = useState<number | null>(null);
  const [openReportFor, setOpenReportFor] = useState<number | null>(null);
  const [reason, setReason] = useState('PII');
  const [reportNote, setReportNote] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get<BuildingResponse>(`/buildings/${id}`).then((response) => setData(response.data));
  }, [id]);

  async function report(reviewId: number, event: FormEvent) {
    event.preventDefault();
    await api.post('/reports', { review_id: reviewId, reason });
    setReportNote('Thanks — report received.');
    setOpenReportFor(null);
  }

  function avg(values: number[]) {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  const reviews = data?.reviews ?? [];
  const avgOverall = reviews.length ? avg(reviews.map((r) => r.score)) : 0;
  const avgPeople = reviews.length ? avg(reviews.map((r) => r.people_noise)) : 0;
  const avgAnimal = reviews.length ? avg(reviews.map((r) => r.animal_noise)) : 0;
  const avgInsulation = reviews.length ? avg(reviews.map((r) => r.insulation)) : 0;
  const avgPests = reviews.length ? avg(reviews.map((r) => r.pest_issues)) : 0;
  const avgSafety = reviews.length ? avg(reviews.map((r) => r.area_safety)) : 0;
  const avgVibe = reviews.length ? avg(reviews.map((r) => r.neighbourhood_vibe)) : 0;
  const avgOutdoor = reviews.length ? avg(reviews.map((r) => r.outdoor_spaces)) : 0;
  const avgParking = reviews.length ? avg(reviews.map((r) => r.parking)) : 0;
  const avgMaintenance = reviews.length ? avg(reviews.map((r) => r.building_maintenance)) : 0;
  const avgConstruction = reviews.length ? avg(reviews.map((r) => r.construction_quality)) : 0;

  if (!data) return <main className="card">Loading…</main>;

  return (
    <main className="space-y-3">
      <section className="card">
        <h1 className="text-xl font-semibold">
          {data.street},{' '}
          {data.range_start != null && data.range_end != null ? `${data.range_start}–${data.range_end}` : data.street_number}
        </h1>
        <p className="mt-1 text-sm text-ink/70">{data.area}, {data.city}</p>
      </section>

      {reportNote && <section className="card"><p className="text-sm text-ink/70">{reportNote}</p></section>}

      <section className="card space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Average ratings</p>
            <p className="mt-1 text-sm text-ink/70">Based on {reviews.length} review{reviews.length === 1 ? '' : 's'}.</p>
          </div>
          {reviews.length > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold text-ink">{avgOverall.toFixed(2)}</p>
              <p className="text-xs font-semibold text-ink/60">overall</p>
            </div>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="text-sm text-ink/70">No reviews yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <StarRating value={Math.round(avgPeople)} label="Noise from neighbors" readOnly />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <StarRating value={Math.round(avgAnimal)} label="Noise from animals" readOnly />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <StarRating value={Math.round(avgInsulation)} label="Sound insulation" readOnly />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <StarRating value={Math.round(avgPests)} label="Pest problems" readOnly />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <StarRating value={Math.round(avgSafety)} label="Area safety" readOnly />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <StarRating value={Math.round(avgVibe)} label="Neighborhood vibe" readOnly />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <StarRating value={Math.round(avgOutdoor)} label="Outdoor spaces" readOnly />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <StarRating value={Math.round(avgParking)} label="Parking availability" readOnly />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <StarRating value={Math.round(avgMaintenance)} label="Building maintenance" readOnly />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <StarRating value={Math.round(avgConstruction)} label="Construction quality" readOnly />
            </div>
          </div>
        )}
      </section>

      {reviews.length > 0 && (
        <section className="card space-y-3">
          <h2 className="text-sm font-semibold text-ink">Comments</h2>
          <div className="space-y-2">
            {reviews.map((review) => {
              const expanded = expandedReviewId === review.id;
              return (
                <div key={review.id} className="rounded-xl border border-slate-200 bg-white">
                  <button
                    type="button"
                    className="w-full rounded-xl px-4 py-3 text-left hover:bg-sand"
                    onClick={() => {
                      setReportNote(null);
                      setOpenReportFor(null);
                      setExpandedReviewId((prev) => (prev === review.id ? null : review.id));
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">⭐ {review.score.toFixed(2)}</p>
                        <p className="mt-1 text-sm text-ink/80">{review.comment}</p>
                        <p className="mt-1 text-xs text-ink/60">Lived {review.lived_from_year}–{review.lived_to_year}{review.verified ? ' · Verified' : ''}</p>
                      </div>
                      <span className="text-xs font-semibold text-ink/60">{expanded ? 'Hide' : 'Details'}</span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-slate-200 px-4 py-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink">Detailed scores</p>
                          <p className="mt-1 text-xs text-ink/60">Click the flag to report this comment.</p>
                        </div>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-ink/60 hover:bg-sand"
                          aria-label={t('report')}
                          title={t('report')}
                          onClick={() => {
                            setOpenReportFor((prev) => (prev === review.id ? null : review.id));
                          }}
                        >
                          ⚑
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <StarRating value={review.people_noise} label="Noise from neighbors" readOnly />
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <StarRating value={review.animal_noise} label="Noise from animals" readOnly />
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <StarRating value={review.insulation} label="Sound insulation" readOnly />
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <StarRating value={review.pest_issues} label="Pest problems" readOnly />
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <StarRating value={review.area_safety} label="Area safety" readOnly />
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <StarRating value={review.neighbourhood_vibe} label="Neighborhood vibe" readOnly />
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <StarRating value={review.outdoor_spaces} label="Outdoor spaces" readOnly />
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <StarRating value={review.parking} label="Parking availability" readOnly />
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <StarRating value={review.building_maintenance} label="Building maintenance" readOnly />
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <StarRating value={review.construction_quality} label="Construction quality" readOnly />
                        </div>
                      </div>

                      {openReportFor === review.id && (
                        <form onSubmit={(event) => report(review.id, event)} className="flex flex-wrap items-center gap-2">
                          <select className="input max-w-xs" value={reason} onChange={(event) => setReason(event.target.value)}>
                            <option value="PII">PII</option>
                            <option value="Harassment">Harassment</option>
                            <option value="FalseInfo">FalseInfo</option>
                            <option value="Spam">Spam</option>
                            <option value="Other">Other</option>
                          </select>
                          <button className="btn-accent" type="submit">{t('report')}</button>
                          <button
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-ink hover:bg-sand"
                            type="button"
                            onClick={() => setOpenReportFor(null)}
                          >
                            Cancel
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
