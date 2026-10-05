import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import { AppButton, Divider, Page, RequestState, ScreenHeader, StatusPill, Surface, showConfirmation } from '@/components/ui';
import { formatCurrency, getOrderStatusLabel, type DemoOrder } from '@/data/demo';
import { goBackOrReplace } from '@/navigation/back';
import { usePrototype } from '@/providers/PrototypeProvider';
import { colors } from '@/theme';

const steps = [
  { status: 'PENDING', title: 'Đã đặt hàng', detail: 'Đơn đang chờ nhà hàng xác nhận.' },
  { status: 'CONFIRMED', title: 'Nhà hàng xác nhận', detail: 'Nhà hàng đã tiếp nhận yêu cầu.' },
  { status: 'PREPARING', title: 'Đang chuẩn bị', detail: 'Món ăn đang được chuẩn bị.' },
  { status: 'READY_FOR_PICKUP', title: 'Sẵn sàng giao', detail: 'Đơn đã sẵn sàng cho shipper.' },
  { status: 'PICKED_UP', title: 'Đã lấy món', detail: 'Shipper đã nhận món tại nhà hàng.' },
  { status: 'DELIVERING', title: 'Đang giao', detail: 'Đơn đang trên đường đến bạn.' },
  { status: 'COMPLETED', title: 'Đã hoàn thành', detail: 'Đơn hàng đã được giao thành công.' },
];

export default function OrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { orders, cancelOrder, refreshOrder, isLoading } = usePrototype();
  const order = orders.find((item) => item.id === orderId);
  const [isLoadingDetail, setIsLoadingDetail] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshFailed, setAutoRefreshFailed] = useState(false);
  const requestedOrderId = useRef('');
  useEffect(() => {
    if (!orderId || requestedOrderId.current === orderId) return;
    requestedOrderId.current = orderId;
    void refreshOrder(orderId).finally(() => setIsLoadingDetail(false));
  }, [orderId, refreshOrder]);
  const isPending = order?.status === 'PENDING';
  const isCompleted = order?.status === 'COMPLETED';
  const completedIndex = order ? steps.findIndex((step) => step.status === order.status) : -1;
  const isTerminal = order?.status === 'CANCELLED' || order?.status === 'REJECTED';
  const isActivelyTracked = Boolean(order && !isTerminal && !isCompleted);

  useFocusEffect(useCallback(() => {
    if (!orderId || !isActivelyTracked) return undefined;
    let active = true;
    let inFlight = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleNext = () => {
      if (active && AppState.currentState === 'active') {
        timer = setTimeout(() => { void refreshProgress(); }, 30_000);
      }
    };
    const refreshProgress = async () => {
      if (!active || inFlight || AppState.currentState !== 'active') return;
      inFlight = true;
      try {
        const refreshedOrder = await refreshOrder(orderId, { silent: true });
        if (active) setAutoRefreshFailed(!refreshedOrder);
      } finally {
        inFlight = false;
        scheduleNext();
      }
    };
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (timer) clearTimeout(timer);
        void refreshProgress();
      } else if (timer) {
        clearTimeout(timer);
      }
    });
    scheduleNext();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, [isActivelyTracked, orderId, refreshOrder]));

  const hasOrderDetail = Boolean(order?.fullAddress);
  if (!order || !hasOrderDetail) {
    if (isLoading || isLoadingDetail) {
      return <Page><RequestState loading message="Đang tải thông tin đơn hàng..." /></Page>;
    }
    return (
      <Page>
        <ScreenHeader title="Không tải được đơn" onBack={() => goBackOrReplace('/orders')} />
        <RequestState
          message="Không tìm thấy đơn hàng hoặc máy chủ chưa trả về đủ chi tiết."
          onRetry={() => {
            if (!orderId) return;
            setIsLoadingDetail(true);
            void refreshOrder(orderId).finally(() => setIsLoadingDetail(false));
          }}
        />
      </Page>
    );
  }

  return (
    <Page contentStyle={styles.content}>
      <ScreenHeader
        title="Chi tiết đơn hàng"
        subtitle={`Mã đơn ${order.code || `#${order.id}`}`}
        onBack={() => goBackOrReplace('/orders')}
      />
      <Surface style={styles.statusCard}>
        <View style={styles.statusCardTop}>
          <View style={styles.statusIndicator}><View style={styles.statusDot} /></View>
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>{getOrderStatusLabel(order.status)}</Text>
            <Text style={styles.statusDetail}>{isTerminal ? 'Trạng thái đơn đã kết thúc.' : 'Tiến độ được cập nhật từ hệ thống đơn hàng.'}</Text>
          </View>
          <StatusPill label={isCompleted ? 'HOÀN TẤT' : isTerminal ? 'ĐÃ ĐÓNG' : 'ĐANG XỬ LÝ'} tone={isCompleted ? 'green' : isTerminal ? 'grey' : 'blue'} />
        </View>
        {!isTerminal ? (
          <View style={styles.timeline}>
            {steps.map((step, index) => {
              const completed = index <= completedIndex;
              const current = index === completedIndex;
              return (
                <View key={step.status} style={styles.timelineRow}>
                  <View style={styles.timelineTrack}>
                    <View style={[styles.timelineDot, completed ? styles.timelineDotActive : null, current ? styles.timelineDotCurrent : null]} />
                    {index < steps.length - 1 ? <View style={[styles.timelineLine, index < completedIndex ? styles.timelineLineActive : null]} /> : null}
                  </View>
                  <View style={styles.timelineCopy}>
                    <Text style={[styles.timelineTitle, current ? styles.timelineTitleCurrent : null]}>{step.title}</Text>
                    <Text style={styles.timelineDetail}>{step.detail}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
        {order.history?.length ? (
          <View style={styles.history}>
            {order.history.map((entry, index) => (
              <Text key={`${entry.status}-${index}`} style={styles.historyItem}>
                {getOrderStatusLabel(entry.status as DemoOrder['status'])} · {entry.changedAt}
                {entry.note ? ` — ${entry.note}` : ''}
              </Text>
            ))}
          </View>
        ) : null}
        {order.deliveryStatus ? (
          <Text style={styles.demoNote}>
            Giao nhận: {order.deliveryStatus}
            {order.pickupTime ? ` · Nhận món ${order.pickupTime}` : ''}
            {order.deliveryTime ? ` · Giao lúc ${order.deliveryTime}` : ''}
          </Text>
        ) : null}
        <AppButton
          label={isRefreshing ? 'Đang cập nhật...' : 'Cập nhật tiến độ'}
          variant="quiet"
          disabled={isRefreshing}
          onPress={async () => {
            setIsRefreshing(true);
            try {
              await refreshOrder(order.id);
            } finally {
              setIsRefreshing(false);
            }
          }}
        />
        {autoRefreshFailed ? (
          <Text style={styles.refreshWarning}>
            Chưa thể đồng bộ trạng thái. Thông tin đang hiển thị có thể đã cũ; kiểm tra kết nối hoặc cập nhật lại thủ công.
          </Text>
        ) : isActivelyTracked ? (
          <Text style={styles.autoRefreshNote}>Tự động kiểm tra cập nhật mỗi 30 giây khi màn hình đang mở.</Text>
        ) : null}
      </Surface>

      <Surface style={styles.sectionCard}>
        <View style={styles.restaurantRow}>
          <View style={styles.monogram}><Text style={styles.monogramText}>{(order.restaurantName || 'N').slice(0, 1)}</Text></View>
          <View style={styles.restaurantCopy}><Text style={styles.restaurantName}>{order.restaurantName || `Nhà hàng #${order.restaurantId}`}</Text><Text style={styles.subText}>{order.createdAt}</Text></View>
        </View>
        <Divider />
        {order.items.length === 0 ? (
          <Text style={styles.subText}>Đơn hàng không có chi tiết món ăn trong dữ liệu máy chủ.</Text>
        ) : order.items.map((item) => {
          return (
            <View key={item.foodId} style={styles.foodRow}>
              <Text style={styles.foodName}>{item.name ?? `Món #${item.foodId}`} × {item.quantity}</Text>
              <Text style={styles.foodPrice}>{formatCurrency((item.unitPrice ?? 0) * item.quantity)}</Text>
            </View>
          );
        })}
      </Surface>

      <Surface style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Địa chỉ nhận hàng</Text>
        <Text style={styles.receiver}>{order.receiver} · {order.phone}</Text>
        <Text style={styles.subText}>{order.fullAddress}</Text>
      </Surface>
      {order.note ? (
        <Surface style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Ghi chú đơn hàng</Text>
          <Text style={styles.subText}>{order.note}</Text>
        </Surface>
      ) : null}

      <Surface style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Thanh toán</Text>
        <SummaryRow label="Tạm tính" value={formatCurrency(order.subtotal ?? 0)} />
        <SummaryRow label="Phí giao hàng" value={formatCurrency(order.deliveryFee ?? 0)} />
        {order.discount ? <SummaryRow label="Ưu đãi" value={`−${formatCurrency(order.discount)}`} /> : null}
        <Divider />
        <SummaryRow label="Tổng thanh toán" value={formatCurrency(order.total)} strong />
        <Text style={styles.subText}>{order.paymentMethod || 'COD'} · Tiền mặt khi nhận hàng</Text>
      </Surface>

      {isPending ? (
        <AppButton
          label="Hủy đơn hàng"
          variant="danger"
          onPress={() => showConfirmation('Hủy đơn này?', 'Chỉ đơn đang chờ nhà hàng xác nhận mới có thể hủy.', () => cancelOrder(order.id), 'Hủy đơn')}
        />
      ) : null}
      {isCompleted && !order.reviewed ? (
        <AppButton label="Viết đánh giá" onPress={() => router.push({ pathname: '/orders/[orderId]/review', params: { orderId: order.id } })} />
      ) : null}
    </Page>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.subText, strong ? styles.cardTitle : null]}>{label}</Text>
      <Text style={[styles.subText, strong ? styles.cardTitle : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 13 },
  notFound: { color: colors.muted, fontSize: 13 },
  history: { gap: 7, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line },
  historyItem: { color: colors.muted, fontSize: 10, lineHeight: 16 },
  statusCard: { gap: 13 },
  statusCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusIndicator: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.blueSoft },
  statusDot: { width: 10, height: 10, borderRadius: 6, backgroundColor: colors.blue },
  statusCopy: { flex: 1, gap: 3 },
  statusTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  statusDetail: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  timeline: { paddingTop: 4 },
  timelineRow: { minHeight: 53, flexDirection: 'row', gap: 11 },
  timelineTrack: { width: 17, alignItems: 'center' },
  timelineDot: { width: 11, height: 11, marginTop: 2, borderWidth: 1.5, borderColor: '#C9C9C0', borderRadius: 7, backgroundColor: colors.surface },
  timelineDotActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  timelineDotCurrent: { width: 14, height: 14, marginTop: 0, borderWidth: 3, borderColor: '#CAD9CF', backgroundColor: colors.accent },
  timelineLine: { flex: 1, width: 1, marginVertical: 3, backgroundColor: colors.line },
  timelineLineActive: { backgroundColor: colors.accent },
  timelineCopy: { flex: 1, gap: 3 },
  timelineTitle: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  timelineTitleCurrent: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  timelineDetail: { color: colors.subtle, fontSize: 9, lineHeight: 14 },
  demoNote: { color: colors.subtle, fontSize: 9, lineHeight: 13 },
  autoRefreshNote: { color: colors.subtle, fontSize: 9, lineHeight: 14, textAlign: 'center' },
  refreshWarning: { padding: 10, borderRadius: 10, backgroundColor: colors.amberSoft, color: colors.amber, fontSize: 10, lineHeight: 15 },
  sectionCard: { gap: 11 },
  restaurantRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  monogram: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.accentSoft },
  monogramText: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  restaurantCopy: { gap: 3 },
  restaurantName: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  subText: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  foodRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  foodImage: { width: 41, height: 41, borderRadius: 11 },
  foodName: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: '600' },
  foodPrice: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  cardTitle: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  receiver: { color: colors.ink, fontSize: 11, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
});
