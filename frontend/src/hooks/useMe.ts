import { useEffect, useState } from 'react';

import { api } from '../api/client';

export type Me = {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
};

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Me>('/me')
      .then((response) => setMe(response.data))
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  return { me, loading };
}
