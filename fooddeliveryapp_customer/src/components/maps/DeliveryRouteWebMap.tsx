import 'leaflet/dist/leaflet.css';
import './DeliveryRouteMap.web.css';

import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';

import type { MapCoordinate } from '@/services/maps/deliveryRoute';

interface DeliveryRouteMapProps {
  coordinates: MapCoordinate[];
}

function FitRoute({ coordinates }: DeliveryRouteMapProps) {
  const map = useMap();
  const bounds = useMemo(
    () => L.latLngBounds(coordinates.map(({ latitude, longitude }) => [latitude, longitude])),
    [coordinates],
  );
  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
  }, [bounds, map]);
  return null;
}

function createMarkerIcon(className: string, label: string) {
  return L.divIcon({
    className: 'customer-delivery-route-icon',
    html: `<span class="${className}">${label}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export default function DeliveryRouteWebMap({ coordinates }: DeliveryRouteMapProps) {
  const positions = coordinates.map(({ latitude, longitude }) => [latitude, longitude] as [number, number]);
  const restaurantIcon = useMemo(() => createMarkerIcon('restaurant-marker', 'N'), []);
  const deliveryIcon = useMemo(() => createMarkerIcon('delivery-marker', 'G'), []);

  return (
    <div className="customer-delivery-route-map">
      <MapContainer
        bounds={positions}
        boundsOptions={{ padding: [24, 24], maxZoom: 15 }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <FitRoute coordinates={coordinates} />
        <Polyline positions={positions} pathOptions={{ color: '#34845e', weight: 5, opacity: 0.85 }} />
        <Marker position={positions[0]} icon={restaurantIcon} />
        <Marker position={positions[positions.length - 1]} icon={deliveryIcon} />
      </MapContainer>
    </div>
  );
}
