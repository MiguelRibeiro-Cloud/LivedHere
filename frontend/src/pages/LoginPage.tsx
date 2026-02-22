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
    setMessage(response.data.dev_link ? `Dev link: ${response.data.dev_link}` : 'Check your email.');
  }

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) return;
    api.get('/auth/callback', { params: { token } }).then(() => setMessage('Authenticated successfully.'));
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
        setMessage(`Could not sign in (${status}): ${detail}`);
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
      <form onSubmit={requestLink} className="space-y-2">
        <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t('email')} />
        <button className="btn" type="submit">{t('request_magic')}</button>
      </form>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-ink">Temporary shortcuts</p>
        <p className="mt-1 text-xs text-ink/60">These buttons use the magic link flow to sign you in instantly.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => void devLoginAs('admin@livedhere.test', `/${locale}/admin/reviews`)}
          >
            Login as admin → Reviews
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => void devLoginAs('user@livedhere.test', `/${locale}/account`)}
          >
            Login as user → Account
          </button>
        </div>
      </section>

      {message && <p className="text-sm">{message}</p>}
    </main>
  );
}
