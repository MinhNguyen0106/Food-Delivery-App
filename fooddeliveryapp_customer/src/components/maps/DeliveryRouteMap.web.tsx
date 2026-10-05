import { lazy, Suspense, useSyncExternalStore } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { MapCoordinate } from '@/services/maps/deliveryRoute';
import { colors } from '@/theme';

interface DeliveryRouteMapProps {
  coordinates: MapCoordinate[];
}

const DeliveryRouteWebMap = lazy(() => import('./DeliveryRouteWebMap'));
const subscribeToClient = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export default function DeliveryRouteMap({ coordinates }: DeliveryRouteMapProps) {
  const isClient = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot,
  );

  return (
    <View style={styles.container}>
      {isClient ? (
        <Suspense fallback={<LoadingMap />}>
          <DeliveryRouteWebMap coordinates={coordinates} />
        </Suspense>
      ) : (
        <LoadingMap />
      )}
    </View>
  );
}

function LoadingMap() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.loadingLabel}>Đang tải bản đồ tuyến đường…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  loading: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 15,
    backgroundColor: '#E8E9DF',
  },
  loadingLabel: { color: colors.muted, fontSize: 12 },
});
