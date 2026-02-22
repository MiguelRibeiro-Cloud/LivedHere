import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const icon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

type BuildingPin = {
  id: number;
  lat: number;
  lng: number;
  number?: number;
};

function AutoPan({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.6 });
  }, [center, zoom, map]);

  return null;
}

export function MapView({
  buildings,
  center = [38.7223, -9.1393],
  zoom = 11
}: {
  buildings: BuildingPin[];
  center?: [number, number];
  zoom?: number;
}) {
  return (
    <MapContainer center={center} zoom={zoom} className="h-[520px] w-full rounded-xl">
      <AutoPan center={center} zoom={zoom} />
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      {buildings.map((building) => (
        <Marker key={building.id} position={[building.lat, building.lng]} icon={icon}>
          <Popup>
            Building #{building.id} {building.number ? `· ${building.number}` : ''}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
