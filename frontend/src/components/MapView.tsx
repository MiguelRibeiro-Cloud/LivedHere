import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const icon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const pinIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'hue-rotate-[200deg] saturate-150 brightness-110'
});

export type BuildingPin = {
  id: number;
  lat: number;
  lng: number;
  number?: number;
};

function AutoPan({
  panTo,
  panZoom
}: {
  panTo: [number, number] | null;
  panZoom: number | null;
}) {
  const map = useMap();
  const lastKeyRef = useRef<string | null>(null);

  const key = useMemo(() => {
    if (!panTo) return null;
    return `${panTo[0].toFixed(6)},${panTo[1].toFixed(6)}@${panZoom ?? ''}`;
  }, [panTo, panZoom]);

  useEffect(() => {
    if (!panTo) return;
    if (key && lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    map.flyTo(panTo, panZoom ?? map.getZoom(), { duration: 0.6 });
  }, [panTo, panZoom, map, key]);

  return null;
}

function MapEvents({
  onCenterChange,
  onMapClick
}: {
  onCenterChange?: (center: [number, number], zoom: number) => void;
  onMapClick?: (latlng: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    moveend: (event) => {
      if (!onCenterChange) return;
      const center = event.target.getCenter();
      onCenterChange([center.lat, center.lng], event.target.getZoom());
    },
    click: (event) => {
      if (!onMapClick) return;
      onMapClick({ lat: event.latlng.lat, lng: event.latlng.lng });
    }
  });
  return null;
}

export function MapView({
  buildings,
  panTo = null,
  panZoom = null,
  onCenterChange,
  onSelectBuilding,
  onMapClick,
  clickedPoint,
  pinMode = false
}: {
  buildings: BuildingPin[];
  panTo?: [number, number] | null;
  panZoom?: number | null;
  onCenterChange?: (center: [number, number], zoom: number) => void;
  onSelectBuilding?: (id: number) => void;
  onMapClick?: (latlng: { lat: number; lng: number }) => void;
  clickedPoint?: { lat: number; lng: number; label?: string } | null;
  pinMode?: boolean;
}) {
  return (
    <MapContainer
      center={[38.7223, -9.1393]}
      zoom={11}
      className={`h-[520px] w-full rounded-xl${pinMode ? ' pin-mode' : ''}`}
    >
      <AutoPan panTo={panTo} panZoom={panZoom} />
      <MapEvents onCenterChange={onCenterChange} onMapClick={onMapClick} />
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />

      {/* Temporary pin from map click — no popup, info is in the sidebar */}
      {clickedPoint && (
        <Marker position={[clickedPoint.lat, clickedPoint.lng]} icon={pinIcon} />
      )}

      {buildings.map((building) => (
        <Marker
          key={building.id}
          position={[building.lat, building.lng]}
          icon={icon}
          eventHandlers={
            onSelectBuilding
              ? {
                  click: () => onSelectBuilding(building.id)
                }
              : undefined
          }
        />
      ))}
    </MapContainer>
  );
}
