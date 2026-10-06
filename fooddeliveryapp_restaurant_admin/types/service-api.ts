export type ActorRole = "CUSTOMER" | "RESTAURANT" | "SHIPPER" | "ADMIN";

export interface ActorProfile {
  userId: number;
  email: string;
  role: ActorRole;
  customer?: {
    customerId: number;
    fullName: string | null;
    phone: string | null;
    dateOfBirth: string | null;
  };
  restaurant?: {
    restaurantId: number;
    name: string;
  };
  shipper?: {
    shipperId: number;
    fullName: string;
    phone: string;
  };
  admin?: {
    adminId: number;
    fullName: string;
  };
}

export interface CategoryRecord {
  category_id: number;
  name: string;
  description: string | null;
  is_active: boolean | 0 | 1;
  created_at: string;
}

export interface FoodStatusRecord {
  status_id: number;
  status_name: "AVAILABLE" | "UNAVAILABLE";
}

export interface RestaurantRecord {
  restaurant_id: number;
  name: string;
  address: string;
  phone: string;
  description: string | null;
  latitude: number;
  longitude: number;
  image: string | null;
  opening_time: string | null;
  closing_time: string | null;
  status: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
  is_open: boolean | 0 | 1;
  rating_average: number;
  distance_km?: number;
}

export interface FoodRecord {
  food_id: number;
  restaurant_id: number;
  restaurant_name: string;
  category_id: number;
  category_name: string;
  name: string;
  description: string | null;
  price: number | string;
  image: string | null;
  status: "AVAILABLE" | "UNAVAILABLE";
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "DELIVERING"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED";

export interface OrderSummaryRecord {
  order_id: number;
  order_code: string;
  customer_id: number;
  restaurant_id: number;
  address_id: number;
  subtotal: number | string;
  delivery_fee: number | string;
  discount: number | string;
  total_amount: number | string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRecord {
  order_detail_id: number;
  food_id: number;
  food_name: string;
  quantity: number;
  unit_price: number | string;
  subtotal: number | string;
}

export interface OrderHistoryRecord {
  history_id?: number;
  status: OrderStatus;
  changed_by_user_id: number | null;
  note: string | null;
  changed_at: string;
}

export interface OrderDetailRecord extends OrderSummaryRecord {
  restaurant_name?: string;
  address_name?: string;
  receiver_name?: string;
  receiver_phone?: string;
  full_address?: string;
  latitude?: number;
  longitude?: number;
  items: OrderItemRecord[];
  history: OrderHistoryRecord[];
  payment?: {
    amount: number | string;
    method: string;
    status: string;
    paid_at: string | null;
  } | null;
  delivery?: {
    delivery_id?: number;
    shipper_id?: number | null;
    status?: string;
    delivery_status?: string;
    pickup_time: string | null;
    delivery_time: string | null;
    note?: string | null;
  } | null;
}

export interface OrderTransitionResult {
  orderId: number;
  previousStatus: OrderStatus;
  status: OrderStatus;
}

export interface CustomerAdminRecord {
  customer_id: number;
  user_id: number;
  email: string;
  account_status: "ACTIVE" | "LOCKED";
  full_name: string | null;
  phone: string | null;
  date_of_birth: string | null;
  created_at: string;
}

export interface RestaurantAdminRecord {
  restaurant_id: number;
  user_id: number;
  email: string;
  name: string;
  address: string;
  phone: string;
  description: string | null;
  latitude: number;
  longitude: number;
  image: string | null;
  opening_time: string | null;
  closing_time: string | null;
  status: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
  account_status: "ACTIVE" | "LOCKED";
}

export interface ShipperAdminRecord {
  shipper_id: number;
  user_id: number;
  email: string;
  full_name: string;
  phone: string;
  account_status: "ACTIVE" | "LOCKED";
  availability: "OFFLINE" | "ONLINE" | "BUSY";
  created_at: string;
}

export interface AdminOrderRecord {
  order_id: number;
  order_code: string;
  customer_id: number;
  customer_name: string | null;
  restaurant_id: number;
  restaurant_name: string;
  subtotal: number | string;
  delivery_fee: number | string;
  discount: number | string;
  total_amount: number | string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export interface AdminOrderDetailRecord extends AdminOrderRecord {
  address_id: number;
  receiver_name: string;
  receiver_phone: string;
  full_address: string;
  note: string | null;
  items: OrderItemRecord[];
  history: OrderHistoryRecord[];
  payment: {
    method: string;
    status: string;
    amount: number | string;
    paid_at: string | null;
  } | null;
  delivery: {
    delivery_id: number;
    shipper_id: number | null;
    delivery_status: string;
    pickup_time: string | null;
    delivery_time: string | null;
    note: string | null;
  } | null;
}

export type VoucherStatus = "ACTIVE" | "INACTIVE" | "EXPIRED";

export interface VoucherRecord {
  voucher_id: number;
  code: string;
  discount_value: number | string;
  min_order_value: number | string;
  usage_limit: number;
  used_count: number;
  status: VoucherStatus;
  start_date: string;
  end_date: string;
  status_id?: number;
}

export type VoucherWriteInput = Pick<
  VoucherRecord,
  | "code"
  | "discount_value"
  | "min_order_value"
  | "usage_limit"
  | "status"
  | "start_date"
  | "end_date"
>;

export type ReviewStatus = "VISIBLE" | "HIDDEN" | "PENDING";

export interface ReviewRecord {
  review_id: number;
  customer_id?: number;
  order_id: number;
  rating: number;
  comment: string | null;
  status?: ReviewStatus;
  created_at: string;
  updated_at?: string;
  restaurant_id?: number;
  restaurant_name?: string;
  order_status?: OrderStatus;
}

export interface ReviewModerationResult {
  reviewId: number;
  previousStatus: ReviewStatus;
  status: Exclude<ReviewStatus, "PENDING">;
}

export interface RevenueRecord {
  period: string;
  revenue: number | string;
  completed_orders: number;
}

export interface AdminSummaryRecord {
  total_users: number;
  active_users: number;
  locked_users: number;
  total_customers: number;
  active_customers: number;
  locked_customers: number;
  total_restaurants: number;
  active_restaurants: number;
  suspended_restaurants: number;
  pending_restaurants: number;
  rejected_restaurants: number;
  total_shippers: number;
  active_shippers: number;
  locked_shippers: number;
  online_shippers: number;
  offline_shippers: number;
  busy_shippers: number;
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  rejected_orders: number;
  orders_today: number;
  total_restaurant_revenue: number | string;
  revenue_today: number | string;
  orders_by_status: Record<OrderStatus, number>;
}

export interface ImageResult {
  image: string | null;
}
