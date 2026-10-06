export interface Restaurant {
  id: number;
  name: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  cuisine?: string;
  address: string;
  description: string;
  image: string;
  rating: number;
  reviewCount?: number;
  distance?: string;
  deliveryMinutes?: string;
  open: boolean;
  openAt?: string;
  categories: string[];
}

export interface Food {
  id: number;
  restaurantId: number;
  name: string;
  description: string;
  category: string;
  categoryId?: number;
  restaurantName?: string;
  price: number;
  image: string;
  available: boolean;
}

export interface DemoAddress {
  id: string;
  name: string;
  receiver: string;
  phone: string;
  address: string;
  note: string;
  isDefault: boolean;
  latitude: number;
  longitude: number;
}

export type DemoOrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'DELIVERING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

export interface DemoOrder {
  id: string;
  code?: string;
  restaurantId: number;
  restaurantName?: string;
  status: DemoOrderStatus;
  createdAt: string;
  total: number;
  subtotal?: number;
  deliveryFee?: number;
  discount?: number;
  items: { foodId: number; quantity: number; unitPrice?: number; name?: string }[];
  addressId: string;
  addressName?: string;
  receiver?: string;
  phone?: string;
  fullAddress?: string;
  reviewed: boolean;
  note?: string;
  paymentMethod?: string;
  deliveryStatus?: string;
  pickupTime?: string;
  deliveryTime?: string;
  history?: { status: string; changedAt: string; note: string }[];
}

export interface DemoReview {
  id: string;
  orderId: string;
  restaurantId: number;
  restaurantName?: string;
  rating: number;
  comment: string;
  createdAt: string;
  status: 'PENDING' | 'VISIBLE' | 'HIDDEN';
}

export const restaurants: Restaurant[] = [
  {
    id: 1,
    name: 'Bếp Nhà Mình',
    cuisine: 'Cơm nhà · Món Việt',
    address: '18 Nguyễn Thị Minh Khai, Quận 1',
    description: 'Mâm cơm Việt giản dị, nấu mới mỗi ngày từ những nguyên liệu quen thuộc.',
    image:
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85',
    rating: 4.8,
    reviewCount: 248,
    distance: '1.2 km',
    deliveryMinutes: '20–30 phút',
    open: true,
    openAt: '10:00–21:30',
    categories: ['Món Việt', 'Cơm', 'Rau'],
  },
  {
    id: 2,
    name: 'Mì & Hơn Thế',
    cuisine: 'Mì tươi · Món Á',
    address: '42 Lê Thánh Tôn, Quận 1',
    description: 'Mì kéo tay và nước dùng ninh chậm, chuẩn vị cho một bữa trưa ấm bụng.',
    image:
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=85',
    rating: 4.7,
    reviewCount: 186,
    distance: '1.8 km',
    deliveryMinutes: '25–35 phút',
    open: true,
    openAt: '09:30–22:00',
    categories: ['Món Á', 'Mì', 'Nước'],
  },
  {
    id: 3,
    name: 'Cà phê Tháng Tư',
    cuisine: 'Cà phê · Bánh ngọt',
    address: '7 Nguyễn Du, Quận 1',
    description: 'Một góc nhỏ dành cho cà phê rang mộc và những chiếc bánh nướng trong ngày.',
    image:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85',
    rating: 4.9,
    reviewCount: 321,
    distance: '2.1 km',
    deliveryMinutes: '15–25 phút',
    open: true,
    openAt: '07:00–20:00',
    categories: ['Đồ uống', 'Cà phê', 'Bánh'],
  },
  {
    id: 4,
    name: 'Lò Bánh Sài Gòn',
    cuisine: 'Bánh mì · Ăn nhẹ',
    address: '95 Hai Bà Trưng, Quận 1',
    description: 'Bánh mì giòn nóng, nhân đầy đặn và pate nhà làm mỗi sáng.',
    image:
      'https://images.unsplash.com/photo-1600454309261-3dc9b7597637?auto=format&fit=crop&w=1200&q=85',
    rating: 4.6,
    reviewCount: 154,
    distance: '2.4 km',
    deliveryMinutes: '20–30 phút',
    open: false,
    openAt: '06:30–18:00',
    categories: ['Món Việt', 'Bánh mì', 'Ăn nhẹ'],
  },
];

export const foods: Food[] = [
  {
    id: 101,
    restaurantId: 1,
    name: 'Cơm gà nướng mật ong',
    description: 'Đùi gà nướng vàng thơm, cơm dẻo, rau theo mùa và nước mắm nhà làm.',
    category: 'Món Việt',
    price: 68000,
    image:
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85',
    available: true,
  },
  {
    id: 102,
    restaurantId: 1,
    name: 'Cơm cá kho tộ',
    description: 'Cá kho niêu đất đậm đà, dùng cùng cơm trắng và canh rau.',
    category: 'Cơm',
    price: 72000,
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=85',
    available: true,
  },
  {
    id: 103,
    restaurantId: 1,
    name: 'Gỏi cuốn tôm thịt',
    description: 'Cuốn mới trong ngày với tôm, thịt, bún tươi và rau thơm.',
    category: 'Rau',
    price: 45000,
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=85',
    available: true,
  },
  {
    id: 201,
    restaurantId: 2,
    name: 'Mì bò hầm cà chua',
    description: 'Sợi mì tươi dai vừa, bò hầm mềm và nước dùng thanh ngọt.',
    category: 'Mì',
    price: 89000,
    image:
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=85',
    available: true,
  },
  {
    id: 202,
    restaurantId: 2,
    name: 'Mì trộn dầu hành',
    description: 'Mì trộn thủ công với dầu hành thơm, rau cải và trứng lòng đào.',
    category: 'Mì',
    price: 76000,
    image:
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=85',
    available: true,
  },
  {
    id: 301,
    restaurantId: 3,
    name: 'Cà phê sữa đá',
    description: 'Cà phê rang mộc pha phin, vị đậm vừa và hậu vị ngọt dịu.',
    category: 'Cà phê',
    price: 39000,
    image:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85',
    available: true,
  },
  {
    id: 302,
    restaurantId: 3,
    name: 'Bánh croissant bơ',
    description: 'Bánh nhiều lớp nướng mỗi sáng, thơm mùi bơ Pháp.',
    category: 'Bánh',
    price: 52000,
    image:
      'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=85',
    available: true,
  },
  {
    id: 401,
    restaurantId: 4,
    name: 'Bánh mì đặc biệt',
    description: 'Pate nhà làm, thịt nguội, đồ chua và rau thơm trong ổ bánh giòn.',
    category: 'Bánh mì',
    price: 42000,
    image:
      'https://images.unsplash.com/photo-1600454309261-3dc9b7597637?auto=format&fit=crop&w=900&q=85',
    available: false,
  },
];

export const initialAddresses: DemoAddress[] = [
  {
    id: 'addr-home',
    name: 'Nhà riêng',
    receiver: 'Nguyễn Minh Anh',
    phone: '090 123 4567',
    address: '12 Nguyễn Bỉnh Khiêm, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh',
    note: 'Gọi trước khi giao',
    isDefault: true,
    latitude: 10.7902,
    longitude: 106.7001,
  },
  {
    id: 'addr-office',
    name: 'Văn phòng',
    receiver: 'Nguyễn Minh Anh',
    phone: '090 123 4567',
    address: 'Tầng 8, 35 Lê Thánh Tôn, Phường Bến Nghé, Quận 1',
    note: 'Gửi tại quầy lễ tân',
    isDefault: false,
    latitude: 10.7769,
    longitude: 106.7011,
  },
];

export const initialOrders: DemoOrder[] = [
  {
    id: 'FD26092701',
    restaurantId: 2,
    status: 'DELIVERING',
    createdAt: 'Hôm nay, 11:42',
    total: 174000,
    items: [
      { foodId: 201, quantity: 1 },
      { foodId: 202, quantity: 1 },
    ],
    addressId: 'addr-home',
    reviewed: false,
  },
  {
    id: 'FD26092518',
    restaurantId: 1,
    status: 'COMPLETED',
    createdAt: '25/09/2026, 19:08',
    total: 158000,
    items: [
      { foodId: 101, quantity: 2 },
      { foodId: 103, quantity: 1 },
    ],
    addressId: 'addr-office',
    reviewed: false,
  },
];

export const initialReviews: DemoReview[] = [
  {
    id: 'rv-001',
    orderId: 'FD26091812',
    restaurantId: 3,
    rating: 5,
    comment: 'Cà phê thơm, bánh mới. Giao hàng cũng rất cẩn thận.',
    createdAt: '18/09/2026',
    status: 'VISIBLE',
  },
];

export const vouchers = [
  { code: 'CHAO30', discount: 30000, minimum: 150000, expiry: '30/09/2026', tone: 'green' },
  { code: 'BEP20', discount: 20000, minimum: 100000, expiry: '05/10/2026', tone: 'sand' },
];

export const categories = ['Tất cả', 'Món Việt', 'Món Á', 'Cà phê', 'Bánh'];

export function formatCurrency(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
}

export function getRestaurant(id: number): Restaurant {
  return restaurants.find((restaurant) => restaurant.id === id) ?? restaurants[0];
}

export function getFood(id: number): Food {
  return foods.find((food) => food.id === id) ?? foods[0];
}

export function getOrderStatusLabel(status: DemoOrderStatus): string {
  const labels: Record<DemoOrderStatus, string> = {
    PENDING: 'Chờ nhà hàng xác nhận',
    CONFIRMED: 'Đã xác nhận',
    PREPARING: 'Đang chuẩn bị',
    READY_FOR_PICKUP: 'Sẵn sàng giao',
    PICKED_UP: 'Đã lấy món',
    DELIVERING: 'Đang giao đến bạn',
    COMPLETED: 'Đã hoàn thành',
    CANCELLED: 'Đã hủy',
    REJECTED: 'Nhà hàng đã từ chối',
  };
  return labels[status];
}
