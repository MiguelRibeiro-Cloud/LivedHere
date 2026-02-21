import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

const categoryFields = [
  'peopleNoise',
  'animalNoise',
  'insulation',
  'pestIssues',
  'areaSafety',
  'neighbourhoodVibe',
  'outdoorSpaces',
  'parking',
  'buildingMaintenance',
  'constructionQuality'
] as const;

export default async function BuildingPage({
  params
}: {
  params: Promise<{ locale: string; buildingId: string }>;
}) {
  const { locale, buildingId } = await params;
  const building = await prisma.building.findUnique({
    where: { id: buildingId },
    include: {
      street: {
        include: {
          area: {
            include: {
              city: {
                include: {
                  country: true
                }
              }
            }
          }
        }
      },
      reviews: {
        where: { status: 'APPROVED' },
        orderBy: { approvedAt: 'desc' }
      }
    }
  });

  if (!building) notFound();

  const averages: Record<string, number> = {};
  for (const category of categoryFields) {
    averages[category] =
      building.reviews.length > 0
        ? building.reviews.reduce((sum, review) => sum + review[category], 0) / building.reviews.length
        : 0;
  }

  const overall =
    building.reviews.length > 0
      ? building.reviews.reduce((sum, review) => sum + Number(review.overallScore), 0) / building.reviews.length
      : null;

  return (
    <div className="space-y-5">
      <section className="rounded-xl bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold">
          {building.street.name} {building.streetNumber}
        </h1>
        <p className="text-slate-600">
          {building.street.area.name}, {building.street.area.city.name}, {building.street.area.city.country.nameEn}
        </p>
        <p className="mt-2">Overall score: {overall ? overall.toFixed(1) : 'N/A'}</p>
        <Link href={`/${locale}/submit?buildingId=${building.id}`}>Submit a review</Link>
      </section>

      <section className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-3 text-xl font-semibold">Category averages</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {Object.entries(averages).map(([key, value]) => (
            <div key={key} className="rounded border border-slate-200 p-2 text-sm">
              <p className="font-medium">{key}</p>
              <p>{value.toFixed(1)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-3 text-xl font-semibold">Approved reviews</h2>
        <div className="space-y-3">
          {building.reviews.map((review) => (
            <div key={review.id} className="rounded border border-slate-200 p-3">
              <p className="text-sm">Score {Number(review.overallScoreRounded).toFixed(1)} · {review.authorBadge === 'VERIFIED_ACCOUNT' ? 'Verified Account' : 'Anonymous'}</p>
              {review.comment ? <p>{review.comment}</p> : null}
              <form action="/api/reviews/report" method="post" className="mt-2 flex gap-2">
                <input type="hidden" name="reviewId" value={review.id} />
                <select name="reason" required>
                  <option value="PII">PII</option>
                  <option value="Harassment">Harassment</option>
                  <option value="FalseInfo">False info</option>
                  <option value="Spam">Spam</option>
                  <option value="Other">Other</option>
                </select>
                <button type="submit">Report</button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
