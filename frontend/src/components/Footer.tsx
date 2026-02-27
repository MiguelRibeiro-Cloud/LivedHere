import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();
  const { locale = 'en' } = useParams();
  const base = `/${locale}`;

  return (
    <footer className="mt-12 border-t border-slate-200 pt-8 pb-10">
      <div className="mx-auto grid gap-6 sm:grid-cols-3">
        <div>
          <p className="text-sm font-bold text-primary">LivedHere</p>
          <p className="mt-1 text-xs text-ink/60 leading-relaxed">{t('footer_tagline')}</p>
          <p className="mt-1 text-xs text-ink/50">{t('footer_privacy')}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{t('map')}</p>
          <nav className="mt-2 flex flex-col gap-1">
            <Link to={`${base}/search`} className="text-sm text-ink/70 hover:text-ink">{t('search')}</Link>
            <Link to={`${base}/submit`} className="text-sm text-ink/70 hover:text-ink">{t('submit_review')}</Link>
            <Link to={`${base}/status`} className="text-sm text-ink/70 hover:text-ink">{t('review_status')}</Link>
          </nav>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{t('about')}</p>
          <nav className="mt-2 flex flex-col gap-1">
            <Link to={`${base}/about`} className="text-sm text-ink/70 hover:text-ink">{t('about')}</Link>
            <Link to={`${base}/privacy`} className="text-sm text-ink/70 hover:text-ink">{t('privacy_policy')}</Link>
          </nav>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-ink/40">
        © {new Date().getFullYear()} LivedHere · {t('footer_open_source')}
      </div>
    </footer>
  );
}
