import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  formatCurrency,
  getOrderStatusLabel,
  type DemoOrder,
  type Food,
  type Restaurant,
} from '@/data/demo';
import { colors } from '@/theme';
import { AppButton, FoodImage, Price, StatusPill, Surface } from '@/components/ui';

export function RestaurantCard({
  restaurant,
  showDistance = true,
}: {
  restaurant: Restaurant;
  showDistance?: boolean;
}) {
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/restaurants/[restaurantId]', params: { restaurantId: String(restaurant.id) } })
      }
      style={({ pressed }) => [styles.restaurantCard, pressed ? styles.pressed : null]}
    >
      <Image
        source={restaurant.image ? { uri: restaurant.image } : undefined}
        style={styles.restaurantImage}
      />
      <View style={styles.restaurantInfo}>
        <View style={styles.restaurantTitleRow}>
          <Text style={styles.restaurantName} numberOfLines={1}>{restaurant.name}</Text>
          {restaurant.rating > 0 ? (
            <Text style={styles.rating}>★ {restaurant.rating.toFixed(1)}</Text>
          ) : null}
        </View>
        {restaurant.cuisine ? (
          <Text style={styles.restaurantCuisine} numberOfLines={1}>{restaurant.cuisine}</Text>
        ) : null}
        <View style={styles.restaurantMeta}>
          {restaurant.deliveryMinutes ? (
            <Text style={styles.restaurantMetaText}>{restaurant.deliveryMinutes}</Text>
          ) : null}
          {restaurant.deliveryMinutes && showDistance && restaurant.distance ? (
            <Text style={styles.metaDot}>·</Text>
          ) : null}
          {showDistance && restaurant.distance ? (
            <Text style={styles.restaurantMetaText}>{restaurant.distance}</Text>
          ) : null}
          {!restaurant.open ? <Text style={styles.closedText}> · Đã đóng</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

export function FoodRow({
  food,
  onPress,
  trailing,
}: {
  food: Food;
  onPress?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress ?? (() => router.push({ pathname: '/foods/[foodId]', params: { foodId: String(food.id) } }))}
      style={({ pressed }) => [styles.foodRow, pressed ? styles.pressed : null]}
    >
      <FoodImage uri={food.image} style={styles.foodImage} />
      <View style={styles.foodCopy}>
        <Text style={styles.foodName} numberOfLines={2}>{food.name}</Text>
        <Text style={styles.foodDescription} numberOfLines={2}>{food.description}</Text>
        <View style={styles.foodBottom}>
          <Price amount={food.price} />
          {!food.available ? <StatusPill label="Tạm hết" tone="grey" /> : null}
        </View>
      </View>
      {trailing}
    </Pressable>
  );
}

export function QuantityControl({
  value,
  onChange,
  compact = false,
}: {
  value: number;
  onChange: (value: number) => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.quantityControl, compact ? styles.quantityCompact : null]}>
      <Pressable
        onPress={() => onChange(Math.max(0, value - 1))}
        accessibilityLabel="Giảm số lượng"
        style={[styles.quantityButton, compact ? styles.quantityButtonCompact : null]}
      >
        <Text style={styles.quantityGlyph}>−</Text>
      </Pressable>
      <Text style={styles.quantityValue}>{value}</Text>
      <Pressable
        onPress={() => onChange(value + 1)}
        accessibilityLabel="Tăng số lượng"
        style={[styles.quantityButton, compact ? styles.quantityButtonCompact : null]}
      >
        <Text style={styles.quantityGlyph}>+</Text>
      </Pressable>
    </View>
  );
}

export function OrderCard({ order }: { order: DemoOrder }) {
  const itemCount = order.items.reduce((count, item) => count + item.quantity, 0);
  const active = !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(order.status);
  const tone = active ? 'blue' : order.status === 'COMPLETED' ? 'green' : 'grey';

  return (
    <Surface style={styles.orderCard}>
      <View style={styles.orderCardHead}>
        <View style={styles.orderBrand}>
          <View style={styles.orderLogo}><Text style={styles.orderLogoText}>{(order.restaurantName || 'N').slice(0, 1)}</Text></View>
          <View style={styles.orderHeadCopy}>
            <Text style={styles.restaurantName}>{order.restaurantName || 'Nhà hàng'}</Text>
            <Text style={styles.restaurantMetaText}>{order.createdAt} · {order.code || `#${order.id}`}</Text>
          </View>
        </View>
        <StatusPill label={getOrderStatusLabel(order.status)} tone={tone} />
      </View>
      {order.items.length > 0 ? (
        <View style={styles.orderItemSummary}>
          <Text style={styles.restaurantMetaText} numberOfLines={1}>
            {order.items.map((item) => `${item.name ?? 'Món ăn'} × ${item.quantity}`).join(', ')}
          </Text>
        </View>
      ) : null}
      <View style={styles.orderFooter}>
        <Text style={styles.orderItemCount}>{itemCount > 0 ? `${itemCount} món` : 'Chi tiết đơn hàng'}</Text>
        <Text style={styles.orderAmount}>{formatCurrency(order.total)}</Text>
      </View>
      <AppButton
        label={active ? 'Theo dõi đơn hàng' : order.reviewed ? 'Xem chi tiết đơn' : 'Xem đơn hàng'}
        onPress={() => router.push({ pathname: '/orders/[orderId]', params: { orderId: order.id } })}
        variant="secondary"
        style={styles.orderButton}
      />
    </Surface>
  );
}

export function StepperLabel({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stepperLabel}>
      <Text style={styles.restaurantMetaText}>{label}</Text>
      <Text style={styles.stepperValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.84 },
  restaurantCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 17,
    backgroundColor: colors.surface,
  },
  restaurantImage: { width: '100%', height: 156, backgroundColor: '#E5E3DD' },
  restaurantInfo: { padding: 13, gap: 5 },
  restaurantTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  restaurantName: { flex: 1, color: colors.ink, fontSize: 15, fontWeight: '700' },
  rating: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  restaurantCuisine: { color: colors.muted, fontSize: 13 },
  restaurantMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  restaurantMetaText: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  metaDot: { marginHorizontal: 6, color: colors.subtle },
  closedText: { color: colors.rose, fontSize: 11 },
  foodRow: { minHeight: 116, flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  foodImage: { width: 88, height: 88, borderRadius: 13 },
  foodCopy: { flex: 1, gap: 4 },
  foodName: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  foodDescription: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  foodBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quantityCompact: { gap: 7 },
  quantityButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.accentSoft },
  quantityButtonCompact: { width: 27, height: 27, borderRadius: 9 },
  quantityGlyph: { color: colors.accent, fontSize: 20, lineHeight: 22, fontWeight: '600' },
  quantityValue: { minWidth: 18, color: colors.ink, fontSize: 14, textAlign: 'center', fontWeight: '700' },
  orderCard: { gap: 14 },
  orderCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  orderBrand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  orderLogo: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.accentSoft },
  orderLogoText: { color: colors.accent, fontSize: 17, fontWeight: '700' },
  orderHeadCopy: { flex: 1, gap: 3 },
  orderItemSummary: { paddingVertical: 11, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderItemCount: { color: colors.muted, fontSize: 13 },
  orderAmount: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  orderButton: { minHeight: 44, borderRadius: 12 },
  stepperLabel: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  stepperValue: { color: colors.ink, fontSize: 13, fontWeight: '600' },
});
