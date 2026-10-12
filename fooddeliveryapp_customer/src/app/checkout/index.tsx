import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
import {
  getAvailableDeliverySlots,
  getCheckoutQuote,
  type AvailableDeliverySlots,
  type CheckoutQuote,
} from '@/services/api/customer';
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

function localDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatDateChoice(date: Date, offset: number): string {
  if (offset === 0) return 'Hôm nay';
  if (offset === 1) return 'Ngày mai';
  return date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function timePart(value: string): string {
  return value.split(' ')[1]?.slice(0, 5) ?? value;
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
  const [deliveryDate, setDeliveryDate] = useState(() => localDateKey(new Date()));
  const [slotsResponse, setSlotsResponse] = useState<{
    key: string;
    data: AvailableDeliverySlots;
  } | null>(null);
  const [slotsFailure, setSlotsFailure] = useState<{ key: string; message: string } | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [isSlotPickerOpen, setIsSlotPickerOpen] = useState(false);
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
  const slotsKey = JSON.stringify({
    addressId: selectedAddress?.id,
    date: deliveryDate,
    cart: cart.map(({ food }) => food.restaurantId),
  });
  const currentSlots = slotsResponse?.key === slotsKey ? slotsResponse.data : null;
  const currentSlotsError = slotsFailure?.key === slotsKey ? slotsFailure.message : '';
  const isSlotsLoading = Boolean(
    token && cart.length && selectedAddress && !currentSlots && !currentSlotsError,
  );
  const selectedSlot = currentSlots?.slots.find((slot) => slot.slotId === selectedSlotId) ?? null;
  const deliveryDates = useMemo(() => Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return { value: localDateKey(date), label: formatDateChoice(date, offset) };
  }), []);
  const isRouteLoading = Boolean(
    token && restaurantId && selectedAddress && !currentRoute && !currentRouteError,
  );
  const quoteKey = JSON.stringify({
    address: selectedAddress
      ? [selectedAddress.id, selectedAddress.latitude, selectedAddress.longitude]
      : null,
    cart: cart.map(({ food, quantity }) => [food.id, quantity, food.price]),
    voucher: selectedVoucherCode,
  });
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
    void getAvailableDeliverySlots(token, Number(selectedAddress.id), deliveryDate)
      .then((data) => {
        if (!active) return;
        setSlotsResponse({ key: slotsKey, data });
        setSlotsFailure(null);
        setSelectedSlotId(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setSlotsFailure({ key: slotsKey, message: getErrorMessage(error) });
        setSelectedSlotId(null);
      });
    return () => {
      active = false;
    };
  }, [cart, deliveryDate, selectedAddress, slotsKey, token]);

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
    if (!selectedSlot) {
      showNotice(
        'Chưa chọn được khung giờ',
        currentSlotsError || 'Vui lòng chọn một khung giờ giao còn khả dụng.',
      );
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
      const order = await placeOrder(
        selectedVoucherCode,
        orderNote.trim(),
        deliveryDate,
        selectedSlot.slotId,
      );
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

        <Surface style={styles.slotCard}>
          <Text style={styles.sectionLabel}>Chọn thời điểm nhận hàng</Text>
          <Text style={styles.muted}>
            Chỉ giao trong bán kính đường đi tối đa 10 km. Thời gian di chuyển được ước tính theo tốc độ shipper trung bình do hệ thống cấu hình.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateChoices}>
            {deliveryDates.map((choice) => (
              <Pressable
                key={choice.value}
                accessibilityRole="button"
                accessibilityState={{ selected: deliveryDate === choice.value }}
                onPress={() => {
                  setDeliveryDate(choice.value);
                  setSelectedSlotId(null);
                }}
                style={[
                  styles.dateChoice,
                  deliveryDate === choice.value ? styles.dateChoiceSelected : null,
                ]}
              >
                <Text style={[
                  styles.dateChoiceText,
                  deliveryDate === choice.value ? styles.selectedChoiceText : null,
                ]}>{choice.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {isSlotsLoading ? (
            <View style={styles.slotLoading}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.muted}>Đang kiểm tra khoảng cách, thời gian và công suất bếp…</Text>
            </View>
          ) : currentSlotsError ? (
            <Text style={styles.slotError}>{currentSlotsError}</Text>
          ) : currentSlots?.slots.length ? (
            <>
              <Text style={styles.muted}>
                Quãng đường {formatDistance(currentSlots.distanceMeters)} · Đi khoảng {currentSlots.travelMinutes} phút · Tốc độ {currentSlots.averageSpeedKmh} km/h
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Chọn khung giờ giao hàng"
                accessibilityState={{ expanded: isSlotPickerOpen }}
                onPress={() => setIsSlotPickerOpen(true)}
                style={styles.slotPicker}
              >
                <View style={styles.slotPickerCopy}>
                  <Text style={selectedSlot ? styles.slotPickerValue : styles.slotPickerPlaceholder}>
                    {selectedSlot
                      ? `${timePart(selectedSlot.start)} – ${timePart(selectedSlot.end)}`
                      : 'Chọn khung giờ giao'}
                  </Text>
                  {selectedSlot ? (
                    <Text style={styles.slotPickerMeta}>
                      Chuẩn bị {selectedSlot.prepMinutes} phút · nhận trong khung đã chọn
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.slotPickerChevron}>⌄</Text>
              </Pressable>
              <Modal
                visible={isSlotPickerOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setIsSlotPickerOpen(false)}
              >
                <View style={styles.slotModalBackdrop}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Đóng danh sách khung giờ"
                    style={StyleSheet.absoluteFill}
                    onPress={() => setIsSlotPickerOpen(false)}
                  />
                  <View style={styles.slotModal}>
                    <View style={styles.slotModalHeader}>
                      <View>
                        <Text style={styles.slotModalTitle}>Khung giờ giao</Text>
                        <Text style={styles.muted}>{currentSlots.slots.length} khung giờ còn khả dụng</Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Đóng"
                        onPress={() => setIsSlotPickerOpen(false)}
                        style={styles.slotModalClose}
                      >
                        <Text style={styles.slotModalCloseText}>×</Text>
                      </Pressable>
                    </View>
                    <ScrollView style={styles.slotOptions} showsVerticalScrollIndicator>
                      {currentSlots.slots.map((slot) => {
                        const isSelected = selectedSlotId === slot.slotId;
                        return (
                          <Pressable
                            key={slot.slotId}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            onPress={() => {
                              setSelectedSlotId(slot.slotId);
                              setIsSlotPickerOpen(false);
                            }}
                            style={[
                              styles.slotOption,
                              isSelected ? styles.slotOptionSelected : null,
                            ]}
                          >
                            <Text style={[
                              styles.slotOptionTime,
                              isSelected ? styles.slotOptionTextSelected : null,
                            ]}>
                              {timePart(slot.start)} – {timePart(slot.end)}
                            </Text>
                            <Text style={[
                              styles.slotOptionMeta,
                              isSelected ? styles.slotOptionTextSelected : null,
                            ]}>
                              Chuẩn bị {slot.prepMinutes} phút
                            </Text>
                            {isSelected ? <Text style={styles.slotOptionCheck}>✓</Text> : null}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>
              </Modal>
            </>
          ) : (
            <Text style={styles.muted}>Không còn khung giờ phù hợp trong ngày này. Hãy chọn ngày khác.</Text>
          )}
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
          disabled={isLoading || isSubmitting || isQuoteLoading || isSlotsLoading || !selectedSlot}
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
  slotCard: { gap: 11 },
  dateChoices: { gap: 8, paddingVertical: 2 },
  dateChoice: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  dateChoiceSelected: { borderColor: colors.accent, backgroundColor: colors.accent },
  dateChoiceText: { color: colors.ink, fontSize: 10, fontWeight: '700' },
  selectedChoiceText: { color: '#FFFFFF' },
  slotLoading: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 9 },
  slotError: { color: colors.rose, fontSize: 11, lineHeight: 16 },
  slotPicker: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  slotPickerCopy: { flex: 1, gap: 3 },
  slotPickerValue: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  slotPickerPlaceholder: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  slotPickerMeta: { color: colors.muted, fontSize: 9 },
  slotPickerChevron: { color: colors.accent, fontSize: 20, fontWeight: '800' },
  slotModalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20, 24, 22, 0.35)' },
  slotModal: { maxHeight: '78%', gap: 12, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: colors.surface },
  slotModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  slotModalTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  slotModalClose: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: colors.paper },
  slotModalCloseText: { color: colors.ink, fontSize: 24, lineHeight: 26 },
  slotOptions: { flexGrow: 0 },
  slotOption: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  slotOptionSelected: { borderRadius: 10, backgroundColor: colors.accent },
  slotOptionTime: { width: 110, color: colors.ink, fontSize: 12, fontWeight: '800' },
  slotOptionMeta: { flex: 1, color: colors.muted, fontSize: 10 },
  slotOptionTextSelected: { color: '#FFFFFF' },
  slotOptionCheck: { color: '#FFFFFF', fontWeight: '800' },
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
