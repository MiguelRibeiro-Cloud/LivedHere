import { FormEvent, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { api } from '../api/client';

type StatusResponse = { status: string; moderation_message: string | null };

export function StatusPage() {
  const { code, locale = 'en' } = useParams();
  const navigate = useNavigate();
  const [trackingCode, setTrackingCode] = useState(code ?? '');
  const [result, setResult] = useState<StatusResponse | null>(null);

  async function check(event: FormEvent) {
    event.preventDefault();
    const response = await api.get<StatusResponse>(`/review-status/${trackingCode}`);
    setResult(response.data);
    navigate(`/${locale}/status/${trackingCode}`, { replace: true });
  }

  return (
    <main className="card space-y-3">
      <form onSubmit={check} className="space-y-2">
        <input className="input" value={trackingCode} onChange={(event) => setTrackingCode(event.target.value)} placeholder="Tracking code" />
        <button className="btn" type="submit">Check</button>
      </form>
      {result && (
        <div>
          <p>Status: {result.status}</p>
          <p>Message: {result.moderation_message ?? '-'}</p>
        </div>
      )}
    </main>
  );
}
