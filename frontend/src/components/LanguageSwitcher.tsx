import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const { locale = 'en' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  function switchTo(newLocale: string) {
    if (newLocale === locale) return;
    const newPath = location.pathname.replace(`/${locale}`, `/${newLocale}`) + location.search;
    void i18n.changeLanguage(newLocale);
    navigate(newPath, { replace: true });
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
      <button
        type="button"
        onClick={() => switchTo('en')}
        className={`rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
          locale === 'en' ? 'bg-primary text-white' : 'text-ink/60 hover:text-ink'
        }`}
        aria-label="English"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => switchTo('pt')}
        className={`rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
          locale === 'pt' ? 'bg-primary text-white' : 'text-ink/60 hover:text-ink'
        }`}
        aria-label="Português"
      >
        PT
      </button>
    </div>
  );
}
