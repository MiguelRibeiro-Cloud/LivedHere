import { useTranslation } from 'react-i18next';

export function HomePage() {
  const { t } = useTranslation();

  return (
    <main className="space-y-4">
      <section className="card">
        <h1 className="mb-2 text-3xl font-bold text-primary">LivedHere</h1>
        <p className="text-lg font-medium">{t('slogan')}</p>
      </section>
      <section className="card">
        <p>{t('welcome')}</p>
      </section>
    </main>
  );
}
