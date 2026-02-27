import { FormEvent, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { locale = 'en' } = useParams();
  const [query, setQuery] = useState('');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/${locale}/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <main className="space-y-12">
      <section className="px-2 py-10 sm:py-14">
        <div className="mx-auto max-w-[1100px] text-center">
          <h1 className="text-balance text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            {t('hero_title')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg font-medium text-ink/80 sm:text-xl">
            {t('hero_subtitle')}
          </p>

          <form onSubmit={onSubmit} className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
            <input
              className="input h-12 text-base"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('hero_search_placeholder')}
              aria-label={t('search')}
            />
            <button className="btn h-12 px-6 text-base" type="submit">
              {t('hero_search_button')}
            </button>
          </form>

          <p className="mx-auto mt-4 max-w-2xl text-sm text-ink/70">
            {t('hero_trust_note')}
          </p>
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl font-bold text-ink">{t('how_it_works')}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sand text-sm font-bold text-primary">1</div>
            <p className="mt-3 font-semibold text-ink">{t('step1_title')}</p>
            <p className="mt-1 text-sm text-ink/70">{t('step1_desc')}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sand text-sm font-bold text-primary">2</div>
            <p className="mt-3 font-semibold text-ink">{t('step2_title')}</p>
            <p className="mt-1 text-sm text-ink/70">{t('step2_desc')}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sand text-sm font-bold text-primary">3</div>
            <p className="mt-3 font-semibold text-ink">{t('step3_title')}</p>
            <p className="mt-1 text-sm text-ink/70">{t('step3_desc')}</p>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl font-bold text-ink">{t('built_for_trust')}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="font-semibold text-ink">{t('trust_moderated')}</p>
            <p className="text-sm text-ink/70">{t('trust_moderated_desc')}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="font-semibold text-ink">{t('trust_privacy')}</p>
            <p className="text-sm text-ink/70">{t('trust_privacy_desc')}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="font-semibold text-ink">{t('trust_local')}</p>
            <p className="text-sm text-ink/70">{t('trust_local_desc')}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="font-semibold text-ink">{t('trust_community')}</p>
            <p className="text-sm text-ink/70">{t('trust_community_desc')}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
