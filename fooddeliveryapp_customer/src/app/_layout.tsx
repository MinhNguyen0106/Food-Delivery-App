import { Redirect, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useNetworkState } from 'expo-network';
import { StyleSheet, Text, View } from 'react-native';

import {
  SessionLoadingScreen,
  SessionProvider,
  SessionRestoreError,
  useSession,
} from '@/providers/SessionProvider';
import { PrototypeProvider } from '@/providers/PrototypeProvider';
import { NoticeDialog } from '@/components/ui';

function RootNavigator() {
  const { token, isReady, error } = useSession();
  const networkState = useNetworkState();
  const pathname = usePathname();

  if (!isReady) {
    return <SessionLoadingScreen />;
  }

  if (error) {
    return <SessionRestoreError />;
  }

  const isAuthRoute = pathname === '/login' || pathname === '/register';

  if (!token && !isAuthRoute) {
    return <Redirect href="/login" />;
  }

  if (token && isAuthRoute) {
    return <Redirect href="/home" />;
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {networkState.isConnected === false || networkState.isInternetReachable === false ? (
        <View accessibilityRole="alert" style={styles.offlineBanner}>
          <Text style={styles.offlineTitle}>Đang ngoại tuyến</Text>
          <Text style={styles.offlineMessage}>
            Một số thông tin có thể chưa được cập nhật. Kiểm tra kết nối rồi thử tải lại.
          </Text>
        </View>
      ) : null}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFF9F5' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <NoticeDialog />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <PrototypeProvider>
        <RootNavigator />
      </PrototypeProvider>
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  offlineBanner: {
    gap: 3,
    paddingHorizontal: 18,
    paddingVertical: 9,
    backgroundColor: '#FFF0D5',
  },
  offlineTitle: { color: '#855200', fontSize: 11, fontWeight: '800' },
  offlineMessage: { color: '#855200', fontSize: 10, lineHeight: 14 },
});
