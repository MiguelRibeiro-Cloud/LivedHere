import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/security/auth';
import { prisma } from '@/lib/prisma';

export default async function AdminPlacesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  try {
    await requireAdmin();
  } catch {
    redirect(`/${locale}/auth/login`);
  }

  const [countries, cities, areas, streets, segments, buildings] = await Promise.all([
    prisma.country.count(),
    prisma.city.count(),
    prisma.area.count(),
    prisma.street.count(),
    prisma.streetSegment.count(),
    prisma.building.count()
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Places admin</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow">Countries: {countries}</div>
        <div className="rounded-xl bg-white p-4 shadow">Cities: {cities}</div>
        <div className="rounded-xl bg-white p-4 shadow">Areas: {areas}</div>
        <div className="rounded-xl bg-white p-4 shadow">Streets: {streets}</div>
        <div className="rounded-xl bg-white p-4 shadow">Segments: {segments}</div>
        <div className="rounded-xl bg-white p-4 shadow">Buildings: {buildings}</div>
      </div>
    </div>
  );
}
