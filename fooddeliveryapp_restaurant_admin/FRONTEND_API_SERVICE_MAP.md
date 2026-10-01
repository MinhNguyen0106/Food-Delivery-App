# Frontend API Service Map

This map connects the routes actually mounted by the backend to frontend

service functions and screens. Endpoint shapes and access rules are detailed
The implemented Restaurant/Admin methods and bidirectional contract audit are
tracked in [FRONTEND_SERVICE_API_MATRIX.md](./FRONTEND_SERVICE_API_MATRIX.md).

## 1. Service Architecture

Suggested frontend structure aligned to current backend capabilities:

```text

services/

├── apiClient

├── authService

├── restaurantService

├── categoryService

├── foodService

├── addressService

├── cartService

├── orderService

├── deliveryService

├── voucherService

├── reviewService

├── adminService

├── reportService

└── imageService

```

This is a frontend organization suggestion, not a backend contract. `cartService`

may own both `/api/carts` and `/api/cart_items`; voucher redemption is performed

by `orderService.checkout`, while `voucherService` lists available/admin

vouchers. `imageService` can share multipart transport for Food and Restaurant

images. The backend has no separate payment, live tracking/GPS, refresh-token,

or restaurant-profile-edit service API.

## 2. API Client

A shared `apiClient` should own:

- Base URL from frontend environment/config; backend defaults to

  `http://localhost:3000`, overridable through `PORT` and deployment host.

- JSON request/response handling and `Content-Type: application/json`.

- Add `Authorization: Bearer <JWT>` to protected requests.

- Multipart requests without manually setting the multipart boundary.

- Common parsing of success wrappers and

  `{success:false,message,error}` errors; preserve legacy CRUD's different

  error shape.

- A 401 hook may clear local credentials and navigate to sign-in. Do not

  interpret logout success as server-side token revocation.

- Keep token handling compatible with stateless JWT: no session ID API,

  refresh endpoint, or server-side logout call that revokes tokens.

## 3. Auth Service

| Function | Method / endpoint | Auth | Request | Return |

|---|---|---|---|---|

| `registerCustomer(input)` | `POST /api/auth/register` | None | email, password, fullName, phone; optional dateOfBirth | `data.user` with user/customer IDs, email, role and profile |

| `login(email, password)` | `POST /api/auth/login` | None | email, password | `data.token`, `expiresIn`, safe actor user profile |

| `logout()` | `POST /api/auth/logout` | Any actor | No body | success/message; client must discard local token |

| `getProfile()` | `GET /api/auth/me` | Any actor | None | safe current user profile |

| `updateProfile(fields)` | `PATCH /api/auth/me` | Any actor | permitted subset of email/fullName/phone/dateOfBirth per role | updated safe user profile |

| `changePassword(currentPassword,newPassword)` | `POST /api/auth/change-password` | Any actor | currentPassword, newPassword | success/message |

Only Customer self-registration is implemented. Restaurant, Shipper and Admin

registration functions must not be added to frontend service based on this API.

## 4. Customer Services

### restaurantService

| Function | Method / endpoint | Parameters | Return | Required role |

|---|---|---|---|---|

| `getRestaurants(filters)` | `GET /api/restaurants` | Optional q, categoryId, minPrice, maxPrice, minRating, isOpen, latitude, longitude, maxDistanceKm | Restaurant list | Customer, Restaurant, Admin |

| `getRestaurantById(id)` | `GET /api/restaurants/{id}` | id | One visible Restaurant | Customer, Restaurant, Admin |

| `getRestaurantCategories(id)` | `GET /api/restaurants/{id}/categories` | restaurant id | active categories used by available food | Customer, Restaurant, Admin |

### categoryService

| Function | Method / endpoint | Parameters / body | Return | Required role |

|---|---|---|---|---|

| `getCategories()` | `GET /api/categories` | None | categories | Customer, Restaurant, Admin |

| `getCategoryById(id)` | `GET /api/categories/{id}` | id | category | Customer, Restaurant, Admin |

| `createCategory(input)` | `POST /api/categories` | name, optional description/is_active | top-level id/message | Admin |

| `updateCategory(id,input)` | `PUT /api/categories/{id}` | partial name/description/is_active | message | Admin |

| `deleteCategory(id)` | `DELETE /api/categories/{id}` | id | message | Admin |

### foodService

| Function | Method / endpoint | Parameters / body | Return | Required role |

|---|---|---|---|---|

| `getFoods(filters)` | `GET /api/foods` | Optional q, restaurantId, categoryId, minPrice, maxPrice | food list | Customer, Restaurant, Admin |

| `getFoodById(id)` | `GET /api/foods/{id}` | id | visible food | Customer, Restaurant, Admin |

| `createFood(input)` | `POST /api/foods` | required category_id/name/price; optional description/image/status_id | top-level id/message | Restaurant |

| `updateFood(id,input)` | `PUT /api/foods/{id}` | partial supported food fields | message | Owning Restaurant |

| `deleteFood(id)` | `DELETE /api/foods/{id}` | id | message | Owning Restaurant |

Customer food results are limited to AVAILABLE food in active categories of

ACTIVE Restaurants. Food prices are server data; do not send price to cart

mutation endpoints.

### addressService

| Function | Method / endpoint | Parameters / body | Return | Required role |

|---|---|---|---|---|

| `getAddresses()` | `GET /api/addresses` | None | current Customer's addresses | Customer |

| `getAddressById(id)` | `GET /api/addresses/{id}` | id | owned address | Customer |

| `createAddress(input)` | `POST /api/addresses` | address_name, receiver_name, receiver_phone, full_address, latitude, longitude; optional note/is_default | created address | Customer |

| `updateAddress(id,input)` | `PUT /api/addresses/{id}` | id and partial address fields | updated address | Customer, owner |

| `deleteAddress(id)` | `DELETE /api/addresses/{id}` | id | message | Customer, owner |

### cartService

| Function | Method / endpoint | Parameters / body | Return | Required role |

|---|---|---|---|---|

| `getCart()` | `GET /api/carts` | None | cart, items, calculated subtotal | Customer |

| `clearCart()` | `DELETE /api/carts` | None | empty cart or null | Customer |

| `addItem(foodId,quantity)` | `POST /api/cart_items` | food_id, quantity | updated cart | Customer |

| `updateItemQuantity(cartItemId,quantity)` | `PATCH /api/cart_items/{id}` | id, quantity | updated cart | Customer, item owner |

| `removeItem(cartItemId)` | `DELETE /api/cart_items/{id}` | id | updated cart | Customer, item owner |

Cart item quantity must be a positive integer. The backend obtains price and

ownership from the database. A cart is limited to one Restaurant.

### orderService

| Function | Method / endpoint | Parameters / body | Return | Required role |

|---|---|---|---|---|

| `checkout({address_id,note?,voucher_code?})` | `POST /api/orders/checkout` | only the listed values | created order ID/code, backend totals, COD and voucher code | Customer |

| `getOrders(status?)` | `GET /api/orders` | optional status query | own order list | Customer; Restaurant gets own orders |

| `getOrderById(id)` | `GET /api/orders/{id}` | id | order detail, items/history, Customer additionally payment/delivery | Customer owner or owning Restaurant |

| `getOrderHistory(id)` | `GET /api/orders/{id}/history` | id | status history array | Customer owner or owning Restaurant |

| `cancelOrder(id,note?)` | `POST /api/orders/{id}/cancel` | id, optional note | transition result | Customer, owner; only PENDING |

Do not define frontend inputs for subtotal, delivery fee, discount, final total,

payment amount, actor/customer ID, order status, or payment method during

checkout. Checkout uses COD and calculates amounts on the backend.

### voucherService

| Function | Method / endpoint | Parameters | Return | Required role |

|---|---|---|---|---|

| `getAvailableVouchers()` | `GET /api/vouchers/available` | None | active, in-period, unused voucher list | Customer |

Checkout applies the optional `voucher_code`. There is no separate preview,

validate, or apply-voucher endpoint.

### reviewService

| Function | Method / endpoint | Parameters / body | Return | Required role |

|---|---|---|---|---|

| `createReview({order_id,rating,comment?})` | `POST /api/reviews` | completed owned order, rating 1–5, optional comment | reviewId/orderId/PENDING status | Customer |

| `getMyReviews()` | `GET /api/reviews/mine` | None | own review list | Customer |

| `getReviewById(id)` | `GET /api/reviews/{id}` | id | own review | Customer, owner |

There is no customer update/delete review route. The review is for an order;

the backend resolves its Restaurant from the order. Do not send customer ID,

Restaurant ID, or moderation status.

## 5. Restaurant Services

Restaurant-facing calls share `restaurantService`, `categoryService`,

`foodService`, `orderService`, `reviewService` and `reportService`.

| Function | Method / endpoint | Request | Role / scope |

|---|---|---|---|

| `getMyProfile()` | `GET /api/auth/me` | None | Restaurant |

| `updateMyEmail(email)` | `PATCH /api/auth/me` | `{email}` | Restaurant; no Restaurant business-profile update API |

| `getMyFoods(filters)` | `GET /api/foods` | optional food filters | only own Restaurant's foods |

| `confirmOrder(id,note?)` | `POST /api/orders/{id}/confirm` | optional note | Own PENDING order |

| `rejectOrder(id,note?)` | `POST /api/orders/{id}/reject` | optional note | Own PENDING order |

| `prepareOrder(id,note?)` | `POST /api/orders/{id}/prepare` | optional note | Own CONFIRMED order |

| `markOrderReady(id,note?)` | `POST /api/orders/{id}/ready-for-pickup` | optional note | Own PREPARING order |

| `getRestaurantReviews()` | `GET /api/reviews/restaurant/mine` | None | VISIBLE reviews of own orders |

| `getRestaurantRevenue(filters)` | `GET /api/reports/restaurant/revenue` | optional from/to/groupBy day/week/month | authenticated Restaurant only |

`getRestaurantRevenue()` belongs in `reportService` if Admin and Restaurant

report calls are grouped together; it remains a Restaurant-only endpoint.

Food writes are scoped to the owner. Shared Category management is Admin-only.

Restaurant order APIs do not accept an arbitrary `restaurant_id`.

## 6. Shipper Services

### deliveryService

| Function | Method / endpoint | Parameters / body | Return | Required role |

|---|---|---|---|---|

| `setAvailability(status)` | `PATCH /api/deliveries/me/status` | ONLINE or OFFLINE | updated availability | Shipper |

| `getAvailableDeliveries()` | `GET /api/deliveries/available` | None | unassigned READY_FOR_PICKUP deliveries | ONLINE Shipper |

| `getMyDeliveries()` | `GET /api/deliveries/mine` | None | active assigned deliveries | Shipper |

| `getMyDelivery(deliveryId)` | `GET /api/deliveries/{deliveryId}` | delivery ID | assigned delivery detail | Shipper, owner |

| `acceptDelivery(deliveryId)` | `POST /api/deliveries/{deliveryId}/accept` | no body | assigned delivery result | ONLINE Shipper |

| `confirmPickup(deliveryId)` | `POST /api/deliveries/{deliveryId}/pickup` | no body | delivery/order transition result | Assigned Shipper |

| `startDelivery(deliveryId)` | `POST /api/deliveries/{deliveryId}/start` | no body | delivery/order transition result | Assigned Shipper |

| `completeDelivery(deliveryId)` | `POST /api/deliveries/{deliveryId}/complete` | no body | completed delivery/order and paid COD result | Assigned Shipper |

| `trackOrder(orderId)` | `GET /api/deliveries/orders/{orderId}` | order ID | order/delivery status/timestamps | Customer owner, owning Restaurant, or assigned Shipper |

No action accepts client-supplied shipper ID, delivery status, payment amount,

or GPS coordinate. No live-map/GPS service function is supported.

## 7. Admin Services

### adminService

| Function | Method / endpoint | Parameters / body |

|---|---|---|

| `getCustomers(filters)` | `GET /api/admin/customers` | q/status |

| `getCustomer(id)` | `GET /api/admin/customers/{id}` | customer ID |

| `setCustomerStatus(id,status)` | `PATCH /api/admin/customers/{id}/status` | ACTIVE/LOCKED |

| `getRestaurants(filters)` | `GET /api/admin/restaurants` | q/status |

| `getRestaurant(id)` | `GET /api/admin/restaurants/{id}` | restaurant ID |

| `setRestaurantStatus(id,status)` | `PATCH /api/admin/restaurants/{id}/status` | PENDING/ACTIVE/REJECTED/SUSPENDED subject to transition rules |

| `getShippers(filters)` | `GET /api/admin/shippers` | q/accountStatus/availability |

| `getShipper(id)` | `GET /api/admin/shippers/{id}` | shipper ID |

| `setShipperAccountStatus(id,status)` | `PATCH /api/admin/shippers/{id}/account-status` | ACTIVE/LOCKED |

| `getOrders(filters)` | `GET /api/admin/orders` | q/status/from/to |

| `getOrder(id)` | `GET /api/admin/orders/{id}` | order ID |

| `getVouchers()` | `GET /api/vouchers` | None |

| `getVoucher(id)` | `GET /api/vouchers/{id}` | voucher ID |

| `createVoucher(input)` | `POST /api/vouchers` | all voucher create fields |

| `replaceVoucher(id,input)` | `PUT /api/vouchers/{id}` | full voucher fields |

| `deleteVoucher(id)` | `DELETE /api/vouchers/{id}` | voucher ID |

| `getReviews(status?)` | `GET /api/reviews` | optional moderation status |

| `getReview(id)` | `GET /api/reviews/{id}` | review ID |

| `setReviewModeration(id,status)` | `PATCH /api/reviews/{id}/status` | VISIBLE/HIDDEN |

| `getCategories()` | `GET /api/categories` | includes inactive for Admin |

| `createCategory/updateCategory/deleteCategory(...)` | `POST/PUT/DELETE /api/categories...` | category fields |

### reportService

| Function | Method / endpoint | Parameters |

|---|---|---|

| `getAdminSummary()` | `GET /api/reports/admin/summary` | None |

| `getAdminRevenue(filters)` | `GET /api/reports/admin/revenue` | from/to/groupBy day or month |

Every function in this section requires Admin. Admin does not have dedicated

Food create/update/delete or arbitrary order-status mutation APIs.

## 8. Image Service

A shared `imageService` is appropriate because all four routes use the same

single multipart field (`image`), accepted JPEG/PNG/WEBP formats and 5 MiB cap.

It should accept a resource ID and `File`/`Blob`, send `multipart/form-data`,

and return the `data.image` path. It should not set a multipart boundary

manually.

| Function | Method / endpoint | Role |

|---|---|---|

| `uploadRestaurantImage(id,file)` | `PUT /api/restaurants/{id}/image` | owning Restaurant or Admin |

| `deleteRestaurantImage(id)` | `DELETE /api/restaurants/{id}/image` | owning Restaurant or Admin |

| `uploadFoodImage(id,file)` | `PUT /api/foods/{id}/image` | owning Restaurant |

| `deleteFoodImage(id)` | `DELETE /api/foods/{id}/image` | owning Restaurant |

For rendering, resolve returned `/uploads/...` paths against the configured

backend host. Static image fetching itself needs no bearer token.

## 9. Service → Screen Mapping

| Actor | Screen / page | Service | Function(s) | Endpoint |

|---|---|---|---|---|

| Public | Sign up | authService | `registerCustomer()` | `POST /api/auth/register` |

| Public | Sign in | authService | `login()` | `POST /api/auth/login` |

| Customer | Profile/account | authService | `getProfile()`, `updateProfile()`, `changePassword()` | `/api/auth/me`, `/api/auth/change-password` |

| All actors | Sign out | authService | `logout()` then clear local token | `POST /api/auth/logout` |

| Customer | Restaurant list/detail | restaurantService | `getRestaurants()`, `getRestaurantById()` | `GET /api/restaurants[/{id}]` |

| Customer | Restaurant menu/categories | restaurantService, categoryService | `getRestaurantCategories()`, `getCategories()` | `GET /api/restaurants/{id}/categories`, `GET /api/categories` |

| Customer | Food list/detail | foodService | `getFoods()`, `getFoodById()` | `GET /api/foods[/{id}]` |

| Customer | Address book | addressService | list/create/update/delete | `/api/addresses` |

| Customer | Cart | cartService | `getCart()`, `addItem()`, `updateItemQuantity()`, `removeItem()`, `clearCart()` | `/api/carts`, `/api/cart_items` |

| Customer | Checkout | addressService, voucherService, orderService | choose own address, list vouchers, `checkout()` | `GET /api/addresses`, `GET /api/vouchers/available`, `POST /api/orders/checkout` |

| Customer | Order history/detail | orderService | `getOrders()`, `getOrderById()`, `getOrderHistory()`, `cancelOrder()` | `/api/orders` |

| Customer | Review form/history | reviewService | `createReview()`, `getMyReviews()` | `POST /api/reviews`, `GET /api/reviews/mine` |

| Customer/Restaurant/Shipper | Delivery tracking status | deliveryService | `trackOrder()` | `GET /api/deliveries/orders/{orderId}` |

| Restaurant | Menu management | foodService, imageService | create/update/delete Food; upload/delete Food image | `/api/foods`, `/api/foods/{id}`, `/api/foods/{id}/image` |

| Restaurant | Incoming orders | orderService | list/get/history, confirm/reject/prepare/ready | `/api/orders` |

| Restaurant | Review dashboard | reviewService | list own visible reviews | `GET /api/reviews/restaurant/mine` |

| Restaurant | Revenue | reportService | `getRestaurantRevenue()` | `GET /api/reports/restaurant/revenue` |

| Restaurant/Admin | Restaurant image settings | imageService | upload/delete image | `/api/restaurants/{id}/image` |

| Shipper | Availability | deliveryService | `setAvailability()` | `PATCH /api/deliveries/me/status` |

| Shipper | Available jobs | deliveryService | `getAvailableDeliveries()`, `acceptDelivery()` | `/api/deliveries/available`, `/api/deliveries/{id}/accept` |

| Shipper | Active delivery | deliveryService | `getMyDeliveries()`, `getMyDelivery()`, `confirmPickup()`, `startDelivery()`, `completeDelivery()` | `/api/deliveries/mine`, `/api/deliveries/{id}/*` |

| Admin | Dashboard | reportService | `getAdminSummary()` | `GET /api/reports/admin/summary` |

| Admin | User/Restaurant/Shipper management | adminService | list/detail/set status | `/api/admin/customers`, `/api/admin/restaurants`, `/api/admin/shippers` |

| Admin | Voucher management | adminService | list/get/create/replace/delete | `/api/vouchers` |

| Admin | Review moderation | adminService | list/get/set moderation | `/api/reviews` |

| Admin | Order monitoring | adminService | `getOrders()`, `getOrder()` | `/api/admin/orders` |

| Admin | Category management | categoryService | create/update/delete | `/api/categories` |

No matching backend API is implemented for restaurant registration UI, editing

Restaurant business profile fields, Customer review edit/delete, Admin Food

CRUD, payment gateway selection, or realtime map/GPS tracking. Such screens

would be frontend-only until a backend endpoint exists; do not call a guessed

URL.

## 10. API Dependency / Flow

### Customer

```text

Register/Login

  ↓

Restaurant list → categories / foods

  ↓

Cart (food ID + quantity only)

  ↓

Owned address + optional available voucher

  ↓

Checkout (backend prices, delivery fee, discount and total; COD)

  ↓

Order list/detail/status history → delivery status polling

  ↓

Completed order → create one review → view own reviews

```

### Restaurant

```text

Login

  ↓

Own foods/categories and image management

  ↓

Own incoming orders

  ↓

PENDING → CONFIRMED → PREPARING → READY_FOR_PICKUP

  ↓

Restaurant revenue and visible reviews

```

### Shipper

```text

Login

  ↓

Set ONLINE

  ↓

Available REQUESTED delivery for READY_FOR_PICKUP order

  ↓

Accept → PICKED_UP → DELIVERING → COMPLETED

  ↓

Pending COD payment confirmed from backend order total

```

### Admin

```text

Login

  ↓

Dashboard / revenue

  ↓

Customers, Restaurants, Shippers, Orders

  ↓

Categories, Vouchers, Review moderation

```

## 11. Frontend Implementation Priority

1. `apiClient`: base URL, JWT header, multipart and error parsing.

2. `authService`: login/register/profile/password; retain local JWT until

   client logout; account status can invalidate access immediately.

3. `restaurantService`, `categoryService`, `foodService`: catalog first.

4. `addressService`: checkout requires an owned address.

5. `cartService`: cart state and server-priced quantities.

6. `voucherService`: list eligible voucher choices.

7. `orderService`: checkout and order workflow/status display.

8. `deliveryService`: Shipper work queue and Customer/Restaurant status view.

9. `reviewService`: only after order COMPLETED.

10. `adminService` and `reportService`: Admin-only screens.

11. `imageService`: shared file transport for supported Food/Restaurant image

    routes.

Priority follows route dependencies, not an assumption that every frontend

role/screen already exists.

## 12. Legacy Read APIs and Frontend Boundaries

Besides business APIs, the backend mounts generic authenticated resource

routers. Some expose read-only lookup/record data; their collection permissions

are stricter than item permissions. Generic mutation methods on these mounted

resources are blocked by access policy. The legacy `/api/carts/{id}` GET is

available for an owned cart but is not a substitute for `GET /api/carts`.

Swagger omits that item path.

Only add frontend helpers for a specific legacy read route if a screen needs

the table data (for example, `GET /api/order_statuses`); do not create a

generic CRUD helper that assumes writes are supported. Full resource/actor

mapping and Swagger mismatches are in section 11 of the API documentation.
