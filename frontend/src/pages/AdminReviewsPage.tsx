import { useEffect, useState } from 'react';

import { api } from '../api/client';

type Review = { id: number; status: string; comment: string; pii_flagged: boolean };

export function AdminReviewsPage() {
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
          <p>{review.pii_flagged ? '⚠️ PII flagged' : 'No PII flags'}</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => moderate(review.id, 'approve')}>Approve</button>
            <button className="btn" onClick={() => moderate(review.id, 'request-changes')}>Request changes</button>
            <button className="btn-accent" onClick={() => moderate(review.id, 'reject')}>Reject</button>
            <button className="btn-accent" onClick={() => moderate(review.id, 'remove')}>Remove</button>
          </div>
        </article>
      ))}
    </main>
  );
}
