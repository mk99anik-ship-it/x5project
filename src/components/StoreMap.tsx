import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from 'react-leaflet';
import { hoursBetween } from '../lib/time';
import type { HelpPoint, Store, SurplusItem } from '../types';
import 'leaflet/dist/leaflet.css';

interface Props {
  stores: Store[];
  points: HelpPoint[];
  items: SurplusItem[];
  now: Date;
  activeStoreId?: string;
  onStore: (storeId: string) => void;
}

export default function StoreMap({ stores, points, items, now, activeStoreId, onStore }: Props) {
  return (
    <MapContainer center={[55.751, 37.62]} zoom={11} scrollWheelZoom={false} className="leaflet-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">участники OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((point) => (
        <CircleMarker
          key={point.id}
          center={[point.lat, point.lng]}
          radius={7}
          pathOptions={{ color: '#23486e', fillColor: '#23486e', fillOpacity: 0.9, weight: 1 }}
        >
          <Tooltip>{point.name}</Tooltip>
          <Popup>
            <strong>{point.name}</strong>
            <br />
            {point.address}
          </Popup>
        </CircleMarker>
      ))}
      {stores.map((store) => {
        const available = items.filter((item) => item.storeId === store.id && item.status === 'доступно');
        const urgent = available.some((item) => {
          const hours = hoursBetween(now, new Date(item.expiresAt));
          return hours > 0 && hours <= 6;
        });
        const color = available.length === 0 ? '#8d8378' : urgent ? '#9d2218' : '#1d6b45';
        const active = store.id === activeStoreId;
        return (
          <CircleMarker
            key={store.id}
            center={[store.lat, store.lng]}
            radius={11 + Math.min(available.length, 8)}
            pathOptions={{
              color: active ? '#8f3d16' : color,
              fillColor: color,
              fillOpacity: 0.88,
              weight: active ? 4 : 2,
            }}
            eventHandlers={{ click: () => onStore(store.id) }}
          >
            <Tooltip>{store.name}</Tooltip>
            <Popup>
              <strong>{store.name}</strong>
              <br />
              {store.address}
              <br />
              Доступно: {available.length}
              <br />
              <button type="button" className="btn btn-small" onClick={() => onStore(store.id)}>
                Показать товары
              </button>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
