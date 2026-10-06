import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { OrderCard } from '@/components/commerce';
import { ListPagination } from '@/components/ListPagination';
import { Chip, Page, ScreenHeader } from '@/components/ui';
import { getOrderStatusLabel, type DemoOrderStatus } from '@/data/demo';
import { usePrototype } from '@/providers/PrototypeProvider';
import { colors } from '@/theme';

const statuses: DemoOrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'DELIVERING',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
];

const ORDERS_PER_PAGE = 6;

export default function OrdersScreen() {
  const { orders, isLoading, refreshOrders } = usePrototype();
  const [filter, setFilter] = useState<'Tất cả' | DemoOrderStatus>('Tất cả');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageState, setPageState] = useState({ filter: 'Tất cả' as 'Tất cả' | DemoOrderStatus, page: 1 });
  const [loadedFilter, setLoadedFilter] = useState<'Tất cả' | DemoOrderStatus | null>(null);
  useEffect(() => {
    let active = true;
    void refreshOrders(filter === 'Tất cả' ? undefined : filter).finally(() => {
      if (active) setLoadedFilter(filter);
    });
    return () => {
      active = false;
    };
  }, [filter, refreshOrders]);
  const isLoadingFilter = loadedFilter !== filter;
  const filteredOrders = useMemo(
    () => orders.filter((order) => {
      return filter === 'Tất cả' || order.status === filter;
    }),
    [filter, orders],
  );
  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const page = Math.min(pageState.filter === filter ? pageState.page : 1, pageCount);
  const visibleOrders = filteredOrders.slice(
    (page - 1) * ORDERS_PER_PAGE,
    page * ORDERS_PER_PAGE,
  );

  async function refresh() {
    setIsRefreshing(true);
    try {
      await refreshOrders(filter === 'Tất cả' ? undefined : filter);
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <Page contentStyle={styles.content}>
      <ScreenHeader
        title="Đơn hàng"
        subtitle="Theo dõi và xem lại những lần đặt món."
        right={
          <Pressable
            onPress={() => void refresh()}
            disabled={isRefreshing}
            accessibilityRole="button"
            accessibilityLabel="Làm mới danh sách đơn hàng"
            style={styles.refresh}
          >
            {isRefreshing
              ? <ActivityIndicator size="small" color={colors.accent} />
              : <Text style={styles.refreshText}>Làm mới</Text>}
          </Pressable>
        }
      />
      {isLoading ? <Text style={styles.emptyCopy}>Đang tải đơn hàng...</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {(['Tất cả', ...statuses] as const).map((item) => (
          <Chip
            key={item}
            label={item === 'Tất cả' ? item : getOrderStatusLabel(item)}
            selected={filter === item}
            onPress={() => {
              setFilter(item);
              setPageState({ filter: item, page: 1 });
            }}
          />
        ))}
      </ScrollView>
      {filter !== 'Tất cả' ? (
        <Text style={styles.filterCaption}>Trạng thái: {getOrderStatusLabel(filter)}</Text>
      ) : null}
      {isLoadingFilter && !filteredOrders.length ? (
        <Text style={styles.emptyCopy}>Đang tải đơn hàng...</Text>
      ) : filteredOrders.length ? (
        <>
          {visibleOrders.map((order) => <OrderCard key={order.id} order={order} />)}
          <ListPagination
            page={page}
            pageSize={ORDERS_PER_PAGE}
            total={filteredOrders.length}
            onPageChange={(nextPage) => setPageState({ filter, page: nextPage })}
          />
        </>
      ) : !isLoading ? (
        <View style={styles.empty}>
          <Text style={styles.emptyMark}>▤</Text>
          <Text style={styles.emptyTitle}>Chưa có đơn hàng</Text>
          <Text style={styles.emptyCopy}>Khi bạn đặt món, thông tin đơn sẽ xuất hiện ở đây.</Text>
        </View>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  filters: { gap: 8 },
  refresh: { minWidth: 52, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  refreshText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  filterCaption: { color: colors.muted, fontSize: 11 },
  empty: { alignItems: 'center', paddingVertical: 56, gap: 9 },
  emptyMark: { color: colors.accent, fontSize: 38 },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  emptyCopy: { maxWidth: 280, color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
