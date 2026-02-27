import { useTranslation } from 'react-i18next';

export function AboutPage() {
  const { t } = useTranslation();

  return (
    <main className="space-y-6">
      <section className="card">
        <h1 className="text-2xl font-bold text-ink">{t('about_title')}</h1>
      </section>

      <section className="card space-y-5">
        <div>
          <h2 className="text-lg font-bold text-ink">{t('about_mission_title')}</h2>
          <p className="mt-2 text-ink/80 leading-relaxed">{t('about_mission')}</p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-ink">{t('about_how_title')}</h2>
          <p className="mt-2 text-ink/80 leading-relaxed">{t('about_how')}</p>
        </div>
      </section>

      <section className="card">
        <h2 className="text-lg font-bold text-ink">{t('about_values_title')}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-sm font-semibold text-primary">🔒</p>
            <p className="mt-1 text-sm text-ink/80 leading-relaxed">{t('about_value_privacy')}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-sm font-semibold text-primary">✓</p>
            <p className="mt-1 text-sm text-ink/80 leading-relaxed">{t('about_value_trust')}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-sm font-semibold text-primary">🌍</p>
            <p className="mt-1 text-sm text-ink/80 leading-relaxed">{t('about_value_access')}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-sm font-semibold text-primary">🇵🇹 🇬🇧</p>
            <p className="mt-1 text-sm text-ink/80 leading-relaxed">{t('about_value_bilingual')}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
