import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import WebView from 'react-native-webview';

import type { MapCoordinate } from '@/services/maps/deliveryRoute';

interface DeliveryRouteMapProps {
  coordinates: MapCoordinate[];
}

function createMapHtml(coordinates: MapCoordinate[]): string {
  const points = JSON.stringify(coordinates.map(({ latitude, longitude }) => [latitude, longitude]));
  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; background: #e8e9df; }
    .leaflet-control-attribution { font-size: 9px; }
    .route-marker { display: flex; width: 28px; height: 28px; align-items: center; justify-content: center; border: 3px solid white; border-radius: 50%; color: white; font: 700 11px sans-serif; box-shadow: 0 2px 7px #0005; }
    .restaurant-marker { background: #df7845; }
    .delivery-marker { background: #34845e; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function () {
      var points = ${points};
      var map = L.map('map', { zoomControl: false, scrollWheelZoom: false });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      var startIcon = L.divIcon({ className: '', html: '<span class="route-marker restaurant-marker">N</span>', iconSize: [28, 28], iconAnchor: [14, 14] });
      var endIcon = L.divIcon({ className: '', html: '<span class="route-marker delivery-marker">G</span>', iconSize: [28, 28], iconAnchor: [14, 14] });
      L.polyline(points, { color: '#34845e', weight: 5, opacity: 0.85 }).addTo(map);
      L.marker(points[0], { icon: startIcon }).addTo(map).bindTooltip('Nhà hàng');
      L.marker(points[points.length - 1], { icon: endIcon }).addTo(map).bindTooltip('Địa chỉ nhận hàng');
      map.fitBounds(points, { padding: [28, 28], maxZoom: 15 });
    })();
  </script>
</body>
</html>`;
}

export default function DeliveryRouteMap({ coordinates }: DeliveryRouteMapProps) {
  const source = useMemo(() => createMapHtml(coordinates), [coordinates]);
  return (
    <View style={styles.container}>
      <WebView
        source={{ html: source }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        userAgent="FoodDeliveryAppCustomer/1.0"
        accessibilityLabel="Bản đồ tuyến đường từ nhà hàng đến địa chỉ giao hàng"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 220, overflow: 'hidden', borderRadius: 15, backgroundColor: '#E8E9DF' },
});
