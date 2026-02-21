import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
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

export function MapView({ buildings }: { buildings: BuildingPin[] }) {
  return (
    <MapContainer center={[38.7223, -9.1393]} zoom={11} className="h-[500px] w-full rounded-2xl">
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
