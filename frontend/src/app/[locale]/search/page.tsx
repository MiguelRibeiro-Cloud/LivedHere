import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { searchSchema } from '@/lib/validation';
import { subYears } from '@/lib/time';

export default async function SearchPage({
  searchParams,
  params
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const raw = await searchParams;
  const parsed = searchSchema.parse({
    q: typeof raw.q === 'string' ? raw.q : '',
    minOverall: raw.minOverall,
    minPeopleNoise: raw.minPeopleNoise,
    minAnimalNoise: raw.minAnimalNoise,
    minInsulation: raw.minInsulation,
    minPestIssues: raw.minPestIssues,
    minAreaSafety: raw.minAreaSafety,
    minNeighbourhoodVibe: raw.minNeighbourhoodVibe,
    minOutdoorSpaces: raw.minOutdoorSpaces,
    minParking: raw.minParking,
    minBuildingMaintenance: raw.minBuildingMaintenance,
    minConstructionQuality: raw.minConstructionQuality,
    minReviews: raw.minReviews,
    verifiedOnly: raw.verifiedOnly === 'true',
    years: raw.years,
    sort: raw.sort
  });

  const recentDate = parsed.years ? subYears(new Date(), parsed.years) : null;

  const buildings = await prisma.building.findMany({
    where: {
      street: {
        OR: [
          { name: { contains: parsed.q, mode: 'insensitive' } },
          { area: { name: { contains: parsed.q, mode: 'insensitive' } } },
          { area: { city: { name: { contains: parsed.q, mode: 'insensitive' } } } }
        ]
      }
    },
    include: {
      street: {
        include: {
          area: {
            include: {
              city: true
            }
          }
        }
      },
      reviews: {
        where: {
          status: 'APPROVED',
          ...(parsed.minOverall ? { overallScore: { gte: parsed.minOverall } } : {}),
          ...(parsed.minPeopleNoise ? { peopleNoise: { gte: parsed.minPeopleNoise } } : {}),
          ...(parsed.minAnimalNoise ? { animalNoise: { gte: parsed.minAnimalNoise } } : {}),
          ...(parsed.minInsulation ? { insulation: { gte: parsed.minInsulation } } : {}),
          ...(parsed.minPestIssues ? { pestIssues: { gte: parsed.minPestIssues } } : {}),
          ...(parsed.minAreaSafety ? { areaSafety: { gte: parsed.minAreaSafety } } : {}),
          ...(parsed.minNeighbourhoodVibe
            ? { neighbourhoodVibe: { gte: parsed.minNeighbourhoodVibe } }
            : {}),
          ...(parsed.minOutdoorSpaces ? { outdoorSpaces: { gte: parsed.minOutdoorSpaces } } : {}),
          ...(parsed.minParking ? { parking: { gte: parsed.minParking } } : {}),
          ...(parsed.minBuildingMaintenance
            ? { buildingMaintenance: { gte: parsed.minBuildingMaintenance } }
            : {}),
          ...(parsed.minConstructionQuality
            ? { constructionQuality: { gte: parsed.minConstructionQuality } }
            : {}),
          ...(parsed.verifiedOnly ? { authorBadge: 'VERIFIED_ACCOUNT' } : {}),
          ...(recentDate ? { OR: [{ createdAt: { gte: recentDate } }, { livedToYear: { gte: recentDate.getFullYear() } }] } : {})
        },
        orderBy: { approvedAt: 'desc' }
      }
    }
  });

  type BuildingWithReviews = (typeof buildings)[number];

  const filtered: BuildingWithReviews[] = buildings.filter((building: BuildingWithReviews) => {
    if (parsed.minReviews && building.reviews.length < parsed.minReviews) return false;
    return true;
  });

  filtered.sort((a: BuildingWithReviews, b: BuildingWithReviews) => {
    const avgA = a.reviews.length
      ? a.reviews.reduce((sum: number, review: BuildingWithReviews['reviews'][number]) => sum + Number(review.overallScore), 0) /
        a.reviews.length
      : 0;
    const avgB = b.reviews.length
      ? b.reviews.reduce((sum: number, review: BuildingWithReviews['reviews'][number]) => sum + Number(review.overallScore), 0) /
        b.reviews.length
      : 0;

    if (parsed.sort === 'most_reviews') return b.reviews.length - a.reviews.length;
    if (parsed.sort === 'highest_overall') return avgB - avgA;

    const dateA = a.reviews[0]?.approvedAt ? new Date(a.reviews[0].approvedAt).getTime() : 0;
    const dateB = b.reviews[0]?.approvedAt ? new Date(b.reviews[0].approvedAt).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Search results</h1>
      <form className="grid gap-3 rounded-xl bg-white p-4 shadow md:grid-cols-6">
        <input name="q" defaultValue={parsed.q} placeholder="Query" className="md:col-span-2" />
        <input name="minOverall" type="number" min={1} max={5} step={0.1} placeholder="Min overall" />
        <input name="minAnimalNoise" type="number" min={1} max={5} step={1} placeholder="AnimalNoise ≥" />
        <input name="minPeopleNoise" type="number" min={1} max={5} step={1} placeholder="PeopleNoise ≥" />
        <input name="minReviews" type="number" min={1} placeholder="Min reviews" />
        <input name="years" type="number" min={1} max={20} placeholder="Last X years" />
        <select name="sort" defaultValue={parsed.sort}>
          <option value="most_recent">Most recent</option>
          <option value="most_reviews">Most reviews</option>
          <option value="highest_overall">Highest overall</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="verifiedOnly" defaultChecked={parsed.verifiedOnly} /> Verified only
        </label>
        <button type="submit" className="md:col-span-6">
          Apply filters
        </button>
      </form>

      <div className="space-y-3">
        {filtered.map((building: BuildingWithReviews) => {
          const avg =
            building.reviews.length > 0
              ? building.reviews.reduce((sum: number, review: BuildingWithReviews['reviews'][number]) => sum + Number(review.overallScore), 0) /
                building.reviews.length
              : null;

          return (
            <div key={building.id} className="rounded-xl bg-white p-4 shadow">
              <p className="font-semibold">
                {building.street.name} {building.streetNumber}, {building.street.area.name}, {building.street.area.city.name}
              </p>
              <p className="text-sm text-slate-600">
                {building.reviews.length} approved reviews • Overall {avg ? avg.toFixed(1) : 'N/A'}
              </p>
              <Link href={`/${locale}/places/${building.id}`}>Open building</Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
