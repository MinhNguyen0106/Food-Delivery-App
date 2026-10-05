import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import type { DemoAddress, DemoOrder, DemoOrderStatus, DemoReview } from '@/data/demo';
import {
  addCartItem as addCartItemRequest,
  cancelOrder as cancelOrderRequest,
  changePassword as changePasswordRequest,
  checkout as checkoutRequest,
  clearCart as clearCartRequest,
  createReview as createReviewRequest,
  deleteAddress as deleteAddressRequest,
  deleteCartItem,
  getCart,
  getOrder,
  getProfile,
  listAddresses,
  listOrders,
  listReviews,
  listVouchers,
  logout as logoutRequest,
  saveAddress as saveAddressRequest,
  updateCartItem,
  updateProfile as updateProfileRequest,
  type AddressInput,
  type CartLine,
  type CheckoutResult,
  type CustomerProfile,
  type CustomerVoucher,
} from '@/services/api/customer';
import { ApiError, getErrorMessage } from '@/services/api/client';
import { useSession } from '@/providers/SessionProvider';
import { showNotice } from '@/components/ui';

export interface DemoMapLocation {
  latitude: number;
  longitude: number;
  address: string;
}

interface PrototypeContextValue {
  cart: CartLine[];
  cartSubtotal: number;
  addresses: DemoAddress[];
  selectedAddressId: string | null;
  selectedVoucherCode: string;
  selectedMapLocation: DemoMapLocation | null;
  orders: DemoOrder[];
  reviews: DemoReview[];
  vouchers: CustomerVoucher[];
  profile: CustomerProfile;
  isLoading: boolean;
  addToCart: (foodId: number, quantity: number, replace?: boolean) => Promise<boolean>;
  updateCartQuantity: (foodId: number, quantity: number) => Promise<boolean>;
  removeFromCart: (foodId: number) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  saveAddress: (address: Omit<DemoAddress, 'id'>, id?: string) => Promise<boolean>;
  deleteAddress: (id: string) => Promise<boolean>;
  selectAddress: (id: string) => void;
  selectVoucher: (code: string) => void;
  setMapLocation: (location: DemoMapLocation | null) => void;
  setDefaultAddress: (id: string) => Promise<boolean>;
  placeOrder: (voucherCode?: string, note?: string) => Promise<CheckoutResult | null>;
  cancelOrder: (id: string) => Promise<boolean>;
  addReview: (orderId: string, rating: number, comment: string) => Promise<boolean>;
  updateProfile: (profile: CustomerProfile) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  signOutFromApi: () => Promise<boolean>;
  refreshData: () => Promise<void>;
  refreshOrders: (status?: DemoOrderStatus) => Promise<boolean>;
  refreshOrder: (orderId: string, options?: { silent?: boolean }) => Promise<DemoOrder | null>;
}

const emptyProfile: CustomerProfile = {
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
};

const PrototypeContext = createContext<PrototypeContextValue | null>(null);

export function PrototypeProvider({ children }: PropsWithChildren) {
  const { token, signOut } = useSession();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [addresses, setAddresses] = useState<DemoAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedVoucherCode, setSelectedVoucherCode] = useState('');
  const [selectedMapLocation, setSelectedMapLocation] = useState<DemoMapLocation | null>(null);
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [reviews, setReviews] = useState<DemoReview[]>([]);
  const [vouchers, setVouchers] = useState<CustomerVoucher[]>([]);
  const [hasLoadedVouchers, setHasLoadedVouchers] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile>(emptyProfile);
  const [isLoading, setIsLoading] = useState(false);
  const orderRefreshRequestId = useRef(0);

  const showApiError = useCallback((action: string, error: unknown) => {
    showNotice(action, getErrorMessage(error));
  }, []);

  const refreshData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    const results = await Promise.allSettled([
      getCart(token),
      listAddresses(token),
      getProfile(token),
      listReviews(token),
      listVouchers(token),
    ]);
    const authenticationFailure = results.find(
      (result) =>
        result.status === 'rejected' &&
        result.reason instanceof ApiError &&
        (result.reason.status === 401 || result.reason.status === 403),
    );
    if (authenticationFailure?.status === 'rejected') {
      setIsLoading(false);
      showNotice('Phiên đăng nhập không còn hợp lệ', getErrorMessage(authenticationFailure.reason));
      await signOut();
      return;
    }
    const failures: string[] = [];

    if (results[0].status === 'fulfilled') setCart(results[0].value.items);
    else failures.push(`Giỏ hàng: ${getErrorMessage(results[0].reason)}`);

    if (results[1].status === 'fulfilled') {
      const loadedAddresses = results[1].value;
      setAddresses(loadedAddresses);
      setSelectedAddressId((current) =>
        loadedAddresses.some((address) => address.id === current)
          ? current
          : loadedAddresses.find((address) => address.isDefault)?.id ?? loadedAddresses[0]?.id ?? null,
      );
    } else failures.push(`Địa chỉ: ${getErrorMessage(results[1].reason)}`);

    if (results[2].status === 'fulfilled') setProfile(results[2].value);
    else failures.push(`Hồ sơ: ${getErrorMessage(results[2].reason)}`);

    if (results[3].status === 'fulfilled') setReviews(results[3].value);
    else failures.push(`Đánh giá: ${getErrorMessage(results[3].reason)}`);

    if (results[4].status === 'fulfilled') {
      setVouchers(results[4].value);
      setHasLoadedVouchers(true);
    } else failures.push(`Ưu đãi: ${getErrorMessage(results[4].reason)}`);

    const loadedReviews = results[3].status === 'fulfilled' ? results[3].value : [];
    try {
      setOrders(await listOrders(token, new Set(loadedReviews.map((review) => review.orderId))));
    } catch (error) {
      failures.push(`Đơn hàng: ${getErrorMessage(error)}`);
    }

    setIsLoading(false);
    if (failures.length) {
      showNotice('Một số dữ liệu chưa tải được', failures.join('\n'));
    }
  }, [signOut, token]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      if (token) {
        setSelectedVoucherCode('');
        void refreshData();
        return;
      }
      setCart([]);
      setAddresses([]);
      setSelectedAddressId(null);
      setSelectedVoucherCode('');
      setOrders([]);
      setReviews([]);
      setVouchers([]);
      setHasLoadedVouchers(false);
      setProfile(emptyProfile);
    });
    return () => {
      active = false;
    };
  }, [refreshData, token]);

  useEffect(() => {
    if (!token || !hasLoadedVouchers || !selectedVoucherCode) return;
    if (vouchers.some((voucher) =>
      voucher.code === selectedVoucherCode && !voucher.usedByCustomer
    )) return;
    void Promise.resolve().then(() => setSelectedVoucherCode(''));
  }, [hasLoadedVouchers, selectedVoucherCode, token, vouchers]);

  const addToCart = useCallback(async (foodId: number, quantity: number, replace = false) => {
    if (!token) return false;
    try {
      if (replace) await clearCartRequest(token);
      setCart((await addCartItemRequest(token, foodId, quantity)).items);
      return true;
    } catch (error) {
      if (replace) {
        try {
          setCart((await getCart(token)).items);
        } catch (refreshError) {
          showApiError('Không thể làm mới giỏ hàng', refreshError);
        }
      }
      showApiError('Không thể thêm món vào giỏ', error);
      return false;
    }
  }, [showApiError, token]);

  const updateCartQuantity = useCallback(async (foodId: number, quantity: number) => {
    if (!token) return false;
    try {
      const line = cart.find((item) => item.foodId === foodId);
      if (!line) return false;
      const updated = quantity > 0
        ? await updateCartItem(token, line.id, quantity)
        : await deleteCartItem(token, line.id);
      setCart(updated.items);
      return true;
    } catch (error) {
      showApiError('Không thể cập nhật giỏ hàng', error);
      return false;
    }
  }, [cart, showApiError, token]);

  const removeFromCart = useCallback(async (foodId: number) => {
    return updateCartQuantity(foodId, 0);
  }, [updateCartQuantity]);

  const clearCart = useCallback(async () => {
    if (!token) return false;
    try {
      setCart((await clearCartRequest(token)).items);
      return true;
    } catch (error) {
      showApiError('Không thể xóa giỏ hàng', error);
      return false;
    }
  }, [showApiError, token]);

  const saveAddress = useCallback(async (address: Omit<DemoAddress, 'id'>, id?: string) => {
    if (!token) return false;
    const input: AddressInput = {
      address_name: address.name.trim(),
      receiver_name: address.receiver.trim(),
      receiver_phone: address.phone.trim(),
      full_address: address.address.trim(),
      latitude: address.latitude,
      longitude: address.longitude,
      note: address.note.trim(),
      is_default: address.isDefault,
    };
    try {
      const saved = await saveAddressRequest(token, input, id ? Number(id) : undefined);
      setAddresses((current) => {
        const next = saved.isDefault
          ? current.map((entry) => ({ ...entry, isDefault: false }))
          : current;
        return next.some((entry) => entry.id === saved.id)
          ? next.map((entry) => entry.id === saved.id ? saved : entry)
          : [saved, ...next];
      });
      setSelectedAddressId((current) => current ?? saved.id);
      setSelectedMapLocation(null);
      return true;
    } catch (error) {
      showApiError('Không thể lưu địa chỉ', error);
      return false;
    }
  }, [showApiError, token]);

  const deleteAddress = useCallback(async (id: string) => {
    if (!token) return false;
    try {
      await deleteAddressRequest(token, Number(id));
      setAddresses((current) => {
        const remaining = current.filter((address) => address.id !== id);
        setSelectedAddressId((selected) => selected === id
          ? remaining.find((address) => address.isDefault)?.id ?? remaining[0]?.id ?? null
          : selected);
        return remaining;
      });
      return true;
    } catch (error) {
      showApiError('Không thể xóa địa chỉ', error);
      return false;
    }
  }, [showApiError, token]);

  const setDefaultAddress = useCallback(async (id: string) => {
    const currentAddress = addresses.find((address) => address.id === id);
    if (!currentAddress || !token) return false;
    return saveAddress({ ...currentAddress, isDefault: true }, id);
  }, [addresses, saveAddress, token]);

  const placeOrder = useCallback(async (voucherCode = '', note = ''): Promise<CheckoutResult | null> => {
    if (!token || !selectedAddressId) return null;
    let result: CheckoutResult;
    try {
      result = await checkoutRequest(token, {
        address_id: Number(selectedAddressId),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(voucherCode.trim() ? { voucher_code: voucherCode.trim() } : {}),
      });
    } catch (error) {
      showApiError('Không thể đặt hàng', error);
      return null;
    }
    setSelectedVoucherCode('');
    setCart([]);
    const refreshResults = await Promise.allSettled([
      listReviews(token),
      listVouchers(token),
      listOrders(token, new Set(reviews.map((review) => review.orderId))),
    ]);
    const refreshErrors: string[] = [];
    if (refreshResults[0].status === 'fulfilled') {
      setReviews(refreshResults[0].value);
    } else refreshErrors.push(`Đánh giá: ${getErrorMessage(refreshResults[0].reason)}`);
    if (refreshResults[1].status === 'fulfilled') {
      setVouchers(refreshResults[1].value);
    } else refreshErrors.push(`Ưu đãi: ${getErrorMessage(refreshResults[1].reason)}`);
    if (refreshResults[2].status === 'fulfilled') {
      setOrders(refreshResults[2].value);
    } else refreshErrors.push(`Đơn hàng: ${getErrorMessage(refreshResults[2].reason)}`);
    if (refreshErrors.length) {
      showNotice('Đơn đã được đặt', `Đơn #${result.orderCode} đã tạo thành công. Một số dữ liệu chưa làm mới được:\n${refreshErrors.join('\n')}`);
    }
    return result;
  }, [reviews, selectedAddressId, showApiError, token]);

  const cancelOrder = useCallback(async (orderId: string) => {
    if (!token) return false;
    try {
      await cancelOrderRequest(token, Number(orderId));
      const updated = await getOrder(token, Number(orderId), new Set(reviews.map((review) => review.orderId)));
      setOrders((current) => current.map((order) => order.id === orderId ? updated : order));
      return true;
    } catch (error) {
      showApiError('Không thể hủy đơn hàng', error);
      return false;
    }
  }, [reviews, showApiError, token]);

  const addReview = useCallback(async (orderId: string, rating: number, comment: string) => {
    if (!token) return false;
    try {
      await createReviewRequest(token, Number(orderId), rating, comment);
      const updatedReviews = await listReviews(token);
      setReviews(updatedReviews);
      setOrders((current) => current.map((order) =>
        order.id === orderId ? { ...order, reviewed: true } : order,
      ));
      return true;
    } catch (error) {
      showApiError('Không thể gửi đánh giá', error);
      return false;
    }
  }, [showApiError, token]);

  const updateProfile = useCallback(async (nextProfile: CustomerProfile) => {
    if (!token) return false;
    try {
      setProfile(await updateProfileRequest(token, nextProfile));
      return true;
    } catch (error) {
      showApiError('Không thể cập nhật hồ sơ', error);
      return false;
    }
  }, [showApiError, token]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!token) return false;
    try {
      await changePasswordRequest(token, currentPassword, newPassword);
      return true;
    } catch (error) {
      showNotice('Không thể đổi mật khẩu', getErrorMessage(error, 'change-password'));
      return false;
    }
  }, [token]);

  const signOutFromApi = useCallback(async () => {
    if (!token) return true;
    try {
      await logoutRequest(token);
      return true;
    } catch (error) {
      showApiError('Không thể đăng xuất khỏi máy chủ', error);
      return false;
    }
  }, [showApiError, token]);

  const refreshOrder = useCallback(async (
    orderId: string,
    options: { silent?: boolean } = {},
  ) => {
    if (!token) return null;
    try {
      const order = await getOrder(token, Number(orderId), new Set(reviews.map((review) => review.orderId)));
      setOrders((current) => [
        order,
        ...current.filter((existing) => existing.id !== order.id),
      ]);
      return order;
    } catch (error) {
      if (!options.silent) showApiError('Không thể tải chi tiết đơn hàng', error);
      return null;
    }
  }, [reviews, showApiError, token]);

  const refreshOrders = useCallback(async (status?: DemoOrderStatus) => {
    if (!token) return false;
    const requestId = ++orderRefreshRequestId.current;
    try {
      const result = await listOrders(
        token,
        new Set(reviews.map((review) => review.orderId)),
        status,
      );
      if (requestId === orderRefreshRequestId.current) setOrders(result);
      return true;
    } catch (error) {
      showApiError('Không thể làm mới đơn hàng', error);
      return false;
    }
  }, [reviews, showApiError, token]);

  const selectVoucher = useCallback((code: string) => {
    setSelectedVoucherCode(code);
  }, []);

  const value = useMemo(
    () => ({
      cart,
      cartSubtotal: cart.reduce((sum, item) => sum + item.subtotal, 0),
      addresses,
      selectedAddressId,
      selectedVoucherCode,
      selectedMapLocation,
      orders,
      reviews,
      vouchers,
      profile,
      isLoading,
      addToCart,
      updateCartQuantity,
      removeFromCart,
      clearCart,
      saveAddress,
      deleteAddress,
      selectAddress: setSelectedAddressId,
      selectVoucher,
      setMapLocation: setSelectedMapLocation,
      setDefaultAddress,
      placeOrder,
      cancelOrder,
      addReview,
      updateProfile,
      changePassword,
      signOutFromApi,
      refreshData,
      refreshOrders,
      refreshOrder,
    }),
    [
      cart, addresses, selectedAddressId, selectedVoucherCode, selectedMapLocation,
      orders, reviews, vouchers, profile, isLoading, addToCart, updateCartQuantity,
      removeFromCart, clearCart, saveAddress, deleteAddress, setDefaultAddress,
      placeOrder, cancelOrder, addReview, updateProfile, changePassword, signOutFromApi,
      refreshData, refreshOrders, refreshOrder, selectVoucher,
    ],
  );

  return <PrototypeContext.Provider value={value}>{children}</PrototypeContext.Provider>;
}

export function usePrototype(): PrototypeContextValue {
  const context = useContext(PrototypeContext);
  if (!context) {
    throw new Error('usePrototype phải được dùng bên trong PrototypeProvider.');
  }
  return context;
}
