import 'leaflet/dist/leaflet.css';
import './OpenStreetMapPicker.web.css';

import L from 'leaflet';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

import type { DemoMapLocation } from '@/providers/PrototypeProvider';
import { reverseGeocode } from '@/services/maps/openstreetmap';
import { colors } from '@/theme';

interface OpenStreetMapPickerProps {
  initialLatitude: number;
  initialLongitude: number;
  initialHasSelection: boolean;
  onLocationChange: (location: DemoMapLocation) => void;
}

function MapController({
  latitude,
  longitude,
  hasSelection,
}: {
  latitude: number;
  longitude: number;
  hasSelection: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (hasSelection) map.setView([latitude, longitude], 16);
  }, [hasSelection, latitude, longitude, map]);

  return null;
}

function MapTapHandler({ onSelect }: { onSelect: (latitude: number, longitude: number) => void }) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export default function OpenStreetMapPickerWebMap({
  initialLatitude,
  initialLongitude,
  initialHasSelection,
  onLocationChange,
}: OpenStreetMapPickerProps) {
  const geocodeRequest = useRef(0);
  const [error, setError] = useState('');
  const markerIcon = useMemo(
    () => L.divIcon({
      className: 'customer-osm-marker',
      html: '<span></span>',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    }),
    [],
  );

  const selectCoordinate = useCallback(async (latitude: number, longitude: number) => {
    const requestId = ++geocodeRequest.current;
    setError('');
    onLocationChange({ latitude, longitude, address: '' });
    try {
      const address = await reverseGeocode(latitude, longitude);
      if (requestId === geocodeRequest.current) {
        onLocationChange({ latitude, longitude, address });
      }
    } catch (cause) {
      if (requestId === geocodeRequest.current) {
        setError(cause instanceof Error ? cause.message : 'Không thể lấy địa chỉ từ OpenStreetMap.');
      }
    }
  }, [onLocationChange]);

  function locateCurrentPosition() {
    setError('');
    if (!navigator.geolocation) {
      setError('Trình duyệt không hỗ trợ định vị. Hãy chọn điểm trực tiếp trên bản đồ.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void selectCoordinate(position.coords.latitude, position.coords.longitude);
      },
      () => setError('Không thể lấy vị trí hiện tại. Kiểm tra quyền vị trí hoặc chọn điểm trên bản đồ.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div style={styles.container}>
      <MapContainer
        center={[initialLatitude, initialLongitude]}
        zoom={initialHasSelection ? 16 : 13}
        scrollWheelZoom
        style={styles.map}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapController
          latitude={initialLatitude}
          longitude={initialLongitude}
          hasSelection={initialHasSelection}
        />
        <MapTapHandler onSelect={(latitude, longitude) => {
          void selectCoordinate(latitude, longitude);
        }} />
        {initialHasSelection ? (
          <Marker
            position={[initialLatitude, initialLongitude]}
            icon={markerIcon}
            draggable
            eventHandlers={{
              dragend(event) {
                const { lat, lng } = event.target.getLatLng();
                void selectCoordinate(lat, lng);
              },
            }}
          />
        ) : null}
      </MapContainer>
      <button onClick={locateCurrentPosition} style={styles.locateButton} type="button">
        ⌖&nbsp; Vị trí của tôi
      </button>
      {error ? <div role="status" style={styles.error}>{error}</div> : null}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: 300,
    overflow: 'hidden',
    borderRadius: 18,
  },
  map: { position: 'absolute', inset: 0 },
  locateButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1000,
    padding: '10px 12px',
    border: 0,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    color: colors.ink,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 1px 6px rgba(0,0,0,0.16)',
  },
  error: {
    position: 'absolute',
    right: 10,
    bottom: 30,
    left: 10,
    zIndex: 1000,
    padding: 9,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    color: colors.rose,
    fontSize: 11,
    lineHeight: '16px',
  },
};
