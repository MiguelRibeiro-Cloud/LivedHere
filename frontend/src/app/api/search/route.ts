import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { searchSchema } from '@/lib/validation';
import { subYears } from '@/lib/time';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = searchSchema.parse({
    q: searchParams.get('q') || '',
    minOverall: searchParams.get('minOverall') || undefined,
    minPeopleNoise: searchParams.get('minPeopleNoise') || undefined,
    minAnimalNoise: searchParams.get('minAnimalNoise') || undefined,
    minInsulation: searchParams.get('minInsulation') || undefined,
    minPestIssues: searchParams.get('minPestIssues') || undefined,
    minAreaSafety: searchParams.get('minAreaSafety') || undefined,
    minNeighbourhoodVibe: searchParams.get('minNeighbourhoodVibe') || undefined,
    minOutdoorSpaces: searchParams.get('minOutdoorSpaces') || undefined,
    minParking: searchParams.get('minParking') || undefined,
    minBuildingMaintenance: searchParams.get('minBuildingMaintenance') || undefined,
    minConstructionQuality: searchParams.get('minConstructionQuality') || undefined,
    minReviews: searchParams.get('minReviews') || undefined,
    verifiedOnly: searchParams.get('verifiedOnly') === 'true',
    years: searchParams.get('years') || undefined,
    sort: searchParams.get('sort') || 'most_recent'
  });

  const recentDate = parsed.years ? subYears(new Date(), parsed.years) : null;

  const buildings = await prisma.building.findMany({
    where: {
      OR: [
        {
          street: {
            name: { contains: parsed.q, mode: 'insensitive' }
          }
        },
        {
          street: {
            area: {
              name: { contains: parsed.q, mode: 'insensitive' }
            }
          }
        },
        {
          street: {
            area: {
              city: {
                name: { contains: parsed.q, mode: 'insensitive' }
              }
            }
          }
        },
        {
          streetNumber: Number.isFinite(Number(parsed.q)) ? Number(parsed.q) : undefined
        }
      ]
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

  const data = (buildings as BuildingWithReviews[])
    .filter((building: BuildingWithReviews) =>
      parsed.minReviews ? building.reviews.length >= parsed.minReviews : true
    )
    .map((building: BuildingWithReviews) => {
      const overall =
        building.reviews.length > 0
          ? building.reviews.reduce(
              (sum: number, review: BuildingWithReviews['reviews'][number]) =>
                sum + Number(review.overallScore),
              0
            ) /
            building.reviews.length
          : null;

      return {
        id: building.id,
        streetName: building.street.name,
        streetNumber: building.streetNumber,
        area: building.street.area.name,
        city: building.street.area.city.name,
        reviewCount: building.reviews.length,
        overall,
        latestApprovedAt: building.reviews[0]?.approvedAt || null
      };
    });

  data.sort((a, b) => {
    if (parsed.sort === 'most_reviews') return b.reviewCount - a.reviewCount;
    if (parsed.sort === 'highest_overall') return (b.overall || 0) - (a.overall || 0);
    return new Date(b.latestApprovedAt || 0).getTime() - new Date(a.latestApprovedAt || 0).getTime();
  });

  return NextResponse.json({ results: data });
}
