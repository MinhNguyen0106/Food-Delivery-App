import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';

import type { DemoMapLocation } from '@/providers/PrototypeProvider';
import { reverseGeocode } from '@/services/maps/openstreetmap';
import { colors } from '@/theme';

interface OpenStreetMapPickerProps {
  initialLatitude: number;
  initialLongitude: number;
  initialHasSelection: boolean;
  onLocationChange: (location: DemoMapLocation) => void;
}

function createMapHtml(latitude: number, longitude: number): string {
  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; background: #e8e9df; }
    .leaflet-control-attribution { font-size: 9px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function () {
      var map = L.map('map', { zoomControl: true }).setView([${latitude}, ${longitude}], 13);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      var marker = null;
      function sendLocation(position) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'location',
          latitude: position.lat,
          longitude: position.lng
        }));
      }
      function updateMarker(lat, lng, zoom, notify) {
        var point = [lat, lng];
        map.setView(point, zoom || 16);
        if (!marker) {
          marker = L.marker(point, { draggable: true }).addTo(map);
          marker.on('dragend', function (event) {
            sendLocation(event.target.getLatLng());
          });
        } else {
          marker.setLatLng(point);
        }
        if (notify !== false) sendLocation(marker.getLatLng());
      }
      map.on('click', function (event) {
        updateMarker(event.latlng.lat, event.latlng.lng);
      });
      window.setDeliveryLocation = updateMarker;
    })();
  </script>
</body>
</html>`;
}

export default function OpenStreetMapPicker({
  initialLatitude,
  initialLongitude,
  initialHasSelection,
  onLocationChange,
}: OpenStreetMapPickerProps) {
  const webViewRef = useRef<WebView>(null);
  const geocodeRequest = useRef(0);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState('');
  const [source] = useState(() => createMapHtml(initialLatitude, initialLongitude));

  function centerOnLocation(latitude: number, longitude: number, reverseLookup: boolean) {
    webViewRef.current?.injectJavaScript(
      `window.setDeliveryLocation && window.setDeliveryLocation(${latitude}, ${longitude}, 16, ${reverseLookup}); true;`,
    );
  }

  useEffect(() => {
    if (!mapReady || !initialHasSelection) return;
    centerOnLocation(initialLatitude, initialLongitude, false);
  }, [initialLatitude, initialLongitude, initialHasSelection, mapReady]);

  async function selectCoordinate(latitude: number, longitude: number) {
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
  }

  function handleMapMessage(event: WebViewMessageEvent) {
    try {
      const message: unknown = JSON.parse(event.nativeEvent.data);
      if (typeof message !== 'object' || message === null) return;
      const data = message as { type?: unknown; latitude?: unknown; longitude?: unknown };
      if (
        data.type === 'location'
        && typeof data.latitude === 'number'
        && typeof data.longitude === 'number'
      ) {
        void selectCoordinate(data.latitude, data.longitude);
      }
    } catch {
      setError('Không thể đọc vị trí được chọn trên bản đồ.');
    }
  }

  async function locateCurrentPosition() {
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError('Bạn chưa cấp quyền vị trí. Hãy chọn điểm trực tiếp trên bản đồ.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = position.coords;
      centerOnLocation(latitude, longitude, true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Không thể lấy vị trí hiện tại. Hãy chọn điểm trực tiếp trên bản đồ.',
      );
    }
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: source }}
        originWhitelist={['https://www.openstreetmap.org']}
        javaScriptEnabled
        domStorageEnabled
        userAgent="FoodDeliveryAppCustomer/1.0"
        onLoadEnd={() => setMapReady(true)}
        onMessage={handleMapMessage}
        onError={() => setError('Không thể tải bản đồ. Kiểm tra kết nối Internet rồi thử lại.')}
        accessibilityLabel="Bản đồ OpenStreetMap, chạm để chọn vị trí giao hàng"
      />
      <Pressable onPress={() => { void locateCurrentPosition(); }} style={styles.locateButton}>
        <Text style={styles.locateLabel}>⌖  Vị trí của tôi</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 300, overflow: 'hidden', borderRadius: 18 },
  locateButton: { position: 'absolute', right: 12, top: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 13, backgroundColor: '#FFFFFF' },
  locateLabel: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  error: { position: 'absolute', right: 10, bottom: 10, left: 10, padding: 9, borderRadius: 10, backgroundColor: '#FFFFFF', color: colors.rose, fontSize: 10, lineHeight: 15 },
});
