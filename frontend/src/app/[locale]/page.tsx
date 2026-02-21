import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });

  const recent = await prisma.review.findMany({
    where: { status: 'APPROVED' },
    orderBy: { approvedAt: 'desc' },
    take: 5,
    include: {
      building: {
        include: {
          street: {
            include: {
              area: {
                include: {
                  city: true
                }
              }
            }
          }
        }
      }
    }
  });

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-white p-8 shadow">
        <h1 className="mb-3 text-4xl font-semibold text-primary">LivedHere</h1>
        <p className="mb-6 text-lg">{t('tagline')}</p>
        <form action={`/${locale}/search`} className="flex flex-col gap-3 md:flex-row">
          <input name="q" className="flex-1" placeholder={t('searchPlaceholder')} />
          <button type="submit">{t('searchCta')}</button>
          <Link href={`/${locale}/map`} className="rounded-xl border border-primary px-4 py-2 text-center">
            {t('browseMap')}
          </Link>
        </form>
      </section>

      <section className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold">{t('recent')}</h2>
        <div className="space-y-3">
          {recent.map((review) => (
            <div key={review.id} className="rounded-xl border border-slate-200 p-3">
              <p className="text-sm text-slate-600">
                {review.building.street.name} {review.building.streetNumber}, {review.building.street.area.name}, {review.building.street.area.city.name}
              </p>
              <p className="font-medium">Overall: {Number(review.overallScoreRounded).toFixed(1)}</p>
              {review.comment ? <p className="text-sm">{review.comment}</p> : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
