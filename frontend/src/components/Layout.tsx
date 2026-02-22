import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { api } from '../api/client';
import { useMe } from '../hooks/useMe';

export function Layout() {
  const { t, i18n } = useTranslation();
  const { locale = 'en' } = useParams();
  const navigate = useNavigate();
  const { me, loading } = useMe();
  const [mobileOpen, setMobileOpen] = useState(false);

  const base = useMemo(() => `/${locale}`, [locale]);

  if (i18n.language !== locale) {
    void i18n.changeLanguage(locale);
  }

  useEffect(() => {
    setMobileOpen(false);
  }, [locale]);

  async function logout() {
    await api.post('/auth/logout');
    navigate(`${base}/auth/login`);
  }

  const navLinkClassName = 'text-sm font-medium text-ink/90 hover:text-ink';

  return (
    <div className="mx-auto min-h-screen max-w-[1100px] px-4 py-6">
      <header className="mb-6 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <Link to={base} className="text-lg font-bold tracking-tight text-primary">
            LivedHere
          </Link>

          <nav className="hidden items-center gap-5 md:flex">
            <Link className={navLinkClassName} to={`${base}/search`}>
              {t('search')}
            </Link>
            <Link className="btn text-sm" to={`${base}/submit`}>
              {t('submit_review')}
            </Link>

            {!loading && !me && (
              <Link className={navLinkClassName} to={`${base}/auth/login`}>
                {t('login')}
              </Link>
            )}

            {!loading && me && (
              <details className="relative">
                <summary className="cursor-pointer list-none text-sm font-semibold text-ink/90 hover:text-ink">
                  {t('my_reviews')}
                </summary>
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                  <Link className="block rounded-lg px-3 py-2 text-sm hover:bg-sand" to={`${base}/status`}>
                    {t('review_status')}
                  </Link>
                  <Link className="block rounded-lg px-3 py-2 text-sm hover:bg-sand" to={`${base}/account`}>
                    {t('account')}
                  </Link>
                  {me.role === 'ADMIN' && (
                    <Link className="block rounded-lg px-3 py-2 text-sm hover:bg-sand" to={`${base}/admin`}>
                      {t('admin')}
                    </Link>
                  )}
                  <button className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-sand" type="button" onClick={logout}>
                    {t('logout')}
                  </button>
                </div>
              </details>
            )}
          </nav>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink md:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            Menu
          </button>
        </div>

        {mobileOpen && (
          <nav id="mobile-nav" className="mt-3 grid gap-2 md:hidden">
            <Link className="rounded-lg px-3 py-2 text-sm font-medium text-ink/90 hover:bg-sand" to={`${base}/search`}>
              {t('search')}
            </Link>
            <Link className="btn w-full text-center text-sm" to={`${base}/submit`}>
              {t('submit_review')}
            </Link>

            {!loading && !me && (
              <Link className="rounded-lg px-3 py-2 text-sm font-medium text-ink/90 hover:bg-sand" to={`${base}/auth/login`}>
                {t('login')}
              </Link>
            )}

            {!loading && me && (
              <div className="rounded-xl border border-slate-200 bg-white p-2">
                <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ink/60">{t('my_reviews')}</p>
                <Link className="block rounded-lg px-3 py-2 text-sm hover:bg-sand" to={`${base}/status`}>
                  {t('review_status')}
                </Link>
                <Link className="block rounded-lg px-3 py-2 text-sm hover:bg-sand" to={`${base}/account`}>
                  {t('account')}
                </Link>
                {me.role === 'ADMIN' && (
                  <Link className="block rounded-lg px-3 py-2 text-sm hover:bg-sand" to={`${base}/admin`}>
                    {t('admin')}
                  </Link>
                )}
                <button className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-sand" type="button" onClick={logout}>
                  {t('logout')}
                </button>
              </div>
            )}
          </nav>
        )}
      </header>
      <Outlet />
    </div>
  );
}
