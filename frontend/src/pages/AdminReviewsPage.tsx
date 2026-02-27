import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '../api/client';

type Review = { id: number; status: string; comment: string; pii_flagged: boolean };

export function AdminReviewsPage() {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);

  async function load() {
    const response = await api.get<Review[]>('/admin/reviews');
    setReviews(response.data);
  }

  useEffect(() => {
    void load();
  }, []);

  async function moderate(id: number, action: 'approve' | 'reject' | 'request-changes' | 'remove') {
    await api.post(`/admin/reviews/${id}/${action}`, { message: `Action ${action} applied.` });
    await load();
  }

  return (
    <main className="space-y-3">
      {reviews.map((review) => (
        <article key={review.id} className="card space-y-2">
          <p className="font-semibold">#{review.id} · {review.status}</p>
          <p>{review.comment}</p>
          <p>{review.pii_flagged ? t('admin_pii_flagged') : t('admin_no_pii')}</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => moderate(review.id, 'approve')}>{t('admin_approve')}</button>
            <button className="btn" onClick={() => moderate(review.id, 'request-changes')}>{t('admin_request_changes')}</button>
            <button className="btn-accent" onClick={() => moderate(review.id, 'reject')}>{t('admin_reject')}</button>
            <button className="btn-accent" onClick={() => moderate(review.id, 'remove')}>{t('admin_remove')}</button>
          </div>
        </article>
      ))}
    </main>
  );
}
