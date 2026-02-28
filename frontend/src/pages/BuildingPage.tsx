import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
  const { id, locale } = useParams();
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
    setReportNote(t('report') + ' ✓');
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

  const ratingScale = useMemo(() => [
    { key: 'people_noise'         as keyof Review, label: t('rating_people_noise'),          minLabel: t('rating_people_noise_min'),          maxLabel: t('rating_people_noise_max'),          avg: avgPeople },
    { key: 'animal_noise'         as keyof Review, label: t('rating_animal_noise'),          minLabel: t('rating_animal_noise_min'),          maxLabel: t('rating_animal_noise_max'),          avg: avgAnimal },
    { key: 'insulation'           as keyof Review, label: t('rating_insulation'),            minLabel: t('rating_insulation_min'),            maxLabel: t('rating_insulation_max'),            avg: avgInsulation },
    { key: 'pest_issues'         as keyof Review, label: t('rating_pest_issues'),           minLabel: t('rating_pest_issues_min'),           maxLabel: t('rating_pest_issues_max'),           avg: avgPests },
    { key: 'area_safety'         as keyof Review, label: t('rating_area_safety'),           minLabel: t('rating_area_safety_min'),           maxLabel: t('rating_area_safety_max'),           avg: avgSafety },
    { key: 'neighbourhood_vibe'  as keyof Review, label: t('rating_neighbourhood_vibe'),    minLabel: t('rating_neighbourhood_vibe_min'),    maxLabel: t('rating_neighbourhood_vibe_max'),    avg: avgVibe },
    { key: 'outdoor_spaces'      as keyof Review, label: t('rating_outdoor_spaces'),        minLabel: t('rating_outdoor_spaces_min'),        maxLabel: t('rating_outdoor_spaces_max'),        avg: avgOutdoor },
    { key: 'parking'             as keyof Review, label: t('rating_parking'),               minLabel: t('rating_parking_min'),               maxLabel: t('rating_parking_max'),               avg: avgParking },
    { key: 'building_maintenance' as keyof Review, label: t('rating_building_maintenance'), minLabel: t('rating_building_maintenance_min'), maxLabel: t('rating_building_maintenance_max'), avg: avgMaintenance },
    { key: 'construction_quality' as keyof Review, label: t('rating_construction_quality'), minLabel: t('rating_construction_quality_min'), maxLabel: t('rating_construction_quality_max'), avg: avgConstruction },
  ], [t, avgPeople, avgAnimal, avgInsulation, avgPests, avgSafety, avgVibe, avgOutdoor, avgParking, avgMaintenance, avgConstruction]);

  if (!data) return <main className="card">{t('loading')}</main>;

  return (
    <main className="space-y-3">
      <section className="card">
        <h1 className="text-xl font-semibold">
          {data.street},{' '}
          {data.range_start != null && data.range_end != null ? `${data.range_start}–${data.range_end}` : data.street_number}
        </h1>
        <p className="mt-1 text-sm text-ink/70">{data.area}, {data.city}</p>
        <Link className="mt-2 inline-block text-sm font-semibold text-primary underline" to={`/${locale}/submit`}>
          {t('building_submit_review')}
        </Link>
      </section>

      {reportNote && <section className="card"><p className="text-sm text-ink/70">{reportNote}</p></section>}

      <section className="card space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">{t('building_avg_ratings')}</p>
            <p className="mt-1 text-sm text-ink/70">{reviews.length === 1 ? t('building_based_on', { count: reviews.length }) : t('building_based_on_plural', { count: reviews.length })}</p>
          </div>
          {reviews.length > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold text-ink">{avgOverall.toFixed(2)}</p>
              <p className="text-xs font-semibold text-ink/60">{t('building_overall')}</p>
            </div>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="text-sm text-ink/70">{t('building_no_reviews')}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {ratingScale.map((r) => (
              <div key={String(r.key)} className="rounded-xl border border-slate-200 bg-white p-4">
                <StarRating
                  value={Math.round(r.avg)}
                  label={r.label}
                  minLabel={r.minLabel}
                  maxLabel={r.maxLabel}
                  readOnly
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {reviews.length > 0 && (
        <section className="card space-y-3">
          <h2 className="text-sm font-semibold text-ink">{t('building_comments')}</h2>
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
                        <p className="mt-1 text-xs text-ink/60">{t('building_lived', { from: review.lived_from_year, to: review.lived_to_year })}{review.verified ? ` · ${t('building_verified')}` : ''}</p>
                      </div>
                      <span className="text-xs font-semibold text-ink/60">{expanded ? t('hide') : t('details')}</span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-slate-200 px-4 py-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink">{t('building_detailed_scores')}</p>
                          <p className="mt-1 text-xs text-ink/60">{t('building_report_hint')}</p>
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
                        {ratingScale.map((r) => (
                          <div key={String(r.key)} className="rounded-xl border border-slate-200 bg-white p-4">
                            <StarRating
                              value={review[r.key] as number}
                              label={r.label}
                              minLabel={r.minLabel}
                              maxLabel={r.maxLabel}
                              readOnly
                            />
                          </div>
                        ))}
                      </div>

                      {openReportFor === review.id && (
                        <form onSubmit={(event) => report(review.id, event)} className="flex flex-wrap items-center gap-2">
                          <select className="input max-w-xs" value={reason} onChange={(event) => setReason(event.target.value)}>
                            <option value="PII">{t('report_reason_PII')}</option>
                            <option value="Harassment">{t('report_reason_Harassment')}</option>
                            <option value="FalseInfo">{t('report_reason_FalseInfo')}</option>
                            <option value="Spam">{t('report_reason_Spam')}</option>
                            <option value="Other">{t('report_reason_Other')}</option>
                          </select>
                          <button className="btn-accent" type="submit">{t('report')}</button>
                          <button
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-ink hover:bg-sand"
                            type="button"
                            onClick={() => setOpenReportFor(null)}
                          >
                            {t('cancel')}
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
