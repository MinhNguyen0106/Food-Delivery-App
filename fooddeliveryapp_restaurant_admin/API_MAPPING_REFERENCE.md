# 📊 Service Integration Reference Table

## Facades & Mappings Overview

| Facade Service | Underlying Service | Endpoint | Purpose | Return Type |
|---|---|---|---|---|
| `foodService.listMine()` | `restaurantMenuService.listFoods()` | GET `/api/foods` | Danh sách thực đơn | `Food[]` (camelCase) |
| `foodService.getById(id)` | `restaurantMenuService.getFood(id)` | GET `/api/foods/:id` | Chi tiết món ăn | `Food` |
| `foodService.create(input)` | `restaurantMenuService.createFood()` | POST `/api/foods` | Thêm món | `Food` |
| `foodService.update(id, input)` | `restaurantMenuService.updateFood(id)` | PUT `/api/foods/:id` | Sửa món | `Food` |
| `foodService.updateStatus(id, status)` | `restaurantMenuService.updateFood(id, {status_id})` | PUT `/api/foods/:id` | Bật/tắt món | `Food` |
| `foodService.remove(id)` | `restaurantMenuService.removeFood(id)` | DELETE `/api/foods/:id` | Xóa món | `void` |
| **categoryService.getActive()** | `restaurantMenuService.listCategories()` | GET `/api/categories` | Danh mục hoạt động | `Category[]` |
| `categoryService.getAll()` | `restaurantMenuService.listCategories()` | GET `/api/categories` | Tất cả danh mục | `Category[]` |
| `categoryService.getById(id)` | `restaurantMenuService.getCategory(id)` | GET `/api/categories/:id` | Chi tiết danh mục | `Category` |
| **orderService.list()** | `restaurantOrderService.list()` + `.listDetails()` | GET `/api/orders` + `/api/order_details` | Danh sách đơn | `Order[]` |
| `orderService.getById(id)` | `restaurantOrderService.getById()` + details | GET `/api/orders/:id` | Chi tiết đơn | `Order` |
| `orderService.updateStatus(id, input)` | `restaurantOrderService.update(id, {status_id})` | PUT `/api/orders/:id` | Cập nhật trạng thái | `Order` |
| `orderService.reject(id, note)` | `restaurantOrderService.update(id, {status_id:9, note})` | PUT `/api/orders/:id` | Từ chối đơn | `Order` |
| **restaurantService.getDashboard()** | `restaurantProfileService.list()` | GET `/api/restaurants` | Thống kê dashboard | `RestaurantDashboard` |
| `restaurantService.list()` | `restaurantProfileService.list()` | GET `/api/restaurants` | Danh sách nhà hàng | `Restaurant[]` |
| `restaurantService.getById(id)` | `restaurantProfileService.getById(id)` | GET `/api/restaurants/:id` | Chi tiết nhà hàng | `Restaurant` |

---

## Type Mapping Examples

### Food Type Mapping
```typescript
// Backend Response (snake_case)
{
  food_id: 1,
  restaurant_id: 5,
  category_id: 3,
  name: "Phở",
  price: 45000,
  status_id: 1,
  created_at: "2026-01-15T10:30:00Z",
  updated_at: "2026-01-15T10:30:00Z"
}

// After foodMapper.toCamelCase() → Frontend Uses (camelCase)
{
  foodId: 1,
  restaurantId: 5,
  categoryId: 3,
  name: "Phở",
  price: 45000,
  status: "AVAILABLE",  // ← mapped from status_id: 1
  createdAt: "2026-01-15T10:30:00Z",
  updatedAt: "2026-01-15T10:30:00Z"
}
```

### Order Status Mapping
```typescript
// Backend: status_id (numeric)
status_id: 1   →   "PENDING" (chờ xác nhận)
status_id: 2   →   "CONFIRMED" (đã xác nhận)
status_id: 3   →   "PREPARING" (đang chuẩn bị)
status_id: 4   →   "READY_FOR_PICKUP" (sẵn sàng lấy)
status_id: 5   →   "PICKED_UP" (đã lấy)
status_id: 6   →   "DELIVERING" (đang giao)
status_id: 7   →   "COMPLETED" (hoàn thành)
status_id: 8   →   "CANCELLED" (hủy)
status_id: 9   →   "REJECTED" (từ chối)

// Frontend: OrderStatus (enum-like)
PENDING → CONFIRMED → PREPARING → READY_FOR_PICKUP → [COMPLETED|REJECTED]
```

### Input Form to API Payload
```typescript
// Frontend Form Input (from Menu page)
{
  name: "Bánh Mì",
  description: "Bánh mì nướng thơm ngon",
  price: 25000,
  categoryId: 2,
  image: "https://...",
  status: "AVAILABLE"
}

// After foodMapper.fromCreateInput() → API Payload (snake_case)
{
  restaurant_id: 1,     // ← injected from auth context
  category_id: 2,
  name: "Bánh Mì",
  description: "Bánh mì nướng thơm ngon",
  price: 25000,
  image: "https://...",
  status_id: 1          // ← AVAILABLE = 1
}
```

---

## Order Lifecycle Example

### Dashboard Display
```
restaurantService.getDashboard()
└─ Returns RestaurantDashboard:
   ├─ todayRevenue: 8,500,000đ
   ├─ todayOrderCount: 15
   ├─ pendingOrderCount: 3
   └─ completedOrderCount: 12
```

### Orders Page Flow
```
1. orderService.list()
   ├─ Fetches: GET /api/orders → Order[] (snake_case)
   ├─ Fetches: GET /api/order_details → OrderDetail[]
   ├─ Maps: orderMapper.toCamelCase() → Order[] (camelCase)
   └─ Returns: Order[] with nested details

2. OrderCard renders for each order
   ├─ Shows: orderCode, status badge, items, total
   ├─ If PENDING: Shows "Xác nhận đơn" (Confirm) button
   │  └─ Click → updateStatus(orderId, "CONFIRMED")
   │     ├─ Maps: "CONFIRMED" → status_id: 2
   │     ├─ Calls: PUT /api/orders/:id { status_id: 2 }
   │     └─ Refreshes order in list
   │
   ├─ If CONFIRMED: Shows "Bắt đầu chuẩn bị" (Start Preparing) button
   │  └─ Click → updateStatus(orderId, "PREPARING")
   │     ├─ Maps: "PREPARING" → status_id: 3
   │     └─ Calls: PUT /api/orders/:id { status_id: 3 }
   │
   ├─ If PREPARING: Shows "Sẵn sàng lấy" (Ready for Pickup) button
   │  └─ Click → updateStatus(orderId, "READY_FOR_PICKUP")
   │     ├─ Maps: "READY_FOR_PICKUP" → status_id: 4
   │     └─ Calls: PUT /api/orders/:id { status_id: 4 }
   │
   └─ If PENDING: Shows "Từ chối" (Reject) button
      └─ Click → Opens input for rejection reason
         └─ Submit → reject(orderId, note)
            ├─ Maps: status_id: 9, adds note
            └─ Calls: PUT /api/orders/:id { status_id: 9, note }

3. After each update:
   └─ Re-fetch order from orderService.getById()
      └─ Display updates realtime
```

### Menu Page Flow
```
1. Page Load
   ├─ Fetch: foodService.listMine() → Food[] (mapped camelCase)
   ├─ Fetch: categoryService.getActive() → Category[] (mapped)
   └─ Display food list + category dropdown

2. Add Food
   └─ Click "Thêm món" → Shows FoodFormModal
      ├─ Input form with name, price, category, description, image
      ├─ Submit → foodService.create(input)
      │  ├─ foodMapper.fromCreateInput() → snake_case payload
      │  ├─ POST /api/foods { restaurant_id, category_id, name, ... }
      │  ├─ Refetch list
      │  └─ Add to list

3. Edit Food
   └─ Click "Sửa" → FoodFormModal with existing data
      ├─ Pre-fill form
      ├─ Submit → foodService.update(foodId, input)
      │  ├─ foodMapper.fromCreateInput() → snake_case payload
      │  ├─ PUT /api/foods/:id { ... }
      │  ├─ Refetch single food
      │  └─ Update in list

4. Toggle Status
   └─ Click "Bật món" or "Tắt món" → foodService.updateStatus(id, status)
      ├─ Maps: "AVAILABLE" → status_id: 1, "UNAVAILABLE" → 2
      ├─ PUT /api/foods/:id { status_id: X }
      ├─ Refetch
      └─ Update badge + button text

5. Delete Food
   └─ Click "Xóa" → Confirm → foodService.remove(id)
      ├─ DELETE /api/foods/:id
      ├─ Remove from list
      └─ Refresh
```

---

## API Request/Response Examples

### GET /api/foods
**Request:**
```
GET http://localhost:3001/api/foods
```

**Response (Backend):**
```json
{
  "success": true,
  "data": [
    {
      "food_id": 1,
      "restaurant_id": 5,
      "category_id": 3,
      "name": "Phở Bò",
      "price": 45000,
      "status_id": 1,
      "created_at": "2026-01-15T10:30:00Z"
    }
  ]
}
```

**After Mapping (Frontend):**
```typescript
[
  {
    foodId: 1,
    restaurantId: 5,
    categoryId: 3,
    name: "Phở Bò",
    price: 45000,
    status: "AVAILABLE",
    createdAt: "2026-01-15T10:30:00Z",
    updatedAt: "2026-01-15T10:30:00Z"
  }
]
```

### PUT /api/orders/:id
**Request:**
```json
{
  "status_id": 2,
  "note": "Order confirmed"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Update thành công"
}
```

### POST /api/foods
**Request:**
```json
{
  "restaurant_id": 5,
  "category_id": 3,
  "name": "Cơm Tấm",
  "description": "Cơm tấm sườn nướng",
  "price": 35000,
  "image": "https://...",
  "status_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Thêm dữ liệu thành công",
  "id": 42
}
```

---

## Error Handling

### Network Error
```
Service Call: foodService.listMine()
  ↓ APIClient fails (ERR_CONNECTION_REFUSED)
  ↓ unwrapResponse() throws
  ↓ Page catches error
  ↓ Displays: "Không thể tải thực đơn"
```

### API Error
```
Response: { success: false, message: "Invalid status_id" }
  ↓ unwrapResponse() throws error
  ↓ Service catches, rethrows with message
  ↓ Page displays error message
```

### Validation Error (Frontend)
```
FoodFormModal validates:
  - name: required, non-empty
  - price: required, >= 0
  - categoryId: required
  ↓ Prevent submit if invalid
  ↓ Show validation messages
```

---

## File Structure Summary

```
services/
├── mappers.ts                    ← Data transformation
├── food.service.ts               ← Facade: 6 methods
├── category.service.ts           ← Facade: 3 methods
├── order.service.ts              ← Facade: 4 methods
├── restaurant.service.ts         ← Facade: 3 methods
├── restaurant/                   ← Underlying (don't use directly)
│   ├── menu.service.ts
│   ├── order.service.ts
│   ├── profile.service.ts
│   ├── payment.service.ts
│   ├── status.service.ts
│   └── voucher.service.ts
└── api.client.ts                 ← Axios client
```

**Total New Code:** ~330 lines across 4 facade services + mappers
**Type Safety:** 100% TypeScript strict mode
**Breaking Changes:** None (backward compatible)
