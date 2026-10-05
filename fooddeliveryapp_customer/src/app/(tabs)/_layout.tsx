import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { colors } from '@/theme';

function tabIcon(symbol: string) {
  const TabSymbol = ({ focused }: { focused: boolean }) => (
    <Text style={[styles.icon, focused ? styles.iconActive : null]}>{symbol}</Text>
  );
  TabSymbol.displayName = `TabIcon(${symbol})`;
  return TabSymbol;
}

export default function CustomerTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.subtle,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.bar,
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Khám phá', tabBarIcon: tabIcon('⌂') }} />
      <Tabs.Screen name="orders" options={{ title: 'Đơn hàng', tabBarIcon: tabIcon('▤') }} />
      <Tabs.Screen name="cart" options={{ title: 'Giỏ hàng', tabBarIcon: tabIcon('▣') }} />
      <Tabs.Screen name="account" options={{ title: 'Tài khoản', tabBarIcon: tabIcon('○') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 64,
    paddingTop: 5,
    paddingBottom: 6,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
  label: { marginTop: 1, fontSize: 10, fontWeight: '600' },
  icon: { color: colors.subtle, fontSize: 21, lineHeight: 23 },
  iconActive: { color: colors.accent, fontSize: 23 },
});
