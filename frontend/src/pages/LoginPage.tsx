import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { api } from '../api/client';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { locale = 'en' } = useParams();
  const [email, setEmail] = useState('');
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('');

  async function requestLink(event: FormEvent) {
    event.preventDefault();
    const response = await api.post('/auth/request-link', { email });
    setMessage(response.data.dev_link ? `Dev link: ${response.data.dev_link}` : t('login_check_email'));
  }

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) return;
    api.get('/auth/callback', { params: { token } }).then(() => setMessage(t('login_authenticated')));
  }, [searchParams]);

  async function devLoginAs(targetEmail: string, redirectTo: string) {
    setMessage('Signing in…');
    try {
      const response = await api.post('/auth/request-link', { email: targetEmail });
      const devLink: string | null | undefined = response.data?.dev_link;
      if (!devLink) {
        setMessage('Dev link not available. Check API logs for DEV_MAGIC_LINK.');
        return;
      }
      const token = new URL(devLink).searchParams.get('token');
      if (!token) {
        setMessage('Dev link did not include a token.');
        return;
      }
      await api.get('/auth/callback', { params: { token } });
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const status = err?.response?.status;
      if (status && detail) {
        const rendered = typeof detail === 'string' ? detail : JSON.stringify(detail);
        setMessage(`Could not sign in (${status}): ${rendered}`);
        return;
      }
      if (status) {
        setMessage(`Could not sign in (${status}).`);
        return;
      }
      setMessage('Could not sign in right now.');
    }
  }

  return (
    <main className="card space-y-3">
      <section className="space-y-1">
        <h1 className="text-xl font-bold text-ink">{t('login_title')}</h1>
        <p className="text-sm text-ink/70">{t('login_subtitle')}</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-ink">{t('login_dev_modes')}</p>
        <p className="mt-1 text-xs text-ink/60">{t('login_dev_modes_desc')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn" type="button" onClick={() => navigate(`/${locale}/search`)}>
            {t('login_continue_anonymous')}
          </button>
          <button className="btn" type="button" onClick={() => void devLoginAs('user@example.com', `/${locale}/account`)}>
            {t('login_as_user')}
          </button>
          <button className="btn" type="button" onClick={() => void devLoginAs('admin@example.com', `/${locale}/admin/reviews`)}>
            {t('login_as_admin')}
          </button>
        </div>
      </section>

      <form onSubmit={requestLink} className="space-y-2">
        <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t('login_email_placeholder')} />
        <button className="btn" type="submit">{t('request_magic')}</button>
      </form>

      {message && <p className="text-sm">{message}</p>}
    </main>
  );
}
