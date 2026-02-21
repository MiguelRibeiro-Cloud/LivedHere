import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const buildings = await prisma.building.findMany({
    where: {
      lat: { not: null },
      lng: { not: null }
    },
    include: {
      street: true,
      reviews: {
        where: { status: 'APPROVED' }
      }
    }
  });

  const pins = buildings.map((building) => ({
    id: building.id,
    lat: Number(building.lat),
    lng: Number(building.lng),
    label: `${building.street.name} ${building.streetNumber}`,
    overall:
      building.reviews.length > 0
        ? building.reviews.reduce((sum, review) => sum + Number(review.overallScore), 0) /
          building.reviews.length
        : null
  }));

  return NextResponse.json({ pins });
}
