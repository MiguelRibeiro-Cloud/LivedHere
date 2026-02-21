import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { getMessages } from 'next-intl/server';
import { locales } from '@/lib/i18n';
import { Nav } from '@/components/nav';
import type { ReactNode } from 'react';

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="min-h-screen px-4">
        <Nav locale={locale} />
        <main className="mx-auto w-full max-w-6xl pb-10">{children}</main>
      </div>
    </NextIntlClientProvider>
  );
}
