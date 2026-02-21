'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

type BuildingPin = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  overall: number | null;
};

export function MapView({ pins, locale }: { pins: BuildingPin[]; locale: string }) {
  return (
    <MapContainer center={[38.736946, -9.142685]} zoom={12} style={{ height: '70vh', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pins.map((pin) => (
        <Marker key={pin.id} position={[pin.lat, pin.lng]}>
          <Popup>
            <div className="space-y-1">
              <div className="font-semibold">{pin.label}</div>
              <div>Overall: {pin.overall ? pin.overall.toFixed(1) : 'N/A'}</div>
              <a href={`/${locale}/places/${pin.id}`}>Open</a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
