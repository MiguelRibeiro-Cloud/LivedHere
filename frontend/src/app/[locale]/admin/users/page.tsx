import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/security/auth';
import { prisma } from '@/lib/prisma';

export default async function AdminUsersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  try {
    await requireAdmin();
  } catch {
    redirect(`/${locale}/auth/login`);
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      _count: {
        select: { reviews: true }
      }
    }
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Users</h1>
      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className="rounded-xl bg-white p-4 shadow">
            <p className="font-medium">{user.email}</p>
            <p className="text-sm">Role: {user.role} · Reviews: {user._count.reviews}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
