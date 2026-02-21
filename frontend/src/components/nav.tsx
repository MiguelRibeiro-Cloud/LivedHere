import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getOptionalUser } from '@/lib/security/auth';

export async function Nav({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'nav' });
  const user = await getOptionalUser();

  return (
    <nav className="mx-auto flex w-full max-w-6xl items-center justify-between py-4">
      <Link href={`/${locale}`} className="font-semibold text-primary">
        LivedHere
      </Link>
      <div className="flex gap-4 text-sm">
        <Link href={`/${locale}`}>{t('home')}</Link>
        <Link href={`/${locale}/search`}>{t('search')}</Link>
        <Link href={`/${locale}/map`}>{t('map')}</Link>
        <Link href={`/${locale}/submit`}>{t('submit')}</Link>
        {user ? <Link href={`/${locale}/account`}>{t('account')}</Link> : <Link href={`/${locale}/auth/login`}>{t('login')}</Link>}
        {user?.role === 'ADMIN' ? <Link href={`/${locale}/admin`}>{t('admin')}</Link> : null}
      </div>
    </nav>
  );
}
