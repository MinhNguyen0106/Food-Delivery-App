import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import DeliveryRouteMap from '@/components/maps/DeliveryRouteMap';
import { ListPagination } from '@/components/ListPagination';
import {
  AppButton,
  BottomAction,
  Divider,
  FoodImage,
  FormField,
  Page,
  ScreenHeader,
  Surface,
  showConfirmation,
  showNotice,
} from '@/components/ui';
import { formatCurrency } from '@/data/demo';
import { goBackOrReplace } from '@/navigation/back';
import { usePrototype } from '@/providers/PrototypeProvider';
import { useSession } from '@/providers/SessionProvider';
import { getErrorMessage } from '@/services/api/client';
import { getRestaurant } from '@/services/api/catalog';
import { getCheckoutQuote, type CheckoutQuote } from '@/services/api/customer';
import {
  getDrivingRoute,
  straightLineDistanceMeters,
  type MapCoordinate,
} from '@/services/maps/deliveryRoute';
import { colors } from '@/theme';

const CHECKOUT_ITEMS_PER_PAGE = 8;

interface QuoteResponse {
  key: string;
  quote: CheckoutQuote;
}

interface QuoteFailure {
  key: string;
  message: string;
}

interface DeliveryRouteState {
  key: string;
  distanceMeters: number;
  coordinates: MapCoordinate[];
  kind: 'road' | 'straight';
  message?: string;
}

interface DeliveryRouteFailure {
  key: string;
  message: string;
}

function formatDistance(distanceMeters: number): string {
  return distanceMeters < 1000
    ? `${Math.round(distanceMeters)} m`
    : `${(distanceMeters / 1000).toFixed(1)} km`;
}

export default function CheckoutScreen() {
  const {
    cart,
    cartSubtotal,
    addresses,
    selectedAddressId,
    selectedVoucherCode,
    vouchers,
    placeOrder,
    isLoading,
  } = usePrototype();
  const { token } = useSession();
  const [orderNote, setOrderNote] = useState('');
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId);
  const activeVoucher = vouchers.find((voucher) => voucher.code === selectedVoucherCode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quoteResponse, setQuoteResponse] = useState<QuoteResponse | null>(null);
  const [quoteFailure, setQuoteFailure] = useState<QuoteFailure | null>(null);
  const [quoteRetry, setQuoteRetry] = useState(0);
  const [routeResponse, setRouteResponse] = useState<DeliveryRouteState | null>(null);
  const [routeFailure, setRouteFailure] = useState<DeliveryRouteFailure | null>(null);
  const [cartPage, setCartPage] = useState(1);
  const cartPageCount = Math.max(1, Math.ceil(cart.length / CHECKOUT_ITEMS_PER_PAGE));
  const currentCartPage = Math.min(cartPage, cartPageCount);
  const visibleCart = cart.slice(
    (currentCartPage - 1) * CHECKOUT_ITEMS_PER_PAGE,
    currentCartPage * CHECKOUT_ITEMS_PER_PAGE,
  );
  const restaurantId = cart[0]?.food.restaurantId;
  const routeKey = JSON.stringify({
    restaurantId,
    addressId: selectedAddress?.id,
    address: selectedAddress
      ? [selectedAddress.latitude, selectedAddress.longitude]
      : null,
  });
  const currentRoute = routeResponse?.key === routeKey ? routeResponse : null;
  const currentRouteError = routeFailure?.key === routeKey ? routeFailure.message : '';
  const isRouteLoading = Boolean(
    token && restaurantId && selectedAddress && !currentRoute && !currentRouteError,
  );
  const quoteKey = useMemo(() => JSON.stringify({
    address: selectedAddress
      ? [selectedAddress.id, selectedAddress.latitude, selectedAddress.longitude]
      : null,
    cart: cart.map(({ food, quantity }) => [food.id, quantity, food.price]),
    voucher: selectedVoucherCode,
  }), [cart, selectedAddress, selectedVoucherCode]);
  const currentQuote = quoteResponse?.key === quoteKey ? quoteResponse.quote : null;
  const currentQuoteError = quoteFailure?.key === quoteKey ? quoteFailure.message : '';
  const hasQuoteInput = Boolean(token && cart.length && selectedAddress);
  const isQuoteLoading = hasQuoteInput && !currentQuote && !currentQuoteError;

  useEffect(() => {
    if (!token || !restaurantId || !selectedAddress) return undefined;
    let active = true;
    void Promise.resolve().then(async () => {
      let origin: MapCoordinate | null = null;
      try {
        const restaurant = await getRestaurant(token, restaurantId);
        if (!active) return;
        if (
          typeof restaurant.latitude !== 'number'
          || typeof restaurant.longitude !== 'number'
        ) {
          setRouteFailure({
            key: routeKey,
            message: 'Nhà hàng chưa có tọa độ để hiển thị tuyến đường.',
          });
          return;
        }
        origin = {
          latitude: restaurant.latitude,
          longitude: restaurant.longitude,
        };
        const destination = {
          latitude: selectedAddress.latitude,
          longitude: selectedAddress.longitude,
        };
        try {
          const route = await getDrivingRoute(origin, destination);
          if (!active) return;
          setRouteResponse({
            key: routeKey,
            distanceMeters: route.distanceMeters,
            coordinates: route.coordinates,
            kind: 'road',
          });
          setRouteFailure(null);
        } catch (cause) {
          if (!active) return;
          setRouteResponse({
            key: routeKey,
            distanceMeters: straightLineDistanceMeters(origin, destination),
            coordinates: [origin, destination],
            kind: 'straight',
            message: getErrorMessage(cause),
          });
          setRouteFailure(null);
        }
      } catch (cause) {
        if (active) setRouteFailure({ key: routeKey, message: getErrorMessage(cause) });
      }
    });
    return () => {
      active = false;
    };
  }, [restaurantId, routeKey, selectedAddress, token]);

  useEffect(() => {
    if (!token || !cart.length || !selectedAddress) return undefined;
    let active = true;
    const timer = setTimeout(() => {
      void getCheckoutQuote(token, {
        address_id: Number(selectedAddress.id),
        ...(selectedVoucherCode ? { voucher_code: selectedVoucherCode } : {}),
      }).then((quote) => {
        if (!active) return;
        setQuoteResponse({ key: quoteKey, quote });
        setQuoteFailure(null);
      }).catch((error: unknown) => {
        if (!active) return;
        setQuoteFailure({ key: quoteKey, message: getErrorMessage(error) });
      });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [cart, quoteKey, quoteRetry, selectedAddress, selectedVoucherCode, token]);

  async function submitOrder(continueWithoutQuote = false) {
    if (isLoading) return;
    if (!cart.length) {
      showNotice('Giỏ hàng đang trống', 'Hãy chọn món ăn trước khi tiếp tục.');
      router.replace('/home');
      return;
    }
    if (!selectedAddress) {
      showNotice('Chưa có địa chỉ giao hàng', 'Vui lòng thêm hoặc chọn địa chỉ nhận hàng.');
      router.push('/checkout/address');
      return;
    }
    if (isQuoteLoading) return;
    if (!currentQuote && !continueWithoutQuote) {
      showConfirmation(
        'Chưa lấy được báo giá',
        `${currentQuoteError || 'Máy chủ chưa trả về tổng tiền dự kiến.'} Bạn có thể thử lại hoặc tiếp tục để máy chủ tính và xác nhận tổng tiền khi đặt.`,
        () => { void submitOrder(true); },
        'Tiếp tục đặt',
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const order = await placeOrder(selectedVoucherCode, orderNote.trim());
      if (order) {
        router.replace({
          pathname: '/checkout/success/[orderId]',
          params: { orderId: String(order.orderId) },
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Page contentStyle={styles.content}>
        <ScreenHeader
          title="Xác nhận đơn"
          subtitle="Kiểm tra thông tin trước khi đặt."
          onBack={() => goBackOrReplace('/checkout/address')}
        />
        <Pressable onPress={() => router.push('/checkout/address')}>
          <Surface style={styles.addressCard}>
            <View style={styles.addressIcon}><Text style={styles.addressIconText}>GỬI</Text></View>
            <View style={styles.addressCopy}>
              <View style={styles.addressTitleRow}>
                <Text style={styles.sectionLabel}>Giao đến</Text>
                {selectedAddress?.isDefault ? <Text style={styles.defaultTag}>MẶC ĐỊNH</Text> : null}
              </View>
              {selectedAddress ? (
                <>
                  <Text style={styles.receiver}>{selectedAddress.receiver} · {selectedAddress.phone}</Text>
                  <Text style={styles.addressText}>{selectedAddress.address}</Text>
                </>
              ) : <Text style={styles.muted}>Chọn địa chỉ giao hàng</Text>}
            </View>
            <Text style={styles.chevron}>›</Text>
          </Surface>
        </Pressable>

        <Surface style={styles.orderCard}>
          <View style={styles.restaurantRow}>
            <View style={styles.restaurantMonogram}><Text style={styles.monogramText}>•</Text></View>
            <View style={styles.restaurantCopy}>
              <Text style={styles.restaurantName}>Nhà hàng #{cart[0]?.food.restaurantId}</Text>
              <Text style={styles.muted}>Món và giá được xác nhận từ máy chủ</Text>
            </View>
          </View>
          {currentRoute ? (
            <View style={styles.routeDetails}>
              <View style={styles.routeSummary}>
                <Text style={styles.routeDistance}>
                  {currentRoute.kind === 'road' ? 'Quãng đường giao' : 'Khoảng cách ước tính'}
                </Text>
                <Text style={styles.routeValue}>{formatDistance(currentRoute.distanceMeters)}</Text>
              </View>
              <DeliveryRouteMap coordinates={currentRoute.coordinates} />
              <View style={styles.routeLegend}>
                <Text style={styles.routeLegendText}>● Nhà hàng</Text>
                <Text style={[styles.routeLegendText, styles.destinationLegend]}>● Địa chỉ nhận hàng</Text>
              </View>
              {currentRoute.kind === 'straight' ? (
                <Text style={styles.routeNotice}>
                  Chưa lấy được tuyến đường thực tế ({currentRoute.message}). Đây là khoảng cách đường thẳng; phí giao hàng được máy chủ tính riêng.
                </Text>
              ) : (
                <Text style={styles.routeNotice}>
                  Tuyến đường tham khảo từ OpenStreetMap. Phí giao hàng cuối cùng do máy chủ xác nhận.
                </Text>
              )}
            </View>
          ) : isRouteLoading ? (
            <View style={styles.routeLoading}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.muted}>Đang tính tuyến đường đến địa chỉ đã chọn…</Text>
            </View>
          ) : currentRouteError ? (
            <Text style={styles.routeNotice}>{currentRouteError}</Text>
          ) : null}
          {visibleCart.map(({ food, quantity }) => (
            <View style={styles.foodRow} key={food.id}>
              <FoodImage uri={food.image} style={styles.foodImage} />
              <Text style={styles.foodName} numberOfLines={2}>{food.name} <Text style={styles.muted}>× {quantity}</Text></Text>
              <Text style={styles.foodPrice}>{formatCurrency(food.price * quantity)}</Text>
            </View>
          ))}
          <ListPagination
            page={currentCartPage}
            pageSize={CHECKOUT_ITEMS_PER_PAGE}
            total={cart.length}
            onPageChange={setCartPage}
          />
        </Surface>

        <Surface style={styles.voucherCard}>
          <View style={styles.voucherIcon}><Text style={styles.voucherIconText}>%</Text></View>
          <View style={styles.voucherCopy}>
            <Text style={styles.voucherTitle}>{selectedVoucherCode ? `Đã chọn ${selectedVoucherCode}` : 'Ưu đãi cho đơn này'}</Text>
            <Text style={styles.muted}>{activeVoucher ? `Giảm tối đa ${formatCurrency(activeVoucher.discount)} · đơn tối thiểu ${formatCurrency(activeVoucher.minimum)}` : 'Chọn mã ưu đãi khả dụng'}</Text>
          </View>
          <Pressable onPress={() => router.push('/vouchers')}><Text style={styles.chooseVoucher}>Chọn</Text></Pressable>
        </Surface>

        <Surface style={styles.paymentCard}>
          <Text style={styles.sectionLabel}>Phương thức thanh toán</Text>
          <View style={styles.codRow}>
            <View style={styles.codIcon}><Text style={styles.codIconText}>₫</Text></View>
            <View style={styles.codCopy}><Text style={styles.codTitle}>Tiền mặt khi nhận hàng</Text><Text style={styles.muted}>COD · Thanh toán trực tiếp cho shipper</Text></View>
            <View style={styles.radio}><View style={styles.radioDot} /></View>
          </View>
        </Surface>

        <FormField
          label="Ghi chú cho nhà hàng (không bắt buộc)"
          value={orderNote}
          onChangeText={setOrderNote}
          placeholder="Thêm lời nhắn về món ăn hoặc đơn hàng"
          multiline
          maxLength={255}
        />

        <Surface style={styles.summary}>
          <Text style={styles.sectionLabel}>Tóm tắt thanh toán</Text>
          <SummaryRow label="Tiền món" value={formatCurrency(cartSubtotal)} />
          <SummaryRow
            label="Phí giao hàng"
            value={currentQuote ? formatCurrency(currentQuote.deliveryFee) : isQuoteLoading ? 'Đang tính…' : 'Chưa có báo giá'}
          />
          {selectedVoucherCode ? (
            <>
              <SummaryRow label="Mã ưu đãi" value={selectedVoucherCode} tone="green" />
              {currentQuote
                ? <SummaryRow label="Giảm giá" value={`−${formatCurrency(currentQuote.discount)}`} tone="green" />
                : null}
            </>
          ) : null}
          <Divider />
          <SummaryRow
            label="Tổng thanh toán"
            value={currentQuote
              ? formatCurrency(currentQuote.totalAmount)
              : isQuoteLoading ? 'Đang tính…' : 'Chưa có báo giá'}
            strong
          />
          {currentQuoteError ? (
            <View style={styles.quoteErrorBox}>
              <Text style={styles.quoteError}>{currentQuoteError}</Text>
              <Pressable onPress={() => {
                setQuoteFailure(null);
                setQuoteRetry((attempt) => attempt + 1);
              }}>
                <Text style={styles.retryQuote}>Thử lấy báo giá lại</Text>
              </Pressable>
              <Text style={styles.demoNote}>Nếu tiếp tục khi chưa có báo giá, máy chủ vẫn xác nhận lại tổng tiền lúc đặt hàng.</Text>
            </View>
          ) : (
            <Text style={styles.demoNote}>Báo giá do máy chủ tính; giá và tình trạng món được kiểm tra lại khi đặt hàng.</Text>
          )}
        </Surface>
      </Page>
      <BottomAction>
        <AppButton
          label={isLoading ? 'Đang tải...' : isSubmitting ? 'Đang gửi đơn...' : 'Đặt hàng'}
          onPress={() => { void submitOrder(); }}
          disabled={isLoading || isSubmitting || isQuoteLoading}
        />
      </BottomAction>
    </>
  );
}

function SummaryRow({ label, value, strong = false, tone }: { label: string; value: string; strong?: boolean; tone?: 'green' }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, strong ? styles.strong : null]}>{label}</Text>
      <Text style={[styles.summaryValue, strong ? styles.strong : null, tone === 'green' ? styles.discount : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 13, paddingBottom: 12 },
  addressCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  addressIcon: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.accentSoft },
  addressIconText: { color: colors.accent, fontSize: 8, fontWeight: '800' },
  addressCopy: { flex: 1, gap: 6 },
  addressTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionLabel: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  defaultTag: { color: colors.accent, fontSize: 8, letterSpacing: 0.5, fontWeight: '800' },
  receiver: { color: colors.ink, fontSize: 11, fontWeight: '600' },
  addressText: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  muted: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  chevron: { color: colors.subtle, fontSize: 24 },
  orderCard: { gap: 13 },
  restaurantRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  restaurantMonogram: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.accentSoft },
  monogramText: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  restaurantCopy: { flex: 1, gap: 2 },
  restaurantName: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  foodRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  foodImage: { width: 43, height: 43, borderRadius: 11 },
  foodName: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: '600' },
  foodPrice: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  voucherCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  voucherIcon: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.amberSoft },
  voucherIconText: { color: colors.amber, fontSize: 16, fontWeight: '800' },
  voucherCopy: { flex: 1, gap: 3 },
  voucherTitle: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  chooseVoucher: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  paymentCard: { gap: 12 },
  codRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codIcon: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#F0F0EB' },
  codIconText: { color: colors.accent, fontSize: 17, fontWeight: '700' },
  codCopy: { flex: 1, gap: 3 },
  codTitle: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  radio: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.accent, borderRadius: 10 },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  routeDetails: { gap: 8 },
  routeSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routeDistance: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  routeValue: { color: colors.accent, fontSize: 14, fontWeight: '800' },
  routeLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  routeLegendText: { color: '#DF7845', fontSize: 10, fontWeight: '700' },
  destinationLegend: { color: colors.accent },
  routeNotice: { color: colors.muted, fontSize: 9, lineHeight: 14 },
  routeLoading: { minHeight: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  summary: { gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  summaryLabel: { color: colors.muted, fontSize: 11 },
  summaryValue: { color: colors.ink, fontSize: 11, fontWeight: '600' },
  strong: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  discount: { color: colors.accent },
  demoNote: { color: colors.subtle, fontSize: 9, lineHeight: 13 },
  quoteErrorBox: { gap: 8, padding: 11, borderRadius: 12, backgroundColor: colors.roseSoft },
  quoteError: { color: colors.rose, fontSize: 11, lineHeight: 16 },
  retryQuote: { alignSelf: 'flex-start', color: colors.accent, fontSize: 11, fontWeight: '700' },
});
