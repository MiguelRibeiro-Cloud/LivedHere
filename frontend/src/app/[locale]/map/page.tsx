import { prisma } from '@/lib/prisma';
import { MapView } from '@/components/map-view';

export default async function MapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
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
        ? building.reviews.reduce((sum, review) => sum + Number(review.overallScore), 0) / building.reviews.length
        : null
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Map browse</h1>
      <div className="overflow-hidden rounded-xl bg-white p-2 shadow">
        <MapView pins={pins} locale={locale} />
      </div>
    </div>
  );
}
