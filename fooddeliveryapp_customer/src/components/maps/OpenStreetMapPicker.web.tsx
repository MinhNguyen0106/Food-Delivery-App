import { lazy, Suspense, useSyncExternalStore } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { DemoMapLocation } from '@/providers/PrototypeProvider';
import { colors } from '@/theme';

const OpenStreetMapPickerWebMap = lazy(() => import('./OpenStreetMapPickerWebMap'));
const subscribeToClient = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

interface OpenStreetMapPickerProps {
  initialLatitude: number;
  initialLongitude: number;
  initialHasSelection: boolean;
  onLocationChange: (location: DemoMapLocation) => void;
}

export default function OpenStreetMapPicker({
  initialLatitude,
  initialLongitude,
  initialHasSelection,
  onLocationChange,
}: OpenStreetMapPickerProps) {
  const isClient = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot,
  );

  return (
    <View style={styles.container}>
      {isClient ? (
        <Suspense fallback={<LoadingMap />}>
          <OpenStreetMapPickerWebMap
            initialLatitude={initialLatitude}
            initialLongitude={initialLongitude}
            initialHasSelection={initialHasSelection}
            onLocationChange={onLocationChange}
          />
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
      <Text style={styles.loadingLabel}>Đang tải bản đồ…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 300 },
  loading: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 18,
    backgroundColor: '#E8E9DF',
  },
  loadingLabel: { color: colors.muted, fontSize: 12 },
});
