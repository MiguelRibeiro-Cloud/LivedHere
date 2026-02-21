import { prisma } from '@/lib/prisma';
import { ReviewForm } from '@/components/forms/review-form';
import { getOptionalUser } from '@/lib/security/auth';
import { hashToken } from '@/lib/utils';
import { env } from '@/lib/env';

export default async function SubmitPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const rawSearch = await searchParams;
  const trackingCode = typeof rawSearch.trackingCode === 'string' ? rawSearch.trackingCode : undefined;
  const editToken = typeof rawSearch.editToken === 'string' ? rawSearch.editToken : undefined;
  const user = await getOptionalUser();

  const buildings = await prisma.building.findMany({
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
    },
    take: 200,
    orderBy: { createdAt: 'desc' }
  });

  const options = buildings.map((building: (typeof buildings)[number]) => ({
    id: building.id,
    label: `${building.street.name} ${building.streetNumber}, ${building.street.area.name}, ${building.street.area.city.name}`
  }));

  let editReview:
    | {
        trackingCode: string;
        editToken?: string;
        buildingId: string;
        languageTag: string | null;
        livedFromYear: number;
        livedToYear: number | null;
        livedDurationMonths: number;
        peopleNoise: number;
        animalNoise: number;
        insulation: number;
        pestIssues: number;
        areaSafety: number;
        neighbourhoodVibe: number;
        outdoorSpaces: number;
        parking: number;
        buildingMaintenance: number;
        constructionQuality: number;
        comment: string | null;
      }
    | undefined;

  if (trackingCode) {
    const review = await prisma.review.findUnique({ where: { trackingCode } });
    if (review && review.status === 'CHANGES_REQUESTED') {
      const isLoggedAuthor = Boolean(user && review.authorUserId && user.id === review.authorUserId);
      const isAnonymousTokenValid =
        Boolean(!review.authorUserId && editToken && review.editTokenHash) &&
        hashToken(`${editToken}:${env.APP_SECRET}`) === review.editTokenHash &&
        Boolean(review.editTokenExpiresAt && review.editTokenExpiresAt > new Date());

      if (isLoggedAuthor || isAnonymousTokenValid) {
        editReview = {
          trackingCode: review.trackingCode,
          editToken: !review.authorUserId ? editToken : undefined,
          buildingId: review.buildingId,
          languageTag: review.languageTag,
          livedFromYear: review.livedFromYear,
          livedToYear: review.livedToYear,
          livedDurationMonths: review.livedDurationMonths,
          peopleNoise: review.peopleNoise,
          animalNoise: review.animalNoise,
          insulation: review.insulation,
          pestIssues: review.pestIssues,
          areaSafety: review.areaSafety,
          neighbourhoodVibe: review.neighbourhoodVibe,
          outdoorSpaces: review.outdoorSpaces,
          parking: review.parking,
          buildingMaintenance: review.buildingMaintenance,
          constructionQuality: review.constructionQuality,
          comment: review.comment
        };
      }
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Submit a review</h1>
      <ReviewForm locale={locale} buildings={options} editReview={editReview} />
    </div>
  );
}
