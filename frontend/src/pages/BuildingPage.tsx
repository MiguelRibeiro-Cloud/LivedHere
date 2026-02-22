import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { api } from '../api/client';

type Review = { id: number; score: number; comment: string; verified: boolean; created_at: string };
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
  const [reason, setReason] = useState('PII');

  useEffect(() => {
    if (!id) return;
    api.get<BuildingResponse>(`/buildings/${id}`).then((response) => setData(response.data));
  }, [id]);

  async function report(reviewId: number, event: FormEvent) {
    event.preventDefault();
    await api.post('/reports', { review_id: reviewId, reason });
    alert('Reported');
  }

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
      {data.reviews.map((review) => (
        <article key={review.id} className="card space-y-2">
          <p className="font-semibold">⭐ {review.score.toFixed(2)} {review.verified ? '✅ Verified Account' : ''}</p>
          <p>{review.comment}</p>
          <form onSubmit={(event) => report(review.id, event)} className="flex items-center gap-2">
            <select className="input max-w-xs" value={reason} onChange={(event) => setReason(event.target.value)}>
              <option value="PII">PII</option>
              <option value="Harassment">Harassment</option>
              <option value="FalseInfo">FalseInfo</option>
              <option value="Spam">Spam</option>
              <option value="Other">Other</option>
            </select>
            <button className="btn-accent" type="submit">{t('report')}</button>
          </form>
        </article>
      ))}
    </main>
  );
}
