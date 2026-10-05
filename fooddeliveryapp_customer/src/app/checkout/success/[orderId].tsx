import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton, Page, RequestState, Surface } from '@/components/ui';
import { formatCurrency, getOrderStatusLabel } from '@/data/demo';
import { usePrototype } from '@/providers/PrototypeProvider';
import { colors } from '@/theme';

export default function CheckoutSuccessScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { orders, refreshOrder } = usePrototype();
  const order = orders.find((item) => item.id === orderId);
  const [isFetching, setIsFetching] = useState(!order);
  const requestedOrderId = useRef('');
  useEffect(() => {
    if (!orderId || order || requestedOrderId.current === orderId) return;
    requestedOrderId.current = orderId;
    void refreshOrder(orderId).finally(() => setIsFetching(false));
  }, [order, orderId, refreshOrder]);

  if (!order) {
    return (
      <Page>
        <RequestState
          loading={isFetching}
          message={isFetching ? 'Đang xác nhận đơn hàng...' : 'Không thể tải thông tin đơn hàng vừa đặt.'}
          onRetry={() => {
            if (!orderId) return;
            setIsFetching(true);
            void refreshOrder(orderId).finally(() => setIsFetching(false));
          }}
        />
      </Page>
    );
  }

  return (
    <Page contentStyle={styles.content}>
      <View style={styles.successMark}><Text style={styles.check}>✓</Text></View>
      <Text style={styles.eyebrow}>ĐÃ GỬI ĐẾN NHÀ HÀNG</Text>
      <Text style={styles.title}>Cảm ơn bạn{'\n'}đã đặt món.</Text>
      <Text style={styles.subtitle}>Nhà hàng sẽ sớm xác nhận đơn. Bạn có thể xem cập nhật tại mục Đơn hàng.</Text>
      <Surface style={styles.orderCard}>
        <View style={styles.orderRow}><Text style={styles.label}>Mã đơn</Text><Text style={styles.value}>{order.code}</Text></View>
        <View style={styles.orderRow}><Text style={styles.label}>Tiền món</Text><Text style={styles.value}>{formatCurrency(order.subtotal ?? order.total)}</Text></View>
        <View style={styles.orderRow}><Text style={styles.label}>Phí giao hàng</Text><Text style={styles.value}>{formatCurrency(order.deliveryFee ?? 0)}</Text></View>
        {(order.discount ?? 0) > 0 ? (
          <View style={styles.orderRow}>
            <Text style={styles.label}>Ưu đãi</Text>
            <Text style={styles.discount}>−{formatCurrency(order.discount ?? 0)}</Text>
          </View>
        ) : null}
        <View style={styles.orderRow}><Text style={styles.label}>Tổng thanh toán</Text><Text style={styles.total}>{formatCurrency(order.total)}</Text></View>
        <View style={styles.orderRow}><Text style={styles.label}>Thanh toán</Text><Text style={styles.value}>{order.paymentMethod === 'COD' ? 'Tiền mặt khi nhận' : order.paymentMethod || 'Chưa xác định'}</Text></View>
        <View style={styles.statusLine}><View style={styles.statusDot} /><Text style={styles.statusText}>{getOrderStatusLabel(order.status)}</Text></View>
      </Surface>
      <AppButton label="Theo dõi đơn hàng" onPress={() => router.replace({ pathname: '/orders/[orderId]', params: { orderId: orderId ?? '' } })} />
      <AppButton label="Tiếp tục khám phá" variant="quiet" onPress={() => router.replace('/home')} />
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', gap: 16 },
  successMark: { width: 70, height: 70, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', borderRadius: 26, backgroundColor: colors.accentSoft },
  check: { color: colors.accent, fontSize: 34, fontWeight: '600' },
  eyebrow: { color: colors.accent, fontSize: 9, letterSpacing: 1.3, textAlign: 'center', fontWeight: '800' },
  title: { color: colors.ink, fontSize: 32, lineHeight: 37, fontWeight: '700', textAlign: 'center', letterSpacing: -0.6 },
  subtitle: { maxWidth: 300, alignSelf: 'center', color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  orderCard: { gap: 13, marginVertical: 6 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { color: colors.muted, fontSize: 12 },
  value: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  total: { color: colors.accent, fontSize: 13, fontWeight: '800' },
  discount: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.amber },
  statusText: { color: colors.ink, fontSize: 12, fontWeight: '600' },
});
