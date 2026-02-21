import { useEffect, useState } from 'react';

import { api } from '../api/client';

type Me = { id: string; email: string; role: string };

export function AdminUsersPage() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api.get<Me>('/me').then((response) => setMe(response.data));
  }, []);

  return (
    <main className="card space-y-2">
      <h1 className="text-xl font-semibold">Admin Users</h1>
      <p>This MVP exposes current authenticated user and admin privileges through role checks on backend routes.</p>
      <p>Current user: {me?.email ?? 'unknown'} ({me?.role ?? 'unknown'})</p>
    </main>
  );
}
