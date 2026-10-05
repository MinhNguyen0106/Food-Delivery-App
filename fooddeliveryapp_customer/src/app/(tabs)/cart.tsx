import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FoodRow, QuantityControl } from '@/components/commerce';
import { AppButton, BottomAction, Divider, Page, ScreenHeader, Surface, showConfirmation } from '@/components/ui';
import { formatCurrency } from '@/data/demo';
import { usePrototype } from '@/providers/PrototypeProvider';
import { colors } from '@/theme';

export default function CartScreen() {
  const { cart, cartSubtotal, updateCartQuantity, removeFromCart, clearCart, isLoading } = usePrototype();

  if (cart.length === 0 && isLoading) {
    return (
      <Page>
        <ScreenHeader title="Giỏ hàng" subtitle="Những món bạn đã chọn." />
        <View style={styles.empty}>
          <Text style={styles.emptyCopy}>Đang tải giỏ hàng...</Text>
        </View>
      </Page>
    );
  }

  if (cart.length === 0) {
    return (
      <Page contentStyle={styles.emptyPage}>
        <ScreenHeader title="Giỏ hàng" subtitle="Những món bạn đã chọn." />
        <View style={styles.empty}>
          <Text style={styles.emptyMark}>▣</Text>
          <Text style={styles.emptyTitle}>Giỏ hàng đang trống</Text>
          <Text style={styles.emptyCopy}>Chọn một món ngon để bắt đầu bữa ăn của bạn.</Text>
          <AppButton label="Khám phá nhà hàng" onPress={() => router.replace('/home')} style={styles.discoverButton} />
        </View>
      </Page>
    );
  }

  return (
    <>
      <Page contentStyle={styles.content}>
        <ScreenHeader
          title="Giỏ hàng"
          subtitle={`${cart.reduce((sum, entry) => sum + entry.quantity, 0)} món trong giỏ`}
          right={
            <Pressable
              onPress={() => showConfirmation('Xóa giỏ hàng?', 'Các món đã chọn sẽ bị xóa khỏi giỏ.', clearCart, 'Xóa giỏ')}
            >
              <Text style={styles.clearButton}>Xóa tất cả</Text>
            </Pressable>
          }
        />
        {cart[0] ? (
          <Surface style={styles.restaurantSurface}>
            <View style={styles.restaurantMonogram}><Text style={styles.monogramText}>•</Text></View>
            <View style={styles.restaurantCopy}>
              <Text style={styles.restaurantName}>Nhà hàng #{cart[0].food.restaurantId}</Text>
              <Text style={styles.restaurantSub}>Các món trong giỏ được xác nhận từ máy chủ</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Surface>
        ) : null}
        <View style={styles.itemList}>
          {cart.map(({ food, quantity }) => (
            <View key={food.id} style={styles.cartRow}>
              <FoodRow food={food} onPress={() => router.push({ pathname: '/foods/[foodId]', params: { foodId: String(food.id) } })} />
              <View style={styles.cartRowBottom}>
                <Pressable onPress={() => removeFromCart(food.id)}>
                  <Text style={styles.removeLabel}>Xóa món</Text>
                </Pressable>
                <QuantityControl
                  value={quantity}
                  compact
                  onChange={(value) => updateCartQuantity(food.id, value)}
                />
              </View>
            </View>
          ))}
        </View>
        <Surface style={styles.summary}>
          <Text style={styles.summaryTitle}>Tạm tính</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tiền món</Text>
            <Text style={styles.summaryValue}>{formatCurrency(cartSubtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Phí giao hàng</Text>
            <Text style={styles.summaryPending}>Tính ở bước xác nhận</Text>
          </View>
          <Divider />
          <Text style={styles.summaryNote}>Phí giao hàng và tổng thanh toán sẽ được xác nhận ở màn hình kế tiếp.</Text>
        </Surface>
      </Page>
      <BottomAction>
        <AppButton label="Chọn địa chỉ giao hàng" onPress={() => router.push('/checkout/address')} />
      </BottomAction>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: 17, paddingBottom: 15 },
  emptyPage: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, gap: 10 },
  emptyMark: { marginBottom: 7, color: colors.accent, fontSize: 42 },
  emptyTitle: { color: colors.ink, fontSize: 19, fontWeight: '700' },
  emptyCopy: { maxWidth: 260, color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  discoverButton: { marginTop: 10, paddingHorizontal: 24 },
  clearButton: { color: colors.rose, fontSize: 12, fontWeight: '700' },
  restaurantSurface: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  restaurantMonogram: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.accentSoft },
  monogramText: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  restaurantCopy: { flex: 1, gap: 3 },
  restaurantName: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  restaurantSub: { color: colors.muted, fontSize: 11 },
  chevron: { color: colors.muted, fontSize: 23 },
  itemList: { gap: 4 },
  cartRow: { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  cartRowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 9 },
  removeLabel: { color: colors.rose, fontSize: 12, fontWeight: '600' },
  summary: { gap: 12 },
  summaryTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  summaryLabel: { color: colors.muted, fontSize: 13 },
  summaryValue: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  summaryPending: { color: colors.muted, fontSize: 11, textAlign: 'right' },
  summaryNote: { color: colors.muted, fontSize: 11, lineHeight: 17 },
});
