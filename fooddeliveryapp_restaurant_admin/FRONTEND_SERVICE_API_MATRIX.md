# Final Frontend Service / API Contract Audit

Audit scope: all exported API-calling methods in the current Restaurant/Admin
frontend service layer. The audit compared their paths, HTTP verbs, query
parameters, JSON/multipart bodies, response envelopes and role restrictions
with the mounted backend routers, validators, controllers/services, and
`API_ENDPOINTS_DOCUMENTATION.md`. `Frontend Endpoint` is relative to the
configured API base URL, which defaults to `http://localhost:3000/api`;
`Backend Endpoint` includes the `/api` prefix.

There are 55 API-calling methods in the service modules below. The transport
helpers in `services/api.client.ts` (`get`, `post`, `put`, `patch`, `delete`,
`unwrapResponse`, and `assertSuccess`) are not domain service methods and do
not define additional endpoints.

## Shared Authentication and Profile

| Actor | Service | Method | HTTP Method | Frontend Endpoint | Backend Endpoint | Request Params/Body | Response | Auth/Role | Status |
|---|---|---|---|---|---|---|---|---|---|
| Restaurant, Admin | `authService` | `login` | POST | `/auth/login` | `/api/auth/login` | JSON `{ email, password }` | `data: { token, expiresIn, user }`; stores returned token locally | Public; backend permits any provisioned actor | PASS |
| Restaurant, Admin | `authService` | `getProfile` | GET | `/auth/me` | `/api/auth/me` | None | `data`: safe current user profile | Bearer JWT; any authenticated actor | PASS |
| Restaurant | `authService` | `updateRestaurantEmail` | PATCH | `/auth/me` | `/api/auth/me` | JSON `{ email }` only | `data`: safe updated user profile | Bearer JWT; Restaurant may update email only | PASS |
| Admin | `authService` | `updateAdminProfile` | PATCH | `/auth/me` | `/api/auth/me` | Non-empty JSON subset of `{ email, fullName }` | `data`: safe updated user profile | Bearer JWT; Admin may update email/fullName | PASS |
| Restaurant, Admin | `authService` | `changePassword` | POST | `/auth/change-password` | `/api/auth/change-password` | JSON `{ currentPassword, newPassword }` | `{ success: true, message }`; service resolves `void` | Bearer JWT; any authenticated actor | PASS |
| Restaurant, Admin | `authService` | `logout` | POST | `/auth/logout` | `/api/auth/logout` | No body | `{ success: true, message }`; service clears local token in `finally` | Bearer JWT; any authenticated actor | PASS |

## Shared Catalog and Categories

| Actor | Service | Method | HTTP Method | Frontend Endpoint | Backend Endpoint | Request Params/Body | Response | Auth/Role | Status |
|---|---|---|---|---|---|---|---|---|---|
| Restaurant, Admin | `categoryService` | `getCategories` | GET | `/categories` | `/api/categories` | None | `data`: category array | Bearer JWT; Customer, Restaurant, Admin | PASS |
| Restaurant, Admin | `categoryService` | `getCategoryById` | GET | `/categories/{id}` | `/api/categories/{id}` | Positive category `id` path parameter | `data`: one visible category | Bearer JWT; Customer, Restaurant, Admin | PASS |
| Admin | `categoryService` | `createCategory` | POST | `/categories` | `/api/categories` | JSON `{ name, description?, is_active? }` | `{ success: true, message, id }` (top-level `id`) | Bearer JWT; Admin | PASS |
| Admin | `categoryService` | `updateCategory` | PUT | `/categories/{id}` | `/api/categories/{id}` | Positive `id`; non-empty JSON subset of `{ name, description, is_active }` | `{ success: true, message }` | Bearer JWT; Admin | PASS |
| Admin | `categoryService` | `deleteCategory` | DELETE | `/categories/{id}` | `/api/categories/{id}` | Positive `id`; no body | `{ success: true, message }` | Bearer JWT; Admin | PASS |
| Restaurant, Admin | `restaurantInfoService` | `getRestaurants` | GET | `/restaurants` | `/api/restaurants` | Optional query: `q`, `categoryId`, `minPrice`, `maxPrice`, `minRating`, `isOpen`, `latitude`, `longitude`, `maxDistanceKm` | `data`: restaurant array | Bearer JWT; Customer, Restaurant, Admin | PASS |
| Restaurant, Admin | `restaurantInfoService` | `getById` | GET | `/restaurants/{id}` | `/api/restaurants/{id}` | Positive restaurant `id` path parameter | `data`: one visible restaurant | Bearer JWT; Customer, Restaurant, Admin | PASS |
| Restaurant, Admin | `restaurantInfoService` | `getCategories` | GET | `/restaurants/{id}/categories` | `/api/restaurants/{id}/categories` | Positive restaurant `id` path parameter | `data`: categories used by available foods | Bearer JWT; Customer, Restaurant, Admin | PASS |

## Restaurant Menu

| Actor | Service | Method | HTTP Method | Frontend Endpoint | Backend Endpoint | Request Params/Body | Response | Auth/Role | Status |
|---|---|---|---|---|---|---|---|---|---|
| Restaurant, Admin | `restaurantMenuService` | `listFoods` | GET | `/foods` | `/api/foods` | Optional query: `q`, `restaurantId`, `categoryId`, `minPrice`, `maxPrice` | Backend `data`: food records; frontend maps records to `Food[]` | Bearer JWT; Customer, Restaurant, Admin; Restaurant results are ownership-scoped | PASS |
| Restaurant, Admin | `restaurantMenuService` | `getFood` | GET | `/foods/{id}` | `/api/foods/{id}` | Positive food `id` path parameter | Backend `data`: one visible food record; frontend maps it to `Food` | Bearer JWT; Customer, Restaurant, Admin; Restaurant access is ownership-scoped | PASS |
| Restaurant | `restaurantMenuService` | `createFood` | POST | `/foods` | `/api/foods` | JSON required `{ category_id, name, price }`; optional `{ description, image }`; Restaurant ID is derived by backend | `{ success: true, message, id }` (top-level `id`) | Bearer JWT; active Restaurant; own Restaurant is derived from identity | PASS |
| Restaurant | `restaurantMenuService` | `updateFood` | PUT | `/foods/{id}` | `/api/foods/{id}` | Positive `id`; non-empty JSON subset of `{ name, category_id, description, price, image }` | `{ success: true, message }` | Bearer JWT; active owning Restaurant | PASS |
| Restaurant | `restaurantMenuService` | `updateFoodStatus` | PUT | `/foods/{id}` | `/api/foods/{id}` | Positive `id`; JSON `{ status_id }` using an ID from the backend status catalog | `{ success: true, message }` | Bearer JWT; active owning Restaurant | PASS |
| Restaurant | `restaurantMenuService` | `deleteFood` | DELETE | `/foods/{id}` | `/api/foods/{id}` | Positive `id`; no body | `{ success: true, message }` | Bearer JWT; active owning Restaurant | PASS |
| Restaurant | `restaurantMenuService` | `listFoodStatuses` | GET | `/food_statuses` | `/api/food_statuses` | None | `data`: legacy food-status collection; backend values include `status_id` and `status_name` | Bearer JWT; Restaurant/Admin/Customer collection read; active Restaurant required | PASS |

## Restaurant Orders

| Actor | Service | Method | HTTP Method | Frontend Endpoint | Backend Endpoint | Request Params/Body | Response | Auth/Role | Status |
|---|---|---|---|---|---|---|---|---|---|
| Restaurant | `orderService` | `list` | GET | `/orders` | `/api/orders` | Optional query `status` from documented Order statuses | Backend `data`: own order summaries; frontend maps them to `Order[]` | Bearer JWT; Restaurant or Customer; Restaurant results are ownership-scoped | PASS |
| Restaurant | `orderService` | `getById` | GET | `/orders/{id}` | `/api/orders/{id}` | Positive order `id` path parameter | Backend `data`: own order detail with items/history; frontend maps it to `Order` | Bearer JWT; Restaurant or Customer; Restaurant order ownership enforced | PASS |
| Restaurant | `orderService` | `getHistory` | GET | `/orders/{id}/history` | `/api/orders/{id}/history` | Positive order `id` path parameter | `data`: order status-history array | Bearer JWT; Restaurant or Customer; ownership enforced | PASS |
| Restaurant | `orderService` | `confirmOrder` | POST | `/orders/{id}/confirm` | `/api/orders/{id}/confirm` | Positive `id`; optional JSON `{ note }`; omitted when undefined | `data: { orderId, previousStatus, status }` | Bearer JWT; owning Restaurant | PASS |
| Restaurant | `orderService` | `rejectOrder` | POST | `/orders/{id}/reject` | `/api/orders/{id}/reject` | Positive `id`; optional JSON `{ note }`; omitted when undefined | `data: { orderId, previousStatus, status }` | Bearer JWT; owning Restaurant | PASS |
| Restaurant | `orderService` | `prepareOrder` | POST | `/orders/{id}/prepare` | `/api/orders/{id}/prepare` | Positive `id`; optional JSON `{ note }`; omitted when undefined | `data: { orderId, previousStatus, status }` | Bearer JWT; owning Restaurant | PASS |
| Restaurant | `orderService` | `markReadyForPickup` | POST | `/orders/{id}/ready-for-pickup` | `/api/orders/{id}/ready-for-pickup` | Positive `id`; optional JSON `{ note }`; omitted when undefined | `data: { orderId, previousStatus, status }` | Bearer JWT; owning Restaurant | PASS |

## Reviews and Reports

| Actor | Service | Method | HTTP Method | Frontend Endpoint | Backend Endpoint | Request Params/Body | Response | Auth/Role | Status |
|---|---|---|---|---|---|---|---|---|---|
| Restaurant | `reviewService` | `getRestaurantReviews` | GET | `/reviews/restaurant/mine` | `/api/reviews/restaurant/mine` | None | `data`: visible reviews for the authenticated Restaurant's orders | Bearer JWT; Restaurant | PASS |
| Admin | `reviewService` | `getReviews` | GET | `/reviews` | `/api/reviews` | Optional query `status`: `VISIBLE`, `HIDDEN`, or `PENDING` | `data`: review array | Bearer JWT; Admin | PASS |
| Restaurant, Admin | `reviewService` | `getReview` | GET | `/reviews/{id}` | `/api/reviews/{id}` | Positive review `id` path parameter | `data`: review detail; Restaurant receives only visible own reviews without customer ID, Admin receives detail | Bearer JWT; Restaurant ownership/visibility or Admin | PASS |
| Admin | `reviewService` | `setModerationStatus` | PATCH | `/reviews/{id}/status` | `/api/reviews/{id}/status` | Positive `id`; JSON `{ status: VISIBLE \| HIDDEN }` | `data: { reviewId, previousStatus, status }` | Bearer JWT; Admin | PASS |
| Admin | `reportService` | `getAdminSummary` | GET | `/reports/admin/summary` | `/api/reports/admin/summary` | None | `data`: backend Admin summary object | Bearer JWT; Admin | PASS |
| Admin | `reportService` | `getAdminRevenue` | GET | `/reports/admin/revenue` | `/api/reports/admin/revenue` | Optional query `from`, `to` (`YYYY-MM-DD`), `groupBy` (`day` or `month`) | `data`: array of `{ period, revenue, completed_orders }` | Bearer JWT; Admin | PASS |
| Restaurant | `reportService` | `getRestaurantRevenue` | GET | `/reports/restaurant/revenue` | `/api/reports/restaurant/revenue` | Optional query `from`, `to` (`YYYY-MM-DD`), `groupBy` (`day`, `week`, or `month`) | `data`: array of `{ period, revenue, completed_orders }` | Bearer JWT; active Restaurant; authenticated Restaurant scope | PASS |

## Images

| Actor | Service | Method | HTTP Method | Frontend Endpoint | Backend Endpoint | Request Params/Body | Response | Auth/Role | Status |
|---|---|---|---|---|---|---|---|---|---|
| Restaurant owner, Admin | `imageService` | `uploadRestaurantImage` | PUT | `/restaurants/{id}/image` | `/api/restaurants/{id}/image` | Positive `id`; multipart/form-data with exactly one file field named `image`; client leaves boundary to Fetch | `data: { image }` | Bearer JWT; owning Restaurant or Admin | PASS |
| Restaurant owner, Admin | `imageService` | `deleteRestaurantImage` | DELETE | `/restaurants/{id}/image` | `/api/restaurants/{id}/image` | Positive `id`; no body | `data: { image: null }` | Bearer JWT; owning Restaurant or Admin | PASS |
| Restaurant | `imageService` | `uploadFoodImage` | PUT | `/foods/{id}/image` | `/api/foods/{id}/image` | Positive `id`; multipart/form-data with exactly one file field named `image`; client leaves boundary to Fetch | `data: { image }` | Bearer JWT; owning Restaurant | PASS |
| Restaurant | `imageService` | `deleteFoodImage` | DELETE | `/foods/{id}/image` | `/api/foods/{id}/image` | Positive `id`; no body | `data: { image: null }` | Bearer JWT; owning Restaurant | PASS |

## Admin Management and Vouchers

| Actor | Service | Method | HTTP Method | Frontend Endpoint | Backend Endpoint | Request Params/Body | Response | Auth/Role | Status |
|---|---|---|---|---|---|---|---|---|---|
| Admin | `adminService` | `getCustomers` | GET | `/admin/customers` | `/api/admin/customers` | Optional query `q`, `status` (`ACTIVE` or `LOCKED`) | `data`: customer array | Bearer JWT; Admin | PASS |
| Admin | `adminService` | `getCustomer` | GET | `/admin/customers/{id}` | `/api/admin/customers/{id}` | Positive customer `id` path parameter | `data`: customer detail | Bearer JWT; Admin | PASS |
| Admin | `adminService` | `setCustomerStatus` | PATCH | `/admin/customers/{id}/status` | `/api/admin/customers/{id}/status` | Positive `id`; JSON `{ status: ACTIVE \| LOCKED }` | `data: { id, accountStatus }` | Bearer JWT; Admin | PASS |
| Admin | `adminService` | `getRestaurants` | GET | `/admin/restaurants` | `/api/admin/restaurants` | Optional query `q`, `status` (`PENDING`, `ACTIVE`, `REJECTED`, or `SUSPENDED`) | `data`: Restaurant array including account status | Bearer JWT; Admin | PASS |
| Admin | `adminService` | `getRestaurant` | GET | `/admin/restaurants/{id}` | `/api/admin/restaurants/{id}` | Positive Restaurant `id` path parameter | `data`: Restaurant detail | Bearer JWT; Admin | PASS |
| Admin | `adminService` | `setRestaurantStatus` | PATCH | `/admin/restaurants/{id}/status` | `/api/admin/restaurants/{id}/status` | Positive `id`; JSON `{ status }` from supported Restaurant status values; backend enforces valid transitions | `data: { restaurantId, previousStatus, status }` | Bearer JWT; Admin | PASS |
| Admin | `adminService` | `getShippers` | GET | `/admin/shippers` | `/api/admin/shippers` | Optional query `q`, `accountStatus` (`ACTIVE` or `LOCKED`), `availability` (`OFFLINE`, `ONLINE`, or `BUSY`) | `data`: Shipper array | Bearer JWT; Admin | PASS |
| Admin | `adminService` | `getShipper` | GET | `/admin/shippers/{id}` | `/api/admin/shippers/{id}` | Positive Shipper `id` path parameter | `data`: Shipper detail | Bearer JWT; Admin | PASS |
| Admin | `adminService` | `setShipperAccountStatus` | PATCH | `/admin/shippers/{id}/account-status` | `/api/admin/shippers/{id}/account-status` | Positive `id`; JSON `{ status: ACTIVE \| LOCKED }` | `data: { id, accountStatus }` | Bearer JWT; Admin | PASS |
| Admin | `adminService` | `getOrders` | GET | `/admin/orders` | `/api/admin/orders` | Optional query `q`, `status`, `from`, `to`; status/date values validated by backend | `data`: up to 500 matching order summaries | Bearer JWT; Admin | PASS |
| Admin | `adminService` | `getOrder` | GET | `/admin/orders/{id}` | `/api/admin/orders/{id}` | Positive order `id` path parameter | `data`: order detail with items, payment, delivery, and status history | Bearer JWT; Admin | PASS |
| Admin | `adminVoucherService` | `list` | GET | `/vouchers` | `/api/vouchers` | None | `data`: voucher array | Bearer JWT; Admin | PASS |
| Admin | `adminVoucherService` | `getById` | GET | `/vouchers/{id}` | `/api/vouchers/{id}` | Positive voucher `id` path parameter | `data`: voucher detail | Bearer JWT; Admin | PASS |
| Admin | `adminVoucherService` | `create` | POST | `/vouchers` | `/api/vouchers` | JSON required `{ code, discount_value, min_order_value, usage_limit, status, start_date, end_date }`; backend date validator accepts `YYYY-MM-DD HH:mm:ss` or `YYYY-MM-DDTHH:mm:ss` | `data: { voucherId }` | Bearer JWT; Admin | PASS |
| Admin | `adminVoucherService` | `replaceVoucher` | PUT | `/vouchers/{id}` | `/api/vouchers/{id}` | Positive `id`; full JSON replacement with `{ code, discount_value, min_order_value, usage_limit, status, start_date, end_date }`; backend date validator accepts `YYYY-MM-DD HH:mm:ss` or `YYYY-MM-DDTHH:mm:ss` | `data: { voucherId }` | Bearer JWT; Admin | PASS |
| Admin | `adminVoucherService` | `remove` | DELETE | `/vouchers/{id}` | `/api/vouchers/{id}` | Positive `id`; no body | `data: { voucherId }` | Bearer JWT; Admin | PASS |

## Cross-cutting Authentication Contract

- `apiClient` sends the locally stored JWT in the `Authorization: Bearer`
  header when available and omits cookie credentials. JSON requests use JSON
  bodies; `FormData` requests do not set `Content-Type` manually.
- The backend verifies stateless JWTs and resolves current user/role/status
  from the database. Logout acknowledges the request but does not revoke the
  token; the frontend discards local credentials. There is no session,
  refresh-token, revocation, or payment/GPS service in this layer.
- Restaurant ownership and Restaurant active-status requirements are enforced
  by backend route middleware/services; Admin-only APIs require Admin
  authorization. The service layer does not send a client-selected
  `restaurant_id`.

## Audit Results

### PASS

- All 55 current API-calling service methods above have a matching mounted
  backend route with the same HTTP method and path.
- Query keys and JSON/multipart fields match the backend validators and
  documented contract. Response descriptions above follow backend controller/
  service responses; no response fields are added based only on frontend
  assumptions.
- Restaurant/Admin authentication, ownership, and role scopes match the
  backend route/middleware behavior. Image upload and delete methods use the
  supported routes and multipart field `image`.
- `API_ENDPOINTS_DOCUMENTATION.md` and the mounted source agree for the
  endpoints in this matrix; no mismatch was found.

### MISMATCH

- **API documentation vs backend voucher date validator:** the frontend passes
  `start_date` and `end_date` through unchanged as strings. The backend
  validator accepts both `YYYY-MM-DD HH:mm:ss` and
  `YYYY-MM-DDTHH:mm:ss`, while `API_ENDPOINTS_DOCUMENTATION.md` documents only
  the space-separated form. This does not make the current method call an
  invalid backend request, but the written contract is narrower than the
  mounted backend behavior. No code or API documentation was changed to resolve
  this discrepancy.

### MISSING

None among the documented Restaurant/Admin application endpoints represented
by this service layer. Other mounted generic legacy lookup/entity reads (for
example individual generic lookup records and Admin-only legacy user/role
collections) are not wrapped by these services; they are outside the
Restaurant/Admin workflows in scope. Generic legacy writes that backend
resource policy rejects are intentionally not exposed.

Backend capabilities without a matching service are intentionally excluded
because they are outside the requested actors/flows or are not provided as
dedicated APIs: Customer-only registration/checkout/reviews, Shipper delivery
operations, Restaurant business-profile editing, Admin Food CRUD or Order
status mutation, and payment gateway/GPS/realtime functionality.

### ORPHAN

None. No audited frontend service method calls an endpoint absent from the
mounted backend routes.

## Conclusion

**SERVICE LAYER CONTRACT AUDIT: MISMATCH (documentation-only; all current frontend method mappings pass)**
