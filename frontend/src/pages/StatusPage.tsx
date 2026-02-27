import { FormEvent, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { api } from '../api/client';

type StatusResponse = { status: string; moderation_message: string | null };

const STATUS_KEYS: Record<string, string> = {
  PENDING: 'status_PENDING',
  APPROVED: 'status_APPROVED',
  REJECTED: 'status_REJECTED',
  CHANGES_REQUESTED: 'status_CHANGES_REQUESTED',
  REMOVED: 'status_REMOVED',
};

export function StatusPage() {
  const { t } = useTranslation();
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
    <main className="space-y-4">
      <section className="card space-y-1">
        <h1 className="text-xl font-bold text-ink">{t('status_title')}</h1>
        <p className="text-sm text-ink/70">{t('status_subtitle')}</p>
      </section>

      <section className="card">
        <form onSubmit={check} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input
            className="input flex-1"
            value={trackingCode}
            onChange={(event) => setTrackingCode(event.target.value)}
            placeholder={t('status_placeholder')}
          />
          <button className="btn h-10 px-5" type="submit">{t('status_check')}</button>
        </form>
      </section>

      {result && (
        <section className="card space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink/60">{t('status_label')}</span>
            <span className="rounded-full bg-sand px-3 py-0.5 text-sm font-bold text-primary">
              {t(STATUS_KEYS[result.status] ?? result.status)}
            </span>
          </div>
          <div>
            <span className="text-sm font-semibold text-ink/60">{t('status_message')}</span>
            <p className="mt-1 text-sm text-ink">
              {result.moderation_message ?? t('status_none')}
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
