import { useEffect, useState } from 'react';

import { api } from '../api/client';
import { MapView } from '../components/MapView';

type BuildingPin = {
  id: number;
  lat: number;
  lng: number;
  number?: number;
};

export function MapPage() {
  const [buildings, setBuildings] = useState<BuildingPin[]>([]);

  useEffect(() => {
    api.get<BuildingPin[]>('/map/buildings').then((response) => setBuildings(response.data));
  }, []);

  return (
    <main className="card">
      <MapView buildings={buildings} />
    </main>
  );
}
