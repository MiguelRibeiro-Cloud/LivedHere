import { useTranslation } from 'react-i18next';

export function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <main className="space-y-6">
      <section className="card">
        <h1 className="text-2xl font-bold text-ink">{t('privacy_title')}</h1>
        <p className="mt-3 text-ink/80 leading-relaxed">{t('privacy_intro')}</p>
      </section>

      <section className="card space-y-5">
        <div>
          <h2 className="text-lg font-bold text-ink">{t('privacy_what_we_collect_title')}</h2>
          <p className="mt-2 text-sm text-ink/80 leading-relaxed">{t('privacy_what_we_collect')}</p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-ink">{t('privacy_pii_title')}</h2>
          <p className="mt-2 text-sm text-ink/80 leading-relaxed">{t('privacy_pii')}</p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-ink">{t('privacy_moderation_title')}</h2>
          <p className="mt-2 text-sm text-ink/80 leading-relaxed">{t('privacy_moderation')}</p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-ink">{t('privacy_data_rights_title')}</h2>
          <p className="mt-2 text-sm text-ink/80 leading-relaxed">{t('privacy_data_rights')}</p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-ink">{t('privacy_contact_title')}</h2>
          <p className="mt-2 text-sm text-ink/80 leading-relaxed">{t('privacy_contact')}</p>
        </div>
      </section>
    </main>
  );
}
