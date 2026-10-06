import { apiRequest, resolveApiAssetUrl } from '@/services/api/client';
import type { DemoAddress, DemoOrder, DemoReview, Food } from '@/data/demo';

type ApiRecord = Record<string, unknown>;

export interface CartLine {
  id: number;
  foodId: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  food: Food;
}

export interface CustomerCart {
  restaurantId: number | null;
  subtotal: number;
  items: CartLine[];
}

export interface CustomerProfile {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
}

export interface CustomerVoucher {
  code: string;
  discount: number;
  minimum: number;
  usedCount: number;
  usageLimit: number;
  uniqueCustomerCount: number;
  usedByCustomer: boolean;
  expiry: string;
}

export interface CheckoutResult {
  orderId: number;
  orderCode: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
  voucherCode: string | null;
}

export type CheckoutQuote = Omit<CheckoutResult, 'orderId' | 'orderCode'>;

function record(value: unknown, entity: string): ApiRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Máy chủ trả về dữ liệu ${entity} không đúng cấu trúc.`);
  }
  return value as ApiRecord;
}

function array(value: unknown, entity: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Máy chủ trả về danh sách ${entity} không đúng cấu trúc.`);
  }
  return value;
}

function number(value: unknown, field: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Máy chủ trả về trường ${field} không hợp lệ.`);
  }
  return parsed;
}

function id(value: unknown, field: string): number {
  const parsed = number(value, field);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`Máy chủ trả về mã ${field} không hợp lệ.`);
  }
  return parsed;
}

function text(value: unknown, field: string, optional = false): string {
  if (optional && (value === null || value === undefined)) return '';
  if (typeof value !== 'string') {
    throw new Error(`Máy chủ trả về trường ${field} không hợp lệ.`);
  }
  return value;
}

function flag(value: unknown, field: string): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  throw new Error(`Máy chủ trả về trường ${field} không hợp lệ.`);
}

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : date.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
}

function mapCart(value: unknown): CustomerCart {
  const cart = record(value, 'giỏ hàng');
  const items = array(cart.items, 'món trong giỏ').map((rawItem) => {
    const item = record(rawItem, 'món trong giỏ');
    const foodId = id(item.food_id, 'food_id');
    const restaurantId = id(item.food_restaurant_id, 'food_restaurant_id');
    const foodName = text(item.food_name, 'food_name');
    const image = item.image === null || item.image === undefined
      ? ''
      : resolveApiAssetUrl(text(item.image, 'image'));
    const unitPrice = number(item.unit_price, 'unit_price');
    const quantity = id(item.quantity, 'quantity');
    return {
      id: id(item.cart_item_id, 'cart_item_id'),
      foodId,
      quantity,
      unitPrice,
      subtotal: number(item.subtotal, 'subtotal'),
      food: {
        id: foodId,
        restaurantId,
        name: foodName,
        description: '',
        category: '',
        restaurantName: '',
        price: unitPrice,
        image,
        available: text(item.food_status, 'food_status') === 'AVAILABLE',
      },
    };
  });
  return {
    restaurantId: cart.restaurant_id === null || cart.restaurant_id === undefined
      ? null
      : id(cart.restaurant_id, 'restaurant_id'),
    subtotal: number(cart.subtotal, 'subtotal'),
    items,
  };
}

function mapAddress(value: unknown): DemoAddress {
  const address = record(value, 'địa chỉ');
  return {
    id: String(id(address.address_id, 'address_id')),
    name: text(address.address_name, 'address_name'),
    receiver: text(address.receiver_name, 'receiver_name'),
    phone: text(address.receiver_phone, 'receiver_phone'),
    address: text(address.full_address, 'full_address'),
    note: text(address.note, 'note', true),
    isDefault: flag(address.is_default, 'is_default'),
    latitude: number(address.latitude, 'latitude'),
    longitude: number(address.longitude, 'longitude'),
  };
}

function mapOrder(value: unknown, reviewedOrderIds: Set<string> = new Set()): DemoOrder {
  const order = record(value, 'đơn hàng');
  const orderId = id(order.order_id, 'order_id');
  const items = order.items === undefined
    ? []
    : array(order.items, 'món trong đơn').map((rawItem) => {
        const item = record(rawItem, 'món trong đơn');
        return {
          foodId: id(item.food_id, 'food_id'),
          quantity: id(item.quantity, 'quantity'),
          unitPrice: number(item.unit_price, 'unit_price'),
          name: text(item.food_name, 'food_name'),
        };
      });
  const status = text(order.status, 'status');
  const delivery = order.delivery === null || order.delivery === undefined
    ? {}
    : record(order.delivery, 'giao hàng');
  const allowedStatuses = [
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'READY_FOR_PICKUP',
    'PICKED_UP',
    'DELIVERING',
    'COMPLETED',
    'CANCELLED',
    'REJECTED',
  ] as const;
  if (!allowedStatuses.includes(status as (typeof allowedStatuses)[number])) {
    throw new Error('Máy chủ trả về trạng thái đơn hàng không hợp lệ.');
  }
  return {
    id: String(orderId),
    code: text(order.order_code, 'order_code'),
    restaurantId: id(order.restaurant_id, 'restaurant_id'),
    restaurantName: text(order.restaurant_name, 'restaurant_name', true),
    status: status as DemoOrder['status'],
    createdAt: dateLabel(text(order.created_at, 'created_at')),
    total: number(order.total_amount, 'total_amount'),
    subtotal: number(order.subtotal, 'subtotal'),
    deliveryFee: number(order.delivery_fee, 'delivery_fee'),
    discount: number(order.discount, 'discount'),
    items,
    addressId: String(id(order.address_id, 'address_id')),
    addressName: text(order.address_name, 'address_name', true),
    receiver: text(order.receiver_name, 'receiver_name', true),
    phone: text(order.receiver_phone, 'receiver_phone', true),
    fullAddress: text(order.full_address, 'full_address', true),
    reviewed: reviewedOrderIds.has(String(orderId)),
    note: text(order.note, 'note', true),
    paymentMethod: text(
      record(order.payment ?? {}, 'thanh toán').method,
      'payment.method',
      true,
    ),
    deliveryStatus: text(delivery.status, 'delivery.status', true),
    pickupTime: text(delivery.pickup_time, 'delivery.pickup_time', true),
    deliveryTime: text(delivery.delivery_time, 'delivery.delivery_time', true),
    history: order.history === undefined
      ? []
      : array(order.history, 'lịch sử đơn hàng').map((rawEntry) => {
          const entry = record(rawEntry, 'lịch sử đơn hàng');
          return {
            status: text(entry.status, 'history.status'),
            changedAt: dateLabel(text(entry.changed_at, 'history.changed_at')),
            note: text(entry.note, 'history.note', true),
          };
        }),
  };
}

function mapReview(value: unknown): DemoReview {
  const review = record(value, 'đánh giá');
  const status = text(review.status, 'review.status');
  if (status !== 'PENDING' && status !== 'VISIBLE' && status !== 'HIDDEN') {
    throw new Error('Máy chủ trả về trạng thái đánh giá không hợp lệ.');
  }
  return {
    id: String(id(review.review_id, 'review_id')),
    orderId: String(id(review.order_id, 'order_id')),
    restaurantId: review.restaurant_id === undefined
      ? 0
      : id(review.restaurant_id, 'restaurant_id'),
    restaurantName: text(review.restaurant_name, 'restaurant_name', true),
    rating: id(review.rating, 'rating'),
    comment: text(review.comment, 'comment', true),
    createdAt: dateLabel(text(review.created_at, 'created_at')),
    status: status === 'PENDING' ? 'VISIBLE' : status,
  };
}

function mapVoucher(value: unknown): CustomerVoucher {
  const voucher = record(value, 'voucher');
  return {
    code: text(voucher.code, 'voucher.code'),
    discount: number(voucher.discount_value, 'discount_value'),
    minimum: number(voucher.min_order_value, 'min_order_value'),
    usedCount: number(voucher.used_count, 'used_count'),
    usageLimit: number(voucher.usage_limit, 'usage_limit'),
    uniqueCustomerCount: number(voucher.unique_customer_count, 'unique_customer_count'),
    usedByCustomer: flag(voucher.used_by_customer, 'used_by_customer'),
    expiry: dateLabel(text(voucher.end_date, 'end_date')),
  };
}

export async function getCart(token: string): Promise<CustomerCart> {
  return mapCart(await apiRequest('/carts', { token }));
}

export async function addCartItem(token: string, foodId: number, quantity: number): Promise<CustomerCart> {
  return mapCart(await apiRequest('/cart_items', {
    method: 'POST',
    token,
    body: { food_id: foodId, quantity },
  }));
}

export async function updateCartItem(token: string, itemId: number, quantity: number): Promise<CustomerCart> {
  return mapCart(await apiRequest(`/cart_items/${itemId}`, {
    method: 'PATCH',
    token,
    body: { quantity },
  }));
}

export async function deleteCartItem(token: string, itemId: number): Promise<CustomerCart> {
  return mapCart(await apiRequest(`/cart_items/${itemId}`, { method: 'DELETE', token }));
}

export async function clearCart(token: string): Promise<CustomerCart> {
  const data = await apiRequest<unknown>('/carts', { method: 'DELETE', token });
  return data === null ? { restaurantId: null, subtotal: 0, items: [] } : mapCart(data);
}

export async function listAddresses(token: string): Promise<DemoAddress[]> {
  return array(await apiRequest('/addresses', { token }), 'địa chỉ').map(mapAddress);
}

export interface AddressInput {
  address_name: string;
  receiver_name: string;
  receiver_phone: string;
  full_address: string;
  latitude: number;
  longitude: number;
  note?: string;
  is_default: boolean;
}

export async function saveAddress(
  token: string,
  input: AddressInput,
  addressId?: number,
): Promise<DemoAddress> {
  const data = await apiRequest(
    addressId ? `/addresses/${addressId}` : '/addresses',
    { method: addressId ? 'PUT' : 'POST', token, body: input },
  );
  return mapAddress(data);
}

export async function deleteAddress(token: string, addressId: number): Promise<void> {
  await apiRequest(`/addresses/${addressId}`, { method: 'DELETE', token });
}

export async function listOrders(
  token: string,
  reviewedOrderIds: Set<string>,
  status?: DemoOrder['status'],
): Promise<DemoOrder[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return array(await apiRequest(`/orders${query}`, { token }), 'đơn hàng')
    .map((order) => mapOrder(order, reviewedOrderIds));
}

export async function getOrder(
  token: string,
  orderId: number,
  reviewedOrderIds: Set<string>,
): Promise<DemoOrder> {
  return mapOrder(await apiRequest(`/orders/${orderId}`, { token }), reviewedOrderIds);
}

export async function checkout(
  token: string,
  input: { address_id: number; note?: string; voucher_code?: string },
): Promise<CheckoutResult> {
  const result = record(await apiRequest('/orders/checkout', {
    method: 'POST',
    token,
    body: input,
  }), 'kết quả đặt hàng');
  return {
    orderId: id(result.orderId, 'orderId'),
    orderCode: text(result.orderCode, 'orderCode'),
    subtotal: number(result.subtotal, 'subtotal'),
    deliveryFee: number(result.deliveryFee, 'deliveryFee'),
    discount: number(result.discount, 'discount'),
    totalAmount: number(result.totalAmount, 'totalAmount'),
    paymentMethod: text(result.paymentMethod, 'paymentMethod'),
    voucherCode: text(result.voucherCode, 'voucherCode', true) || null,
  };
}

export async function getCheckoutQuote(
  token: string,
  input: { address_id: number; voucher_code?: string },
): Promise<CheckoutQuote> {
  const result = record(await apiRequest('/orders/quote', {
    method: 'POST',
    token,
    body: input,
  }), 'báo giá đơn hàng');
  return {
    subtotal: number(result.subtotal, 'subtotal'),
    deliveryFee: number(result.deliveryFee, 'deliveryFee'),
    discount: number(result.discount, 'discount'),
    totalAmount: number(result.totalAmount, 'totalAmount'),
    paymentMethod: text(result.paymentMethod, 'paymentMethod'),
    voucherCode: text(result.voucherCode, 'voucherCode', true) || null,
  };
}

export async function cancelOrder(token: string, orderId: number): Promise<void> {
  await apiRequest(`/orders/${orderId}/cancel`, { method: 'POST', token, body: {} });
}

export async function listVouchers(token: string): Promise<CustomerVoucher[]> {
  return array(await apiRequest('/vouchers/available', { token }), 'voucher').map(mapVoucher);
}

export async function listReviews(token: string): Promise<DemoReview[]> {
  return array(await apiRequest('/reviews/mine', { token }), 'đánh giá').map(mapReview);
}

export async function createReview(
  token: string,
  orderId: number,
  rating: number,
  comment: string,
): Promise<void> {
  await apiRequest('/reviews', {
    method: 'POST',
    token,
    body: { order_id: orderId, rating, comment },
  });
}

export async function getProfile(token: string): Promise<CustomerProfile> {
  const user = record(await apiRequest('/auth/me', { token }), 'hồ sơ');
  const customer = record(user.customer, 'hồ sơ khách hàng');
  return {
    fullName: text(customer.fullName, 'customer.fullName'),
    email: text(user.email, 'email'),
    phone: text(customer.phone, 'customer.phone', true),
    dateOfBirth: text(customer.dateOfBirth, 'customer.dateOfBirth', true),
  };
}

export async function updateProfile(
  token: string,
  profile: CustomerProfile,
): Promise<CustomerProfile> {
  await apiRequest('/auth/me', {
    method: 'PATCH',
    token,
    body: {
      email: profile.email,
      fullName: profile.fullName,
      phone: profile.phone,
      dateOfBirth: profile.dateOfBirth || null,
    },
  });
  return getProfile(token);
}

export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiRequest('/auth/change-password', {
    method: 'POST',
    token,
    body: { currentPassword, newPassword },
    allowMessageOnlySuccess: true,
  });
}

export async function logout(token: string): Promise<void> {
  await apiRequest('/auth/logout', {
    method: 'POST',
    token,
    allowMessageOnlySuccess: true,
  });
}

export function mapOrderResponse(value: unknown, reviewedOrderIds: Set<string> = new Set()): DemoOrder {
  return mapOrder(value, reviewedOrderIds);
}
