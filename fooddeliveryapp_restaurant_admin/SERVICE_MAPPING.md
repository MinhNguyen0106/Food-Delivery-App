# Restaurant Admin Service Integration - Tóm Tắt Kỹ Thuật

## 📋 Vấn Đề Ban Đầu

Ba trang restaurant (dashboard, menu, orders) đang import các service không tồn tại:
- ❌ `@/services/restaurant.service` 
- ❌ `@/services/food.service`
- ❌ `@/services/category.service`
- ❌ `@/services/order.service`

**Lý do:** Service thực tế nằm dưới thư mục `services/restaurant/` nhưng dùng schema snake_case (food_id, order_id, status_id) khác với camelCase mong muốn của các page (foodId, orderId, statusId).

## ✅ Giải Pháp Triển Khai

### 1. **Tạo Mapper Tầng (services/mappers.ts)**
Chuyên đổi dữ liệu snake_case ↔ camelCase:

```typescript
// food_id → foodId, status_id → status, etc.
foodMapper.toCamelCase(snakeCaseFood): CamelCaseFood

// CreateFoodInput → CreateFoodPayload
foodMapper.fromCreateInput(camelInput, restaurantId): SnakeCasePayload
```

**Các Mapper:**
- `foodMapper` - Foods (AVAILABLE ↔ status_id 1/2)
- `categoryMapper` - Categories  
- `orderMapper` - Orders (PENDING → status_id 1, CONFIRMED → 2, etc.)
- `orderDetailMapper` - Order Details

### 2. **Tạo Service Facades (Service Wrappers)**

#### `services/food.service.ts`
```typescript
export const foodService = {
  listMine()           // Danh sách thực đơn của nhà hàng
  getById(id)          // Chi tiết món ăn
  create(input)        // Thêm món
  update(id, input)    // Sửa món
  updateStatus(id, status)  // Bật/tắt món
  remove(id)           // Xóa món
}
```

**Gọi qua:** `restaurantMenuService` → ánh xạ `CreateFoodInput` → `CreateFoodPayload`

#### `services/category.service.ts`
```typescript
export const categoryService = {
  getActive()          // Danh mục hoạt động
  getAll()             // Tất cả danh mục
  getById(id)          // Chi tiết danh mục
}
```

#### `services/order.service.ts`
```typescript
export const orderService = {
  list()               // Danh sách đơn hàng
  getById(id)          // Chi tiết đơn hàng
  updateStatus(id, input)  // Xác nhận/Chuẩn bị/Sẵn sàng lấy
  reject(id, note)     // Từ chối đơn
}
```

**Xử lý trạng thái:**
```
PENDING (1) → CONFIRMED (2) → PREPARING (3) → READY_FOR_PICKUP (4)
                                                          ↓
                                                    REJECTED (9)
```

#### `services/restaurant.service.ts`
```typescript
export const restaurantService = {
  getDashboard()       // Thống kê: doanh thu, số đơn hôm nay
  list()               // Danh sách nhà hàng
  getById(id)          // Chi tiết nhà hàng
}
```

### 3. **Cấu Trúc Dữ Liệu Ánh Xạ**

**Input/Output từ Pages (camelCase):**
```typescript
interface Food {
  foodId: number
  restaurantId: number
  categoryId: number
  name: string
  price: number
  status: "AVAILABLE" | "UNAVAILABLE"
  createdAt: DateTime
  updatedAt: DateTime
}

interface Order {
  orderId: number
  orderCode: string
  status: OrderStatus  // PENDING, CONFIRMED, PREPARING, etc.
  details: OrderDetail[]
  totalAmount: number
  createdAt: DateTime
}
```

**Backend API (snake_case, status_id = number):**
```typescript
interface Food {
  food_id: number
  restaurant_id: number
  category_id: number
  name: string
  price: number
  status_id: 1 | 2  // 1=AVAILABLE, 2=UNAVAILABLE
  created_at: DateTime
  updated_at: DateTime
}

interface Order {
  order_id: number
  restaurant_id: number
  status_id: 1-9  // 1=PENDING, 2=CONFIRMED, 3=PREPARING, etc.
  total_amount: number
  created_at: DateTime
}
```

## 📊 Luồng Xử Lý Thực Tế

### Dashboard Load:
```
Dashboard Page
  ↓ restaurantService.getDashboard()
  ↓ restaurantProfileService.list()
  ↓ Xử lý logic, map status
  ↓ Trả về RestaurantDashboard (camelCase)
```

### Menu Load & Update:
```
Menu Page
  ↓ Promise.all([foodService.listMine(), categoryService.getActive()])
  ↓ foodService.listMine()
    ↓ restaurantMenuService.listFoods()
    ↓ foodMapper.toCamelCase(each food)
    ↓ return Food[] (camelCase)
  
  Khi thêm/sửa:
  ↓ foodService.create/update(input)
    ↓ foodMapper.fromCreateInput(input)
    ↓ restaurantMenuService.createFood/updateFood(payload)
    ↓ return updated Food
  
  Bật/tắt món:
  ↓ foodService.updateStatus(id, "AVAILABLE"|"UNAVAILABLE")
    ↓ Map status → status_id (1 or 2)
    ↓ restaurantMenuService.updateFood(id, { status_id })
```

### Orders Load & Update:
```
Orders Page
  ↓ orderService.list()
    ↓ restaurantOrderService.list() → Orders[]
    ↓ restaurantOrderService.listDetails() → OrderDetails[]
    ↓ orderMapper.toCamelCase(order, details)
    ↓ Map status_id (1) → "PENDING", etc.
  
  Cập nhật trạng thái:
  ↓ orderService.updateStatus(id, { status: "CONFIRMED" })
    ↓ Map status → status_id (2)
    ↓ restaurantOrderService.update(id, { status_id: 2 })
```

## 🔌 API Endpoints (Backend)

Tất cả mới map qua `/api/` endpoint hiện có:

| Mục Đích | Method | Endpoint | Response Type |
|---------|--------|----------|---------------|
| Danh sách món | GET | `/api/foods` | Food[] |
| Chi tiết món | GET | `/api/foods/:id` | Food |
| Thêm món | POST | `/api/foods` | { success, id } |
| Sửa món | PUT | `/api/foods/:id` | { success } |
| Xóa món | DELETE | `/api/foods/:id` | { success } |
| Danh mục | GET | `/api/categories` | Category[] |
| Danh sách đơn | GET | `/api/orders` | Order[] |
| Chi tiết đơn | GET | `/api/orders/:id` | Order |
| Chi tiết đơn hàng | GET | `/api/order_details` | OrderDetail[] |
| Cập nhật đơn | PUT | `/api/orders/:id` | { success } |
| Nhà hàng | GET | `/api/restaurants` | Restaurant[] |

## 📁 Cây Cấu Trúc File

```
services/
├── mappers.ts                    ← Chuyên đổi dữ liệu snake ↔ camel
├── food.service.ts              ← Facade: listMine, create, update, remove
├── category.service.ts           ← Facade: getActive, getAll
├── order.service.ts              ← Facade: list, updateStatus, reject
├── restaurant.service.ts         ← Facade: getDashboard, list, getById
├── restaurant/                   ← Xử lý trực tiếp API (snake_case)
│   ├── menu.service.ts
│   ├── order.service.ts
│   ├── profile.service.ts
│   ├── payment.service.ts
│   ├── status.service.ts
│   └── voucher.service.ts
└── api.client.ts                 ← Axios client + unwrapResponse
```

## ✨ Tính Năng Đạt Được

✅ **Dashboard:** Hiển thị doanh thu hôm nay, số đơn, đơn chờ xử lý, đơn hoàn thành
✅ **Menu:** Danh sách món, thêm/sửa/xóa, bật/tắt trạng thái  
✅ **Orders:** Danh sách đơn, xác nhận → chuẩn bị → sẵn sàng lấy, từ chối với lý do  
✅ **Type Safety:** Camel/snake casing riêng biệt, TypeScript strict mode
✅ **No Duplicates:** Reuse service hiện có, không trùng API

## 🐛 Kiểm Tra & Xác Nhận

```bash
# Compile TypeScript (0 errors, 0 warnings)
npx tsc --noEmit                 ✅ PASS

# Lint (no errors)
npm run lint                      ✅ PASS

# Dev Server
npm run dev                       ✅ Pages load without errors
  http://localhost:3000/restaurant/dashboard   ✅
  http://localhost:3000/restaurant/menu         ✅
  http://localhost:3000/restaurant/orders       ✅
```

## 🔄 Tiếp Theo (Optional)

Nếu backend cần thêm endpoints:
- Dashboard stats riêng: `GET /api/restaurants/:id/dashboard`
- Filter orders by status: `GET /api/orders?status=PENDING`
- Pagination support: Add `page`, `limit` params
