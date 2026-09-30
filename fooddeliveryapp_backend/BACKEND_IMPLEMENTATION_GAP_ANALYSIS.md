# 1. Project Overview

## Scope and evidence

Audit chỉ bao gồm backend trong thư mục `fooddeliveryapp_backend`; không suy rộng kết luận sang Customer Mobile, Restaurant Web, Shipper Mobile hoặc Admin Web. Tài liệu nghiệp vụ [FoodDeliveryApp_Tonghop.docx](./FoodDeliveryApp_Tonghop.docx) đã được đọc toàn bộ (47 mục); [DB_Script_FoodDeliveryApp.sql](./DB_Script_FoodDeliveryApp.sql) đã được đọc toàn bộ (740 dòng); source hiện có trong `src/`, entry point và package manifest đã được rà soát.

Đây là audit tĩnh. Không chạy SQL, không gọi API để kiểm thử nghiệp vụ, không sửa hoặc tạo code, không cài package. Mọi kết luận về behavior backend bên dưới dựa trên source hiện tại. “Không tìm thấy” được ghi rõ là `NOT FOUND IN SOURCE CODE`; việc có bảng, dependency hoặc CRUD endpoint không được xem là bằng chứng rằng business feature đã hoạt động.

## Kết luận điều hành

- Project hiện có Node.js/CommonJS, Express, `mysql2`, Swagger UI và pool kết nối MySQL.
- Source có 28 models, 28 controllers, 28 routers tương ứng với 28 bảng trong SQL. Các model chỉ làm CRUD trực tiếp; 28 controller dùng chung một implementation CRUD; 28 router đăng ký cùng năm route CRUD.
- Có schema/seed hỗ trợ nhiều thực thể nghiệp vụ nhưng **không có service layer, authentication, authorization, domain validation hoặc workflow API**.
- Core flow Customer → Cart/Checkout → Order → Restaurant → Shipper → Completed → Review **chưa được triển khai end-to-end**.
- Rủi ro nghiêm trọng nhất: cấu hình DB chứa credential hard-code; API CRUD không có auth, có thể đọc dữ liệu user bao gồm `password_hash` và cho phép ghi/xóa trực tiếp.
- SQL có một số constraint hữu ích, nhưng constraint không thay thế validation/authorization nghiệp vụ. Script cũng bắt đầu bằng `DROP DATABASE IF EXISTS`, không an toàn để chạy lại trên dữ liệu cần giữ.

## Quy ước trạng thái

- **IMPLEMENTED**: business behavior có implementation đủ theo yêu cầu.
- **PARTIALLY IMPLEMENTED**: có một phần thực chất (ví dụ schema hoặc CRUD cơ bản), nhưng thiếu các điều kiện/workflow bắt buộc.
- **MISSING**: không có implementation phù hợp trong source backend.
- **IMPLEMENTED BUT INCORRECT**: có endpoint hoặc logic tương ứng nhưng có thể vi phạm quy tắc nghiệp vụ/bảo mật hoặc cho phép trạng thái không hợp lệ.

Không có core business use case nào được xác nhận là `IMPLEMENTED` đầy đủ trong source hiện tại.

# 2. Current Backend Architecture

Luồng hiện có: `server.js` → Express app → router theo bảng → controller callback → model → MySQL pool.

- `server.js` khởi động app và chọn port từ `process.env.PORT` hoặc `3000`: [server.js](./server.js).
- [src/app.js](./src/app.js) chỉ cấu hình `express.json()`, Swagger UI và mount 28 router dưới `/api/<resource>`.
- Controller nhận `req.body`/`req.params`, gọi model, rồi trả JSON; không có lớp xử lý use case/domain.
- Model dùng `mysql2` callback API và câu lệnh SELECT/INSERT/UPDATE/DELETE đơn bảng: [src/models/](./src/models).
- Kết nối được tạo trong [src/common/db.js](./src/common/db.js), dùng thông tin kết nối tĩnh trong source.
- [src/swagger.js](./src/swagger.js) sinh OpenAPI paths chung cho các resource.
- `Service`, middleware xác thực/phân quyền, validation schema, upload handler, migration framework, logger trung tâm và test suite: **NOT FOUND IN SOURCE CODE**.

`bcryptjs`, `jsonwebtoken`, `dotenv`, `cors` có trong `package.json`, nhưng không được import/sử dụng trong source backend hiện tại. Không tìm thấy cấu hình `.env`.

# 3. Current Folder Structure

Danh sách cấu trúc source hiện có (không tính `node_modules`):

```text
fooddeliveryapp_backend/
├── DB_Script_FoodDeliveryApp.sql
├── FoodDeliveryApp_Tonghop.docx
├── package.json
├── package-lock.json
├── server.js
├── uploads/                         (0 file)
└── src/
    ├── app.js
    ├── swagger.js
    ├── common/
    │   └── db.js
    ├── controllers/                 (28 CRUD controllers)
    ├── models/                      (28 CRUD models)
    └── router/                      (28 CRUD routers)
```

Các folder/module sau: `services/`, `middleware/`, `validators/` hoặc `validation/`, `config/`, `tests/`, `migrations/`, `utils/`, `jobs/` và `uploads/` có implementation: **NOT FOUND IN SOURCE CODE**. Folder `uploads/` tồn tại nhưng hiện không có file.

# 4. Database Schema Analysis

## Phạm vi schema

SQL tạo 28 bảng, gồm:

- 10 bảng danh mục/trạng thái: `user_roles`, `user_statuses`, `restaurant_statuses`, `food_statuses`, `shipper_statuses`, `order_statuses`, `payment_methods`, `payment_statuses`, `voucher_statuses`, `review_statuses`.
- 18 bảng dữ liệu: `users`, `customers`, `customer_profiles`, `admins`, `restaurants`, `shippers`, `categories`, `foods`, `addresses`, `carts`, `cart_items`, `vouchers`, `orders`, `order_details`, `order_status_history`, `payments`, `deliveries`, `reviews`.

Schema có PK/FK, unique constraints, CHECK cho một số giá/quantity/rating/date, trạng thái được seed, và trigger nhằm giới hạn một nhà hàng trong Cart. Các cột vị trí nhà hàng/địa chỉ, lịch sử trạng thái, COD, voucher, delivery và review đã được mô hình hóa. Đây là **hỗ trợ lưu trữ**, không chứng minh các use case tương ứng đã được triển khai.

## Giới hạn và bất nhất cần lưu ý

- `orders.address_id` chỉ FK tới `addresses`; DB không ràng buộc địa chỉ đó thuộc `orders.customer_id`. Tương tự, bảng `reviews` FK riêng tới Customer và Order nhưng không bảo đảm Customer của review là chủ Order. Bảng `order_details` cũng không bảo đảm món thuộc đúng Restaurant của Order.
- CHECK/unique bảo vệ các điều kiện cục bộ, nhưng không bảo vệ phép tính `subtotal + delivery_fee - discount = total_amount`, tính nhất quán payment amount, order phải có ít nhất một detail, hay thứ tự chuyển trạng thái.
- Trigger INSERT cho cart items gán restaurant khi cart chưa có restaurant và chặn mismatch; trigger UPDATE chỉ so sánh `cart_restaurant <> food_restaurant`. Vì `carts.restaurant_id` nullable, giá trị NULL làm phép so sánh thành UNKNOWN và không kích hoạt `SIGNAL`; do đó invariant một nhà hàng không được đảm bảo trong mọi nhánh update.
- `carts.customer_id` UNIQUE tạo tối đa một Cart cho mỗi Customer, nhưng schema không có cờ/archive để biểu diễn nhiều Cart lịch sử hoặc phân biệt active Cart.
- Delivery status có CHECK enum riêng, Order status nằm ở bảng tra cứu riêng; DB không đồng bộ hai state machine.
- Seed chứa password hash placeholder (comment trong SQL cũng xác nhận không phải hash production). Ví dụ dữ liệu payment của Order 3 ghi amount `142000`, trong khi Order ghi total `132000`; đây là sample-data inconsistency, không phải bằng chứng về runtime calculation.
- SQL bắt đầu bằng `DROP DATABASE IF EXISTS food_delivery_app`; chạy lại script sẽ xóa database cùng dữ liệu hiện có trước khi tạo mới.

# 5. Business Requirement → Database Mapping

Nguồn yêu cầu là các use case, BR01–BR22, FR01–FR18 và NFR01–NFR07 trong [FoodDeliveryApp_Tonghop.docx](./FoodDeliveryApp_Tonghop.docx).

| Business requirement | Database mapping thực tế | DB hỗ trợ | Gap / giới hạn |
|---|---|---|---|
| Đăng ký, đăng nhập, tài khoản, role/status (UC-C01–03, UC-R01–02, UC-S01–02, UC-A01–02; FR01–02) | `users`, `user_roles`, `user_statuses`, actor/profile tables | Email unique; password field; role/status FK | Không lưu session/token; schema không thể chứng minh hashing, login, reset/change password hay chặn LOCKED ở API. |
| Customer profile/contact | `customers`, `customer_profiles` | `user_id` và `customer_id` unique; phone unique | Avatar không có field; rule cập nhật chính chủ chỉ có thể làm ở service/API nhưng không có. |
| Restaurant discovery/profile/open hours (UC-C04, UC-R03; FR03) | `restaurants`, `restaurant_statuses`, `foods`, `categories` | Tên, địa chỉ, phone, image path, lat/lng, giờ mở/đóng, status | Không lưu rating aggregate/OPEN-CLOSED tách biệt; không có tìm kiếm/lọc/rule nhận đơn. |
| Menu, danh mục và Restaurant quản lý Food (UC-C05, UC-R04; FR04–05) | `foods`, `categories`, `food_statuses`, `restaurants` | FK và giá không âm; danh mục active flag | Không ràng buộc role Admin tạo Category/Restaurant sở hữu Food; không có kiểm tra Food AVAILABLE trong Cart/Order. |
| Cart một nhà hàng (UC-C06; FR06; BR03) | `carts`, `cart_items`, trigger | Một cart/customer; unique item/cart; quantity dương; trigger dự định chặn khác restaurant | Trigger UPDATE có nhánh NULL không chặn; không có quy trình reset Cart, cập nhật subtotal hoặc kiểm tra availability. |
| Address và checkout (UC-C07–08; FR07) | `addresses`, `orders` | Receiver/address/coordinates; Order FK tới address | Không kiểm tra địa chỉ thuộc Customer; chưa có checkout hay xác thực tọa độ. |
| Order, detail, lịch sử, hủy/tracking (UC-C08–10; FR09, FR13–14; BR06–07, BR11) | `orders`, `order_details`, `order_statuses`, `order_status_history` | Status lookup; FK; amount non-negative; order code unique | Không enforce detail tối thiểu, owner, transition, cancel policy, transactional insert hoặc tracking projection. |
| COD/payment (FR10; BR09) | `payment_methods`, `payment_statuses`, `payments` | Seed chỉ có COD; tối đa một payment/order; amount non-negative | DB vẫn cho phương thức khác nếu thêm lookup; không gắn luồng thu tiền vào hoàn tất delivery; không đối chiếu amount. |
| Delivery fee (FR08; BR08) | Restaurant/address latitude-longitude; `orders.delivery_fee` | Lưu input tọa độ và fee snapshot trên Order | Không có bảng cấu hình/công thức theo yêu cầu; không tính hay xác minh fee trong DB hoặc API. |
| Voucher (UC-A09; FR16; BR10) | `vouchers`, `voucher_statuses`, `orders.voucher_id` | Code unique; ngày hợp lệ; discount/min/usage không âm; usage_count giới hạn | Không có atomic reservation/use; không ràng buộc điều kiện áp dụng/discount với Order; API không kiểm tra trạng thái/thời hạn/minimum. |
| Shipper online, assignment, giao và history (UC-S03–06; FR12; BR13–14) | `shippers`, `shipper_statuses`, `deliveries` | Trạng thái shipper; delivery gắn order/shipper; timestamps/status enum | Không có request entity, lựa chọn Shipper online, concurrency/assignment, state synchronization hoặc history API. |
| Review và moderation (UC-C11, UC-A08; FR15; BR12, BR21) | `reviews`, `review_statuses`, `orders`, `customers` | Rating 1–5; unique order; status FK | Không enforce Order COMPLETED hoặc review owner = order owner; Admin/Restaurant permission không thuộc DB. |
| Admin quản trị và báo cáo (UC-A03–10; FR17–18) | Các bảng Category/Customer/Restaurant/Shipper/Order/Review/Voucher | Các record/status được lưu | Không có schema/report queries riêng cho dashboard; CRUD chung không có role boundary. |
| Upload ảnh (profile/restaurant/food) | `restaurants.image`, `foods.image` là chuỗi; không có avatar field | Có thể lưu chuỗi đường dẫn cho hai loại entity | Không có binary/object metadata, upload rules, file security hoặc handler. |

# 6. Business Requirement → Model Mapping

Tất cả 28 model trong [src/models/](./src/models) đều theo mẫu `getAll`, `getById`, `create`, `update`, `delete`; SELECT là `SELECT *` một bảng, không có join/domain query/transaction. Các binding bảng và khóa chính được đối chiếu với tên file/SQL:

| Nghiệp vụ / entity | Model source | Kết luận về implementation |
|---|---|---|
| User, role/status | [usersModel.js](./src/models/usersModel.js), [user_rolesModel.js](./src/models/user_rolesModel.js), [user_statusesModel.js](./src/models/user_statusesModel.js) | CRUD thô; `users` đọc toàn bộ cột, gồm `password_hash`; không có credential query. |
| Customer/profile/admin | [customersModel.js](./src/models/customersModel.js), [customer_profilesModel.js](./src/models/customer_profilesModel.js), [adminsModel.js](./src/models/adminsModel.js) | CRUD thô; không có self-service scoping/credential lifecycle. |
| Restaurant/shipper | [restaurantsModel.js](./src/models/restaurantsModel.js), [restaurant_statusesModel.js](./src/models/restaurant_statusesModel.js), [shippersModel.js](./src/models/shippersModel.js), [shipper_statusesModel.js](./src/models/shipper_statusesModel.js) | CRUD thô; không có trạng thái availability/ownership workflow. |
| Category/Food | [categoriesModel.js](./src/models/categoriesModel.js), [foodsModel.js](./src/models/foodsModel.js), [food_statusesModel.js](./src/models/food_statusesModel.js) | CRUD thô; không có filter menu/search/availability/restaurant scope. |
| Cart/address | [cartsModel.js](./src/models/cartsModel.js), [cart_itemsModel.js](./src/models/cart_itemsModel.js), [addressesModel.js](./src/models/addressesModel.js) | CRUD thô; không có operation add/update quantity, calculate subtotal, empty-cart switch hay owner query. |
| Order/history | [ordersModel.js](./src/models/ordersModel.js), [order_detailsModel.js](./src/models/order_detailsModel.js), [order_statusesModel.js](./src/models/order_statusesModel.js), [order_status_historyModel.js](./src/models/order_status_historyModel.js) | CRUD thô; không transaction, transition guard, multi-table creation hoặc history append-only. |
| Payment/delivery | [paymentsModel.js](./src/models/paymentsModel.js), [payment_methodsModel.js](./src/models/payment_methodsModel.js), [payment_statusesModel.js](./src/models/payment_statusesModel.js), [deliveriesModel.js](./src/models/deliveriesModel.js) | CRUD thô; không COD collection workflow/shipper assignment/sync state. |
| Voucher/review | [vouchersModel.js](./src/models/vouchersModel.js), [voucher_statusesModel.js](./src/models/voucher_statusesModel.js), [reviewsModel.js](./src/models/reviewsModel.js), [review_statusesModel.js](./src/models/review_statusesModel.js) | CRUD thô; không eligibility/usage lock, completed-order check, owner/moderation query. |

Model nghiệp vụ chuyên biệt có joins hoặc query/report: **NOT FOUND IN SOURCE CODE**.

# 7. Business Requirement → Controller Mapping

Có 28 controller cùng export năm thao tác `getAll`, `getById`, `create`, `update`, `delete`. Phần body của 28 file giống nhau sau dòng import model; controller đại diện là [customersController.js](./src/controllers/customersController.js). Các controller còn lại lần lượt map tên bảng sang model tương ứng, ví dụ `ordersController` → `ordersModel`, `deliveriesController` → `deliveriesModel`, `reviewsController` → `reviewsModel`.

Mapping chính:

| Business | Controllers hiện có | Đánh giá |
|---|---|---|
| Account/actor management | `usersController`, `customersController`, `customer_profilesController`, `adminsController`, `restaurantsController`, `shippersController` | Chỉ CRUD toàn bảng/theo ID; không có register/login/self profile/role workflow. |
| Discovery/catalog/menu | `restaurantsController`, `foodsController`, `categoriesController` cùng các status controllers | Không có use-case handler cho search/filter/detail/menu hoặc role quản lý Category/Food. |
| Cart/address | `cartsController`, `cart_itemsController`, `addressesController` | Không có workflow Cart/checkout/owner scope. |
| Order/payment/delivery | `ordersController`, `order_detailsController`, `order_statusesController`, `order_status_historyController`, `paymentsController`, `deliveriesController` và lookup controllers | Không có transition methods, atomic multi-table flow, assignment hay COD completion. |
| Voucher/review | `vouchersController`, `voucher_statusesController`, `reviewsController`, `review_statusesController` | Không có validation/eligibility/moderation business actions. |
| Dashboard/report | Không có controller chuyên biệt | **NOT FOUND IN SOURCE CODE**. |

Các handler chuyển nguyên `req.body` cho model trong create/update. Không có allowlist field, policy theo actor, validation hoặc domain service.

# 8. Business Requirement → Router/API Mapping

## API routes hiện có

[src/app.js](./src/app.js) mount 28 resource routers. Mỗi router có cùng năm route:

| Method | Path pattern | Behavior |
|---|---|---|
| GET | `/api/<resource>` | Đọc toàn bộ bảng (`SELECT *`) |
| GET | `/api/<resource>/:id` | Đọc theo PK |
| POST | `/api/<resource>` | Insert nguyên object trong request body |
| PUT | `/api/<resource>/:id` | Update nguyên object trong request body |
| DELETE | `/api/<resource>/:id` | Xóa record theo PK |

`<resource>` tương ứng với đủ 28 tên bảng được liệt kê tại mục 4. Router mẫu là [usersRouter.js](./src/router/usersRouter.js). Không có route chuyên biệt như `/auth/login`, `/checkout`, `/orders/:id/transition`, `/deliveries/available`, `/vouchers/validate`, `/reports` hoặc `/upload`: **NOT FOUND IN SOURCE CODE**.

## Feature Matrix

`—` nghĩa là không có layer tương ứng; các trạng thái `PARTIALLY IMPLEMENTED` thường chỉ phản ánh schema/CRUD cơ bản, không khẳng định use case đã chạy đúng.

| Feature | Business | DB | Model | Service | Controller | Middleware | Router | Validation | Auth | Authorization | Status | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Raw table CRUD scaffold | Không thay thế use case | 28 bảng | CRUD đơn bảng | NOT FOUND IN SOURCE CODE | CRUD chung | NOT FOUND IN SOURCE CODE | 5 route/bảng | Không | Không | Không | IMPLEMENTED BUT INCORRECT | P0 |
| Đăng ký Customer | UC-C01, FR01 | `users`, `customers`, `customer_profiles` | CRUD thô | NOT FOUND IN SOURCE CODE | Không có register handler | NOT FOUND IN SOURCE CODE | `/api/users`, `/api/customers` chỉ raw POST | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | PARTIALLY IMPLEMENTED | P0 |
| Login/logout/password/account | UC-C02–03, UC-R/S/A01–02; BR01–02 | users/roles/statuses | CRUD thô | NOT FOUND IN SOURCE CODE | Không có auth handler | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | MISSING | P0 |
| Customer profile/address ownership | UC-C03, C07; FR07 | profile/address | CRUD thô | NOT FOUND IN SOURCE CODE | CRUD chung | NOT FOUND IN SOURCE CODE | resource CRUD | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | PARTIALLY IMPLEMENTED | P0 |
| Restaurant discovery/search/filter | UC-C04; FR03 | restaurants/status/coordinates | CRUD thô | NOT FOUND IN SOURCE CODE | CRUD chung | NOT FOUND IN SOURCE CODE | `GET /api/restaurants` raw | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | PARTIALLY IMPLEMENTED | P1 |
| Menu/Food search/detail | UC-C05; FR04 | foods/categories/statuses | CRUD thô | NOT FOUND IN SOURCE CODE | CRUD chung | NOT FOUND IN SOURCE CODE | `/api/foods`, `/api/categories` CRUD | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | PARTIALLY IMPLEMENTED | P1 |
| Admin category management | UC-A03; BR16 | categories/is_active | CRUD thô | NOT FOUND IN SOURCE CODE | CRUD chung | NOT FOUND IN SOURCE CODE | `/api/categories` CRUD | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | PARTIALLY IMPLEMENTED | P1 |
| Restaurant-owned Food management | UC-R04; BR05, BR15 | foods/restaurants/status | CRUD thô | NOT FOUND IN SOURCE CODE | CRUD chung | NOT FOUND IN SOURCE CODE | `/api/foods` CRUD | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | IMPLEMENTED BUT INCORRECT | P0 |
| Cart operations and pricing | UC-C06; FR06; BR03, BR05 | carts/cart_items + trigger | CRUD thô | NOT FOUND IN SOURCE CODE | CRUD chung | NOT FOUND IN SOURCE CODE | cart CRUD | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | PARTIALLY IMPLEMENTED | P1 |
| Address management/selection | UC-C07; FR07; BR07 | addresses/coordinates | CRUD thô | NOT FOUND IN SOURCE CODE | CRUD chung | NOT FOUND IN SOURCE CODE | `/api/addresses` CRUD | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | PARTIALLY IMPLEMENTED | P1 |
| Checkout/order creation | UC-C08; FR09; BR04–10 | orders/details/payments/voucher/address | CRUD đơn bảng | NOT FOUND IN SOURCE CODE | CRUD chung | NOT FOUND IN SOURCE CODE | raw order CRUD | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | IMPLEMENTED BUT INCORRECT | P0 |
| Order state machine/history/cancel | UC-C09–10, UC-R05; FR11,13–14; BR11 | status/history | CRUD thô | NOT FOUND IN SOURCE CODE | CRUD chung, unrestricted update | NOT FOUND IN SOURCE CODE | raw status/order CRUD | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | IMPLEMENTED BUT INCORRECT | P0 |
| COD payment | FR10; BR09 | payment method/status/payment | CRUD thô | NOT FOUND IN SOURCE CODE | CRUD chung | NOT FOUND IN SOURCE CODE | `/api/payments` CRUD | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | PARTIALLY IMPLEMENTED | P1 |
| Delivery-fee calculation | FR08; BR08 | coordinates + `orders.delivery_fee` | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | — | — | PARTIALLY IMPLEMENTED | P1 |
| Voucher admin/use/atomic limit | UC-A09; FR16; BR10 | vouchers/statuses | CRUD thô | NOT FOUND IN SOURCE CODE | CRUD chung | NOT FOUND IN SOURCE CODE | `/api/vouchers` CRUD | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | PARTIALLY IMPLEMENTED | P1 |
| Shipper availability/dispatch/delivery | UC-S03–06; FR12; BR13–14 | shipper statuses/deliveries | CRUD thô | NOT FOUND IN SOURCE CODE | CRUD chung | NOT FOUND IN SOURCE CODE | raw CRUD | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | PARTIALLY IMPLEMENTED | P1 |
| Review create/eligibility/moderation | UC-C11, UC-A08; FR15; BR12,21 | reviews/status/order | CRUD thô | NOT FOUND IN SOURCE CODE | CRUD chung | NOT FOUND IN SOURCE CODE | `/api/reviews` CRUD | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | IMPLEMENTED BUT INCORRECT | P1 |
| Admin customer/restaurant/shipper/order management | UC-A04–07; FR17 | actor/order tables | CRUD thô | NOT FOUND IN SOURCE CODE | CRUD chung | NOT FOUND IN SOURCE CODE | resource CRUD | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | IMPLEMENTED BUT INCORRECT | P1 |
| Revenue/dashboard/statistics | UC-R06, UC-A10; FR18 | Có dữ liệu nguồn | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | — | NOT FOUND IN SOURCE CODE | — | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | MISSING | P2 |
| Image upload/file handling | NFR03, UC-C03/R03/R04 | Chỉ có một số cột path; uploads trống | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | MISSING | P2 |
| Cross-cutting validation/error policy | BR01–22, NFR01/04/05 | CHECK/FK một phần | Không | NOT FOUND IN SOURCE CODE | Inline DB errors | NOT FOUND IN SOURCE CODE | Không gắn middleware | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | NOT FOUND IN SOURCE CODE | PARTIALLY IMPLEMENTED | P0 |

# 9. Authentication & Authorization Audit

## Authentication

- Endpoint đăng ký/đăng nhập/đăng xuất/refresh/reset/change-password: **NOT FOUND IN SOURCE CODE**.
- Không có token/session middleware, JWT verification hoặc credential lookup trong source. `jsonwebtoken` và `bcryptjs` chỉ xuất hiện trong dependency manifest, chưa được dùng.
- `users.password_hash` tồn tại trong DB; SQL sample dùng placeholder string, không phải hash dùng được.
- Không có implementation chặn tài khoản `LOCKED`, kiểm tra ACTIVE, password policy, unique phone/email ở luồng đăng ký, revoke/logout hoặc reset flow.

## Authorization

- Không có middleware hoặc route-level role check cho Customer, Restaurant, Shipper, Admin.
- Không có ownership scoping (ví dụ Customer chỉ đọc address/order/review của mình; Restaurant chỉ đọc Food/Order của mình; Shipper chỉ cập nhật delivery được giao).
- Các bảng user, role, status và actor được expose bằng CRUD chung. DB role FK chỉ đảm bảo role tồn tại, không quyết định endpoint được phép gọi.
- Kết luận: Authentication **MISSING**; Authorization **MISSING**; các REST surface hiện tại không đáp ứng BR01, BR02, BR15–19.

# 10. Security Audit

| Finding | Evidence | Impact | Priority |
|---|---|---|---|
| DB username/password được hard-code trong source | [src/common/db.js](./src/common/db.js) | Lộ credential nếu source/repository/log được chia sẻ; cấu hình production không tách biệt. Giá trị cụ thể được cố ý không lặp lại trong báo cáo. | P0 |
| API không có auth/authz, gồm route quản lý user/admin | [src/app.js](./src/app.js), [src/router/usersRouter.js](./src/router/usersRouter.js) | Bất kỳ client truy cập được server có thể gọi list/read/create/update/delete trên resources; vi phạm yêu cầu phân quyền. | P0 |
| `GET /api/users` trả `SELECT *` | [src/models/usersModel.js](./src/models/usersModel.js) | Lộ cột nhạy cảm `password_hash` cùng role/status/email; controller trả nguyên result. | P0 |
| Mass assignment trên các endpoint ghi | [src/controllers/customersController.js](./src/controllers/customersController.js), các controller còn lại dùng chung body | `req.body` được chuyển thẳng sang `INSERT ... SET ?`/`UPDATE ... SET ?`; không có field allowlist. Các cột được phép ghi theo bảng có thể bị client chỉ định, kể cả field nhạy cảm nếu DB cho phép. | P0 |
| Client nhận trực tiếp `err.message` | Controller CRUD mẫu, các controller khác có cùng body | Thông tin lỗi DB/internal có thể bị lộ qua response 500. | P1 |
| Thiếu middleware phòng vệ HTTP | [src/app.js](./src/app.js) | Helmet, allowlist CORS, request rate limit và policy bảo vệ API: **NOT FOUND IN SOURCE CODE**. Dependency `cors` hiện không được dùng. | P1 |
| Không có credential policy/test evidence | `package.json`; SQL sample | Không thể xác nhận password hashing hay account status enforcement; dependency bcrypt không đồng nghĩa password đã hash. | P0 |

Không phát hiện bằng chứng SQL injection trong query PK cơ bản: `id` dùng placeholder `?`. Tuy vậy, điều này không khắc phục auth, mass assignment, disclosure hoặc các thao tác CRUD trái phép.

# 11. Image Upload/File Handling Audit

- Business document yêu cầu restaurant/Food image và nêu ảnh đại diện tài khoản; schema chỉ có `restaurants.image`, `foods.image` dạng `VARCHAR`, không có avatar field.
- `uploads/` tồn tại nhưng trống. Multer/busboy/file upload middleware, MIME/size validation, tên file an toàn, storage service, static file route, quyền upload và xóa file: **NOT FOUND IN SOURCE CODE**.
- Các router chỉ nhận JSON `express.json()`; không có multipart endpoint.
- Vì vậy image upload là **MISSING**; chuỗi `image` trong DB chỉ là chỗ có thể lưu tham chiếu, không phải upload feature.

# 12. Order State Machine Audit

SQL seed có các status `PENDING`, `CONFIRMED`, `PREPARING`, `READY_FOR_PICKUP`, `PICKED_UP`, `DELIVERING`, `COMPLETED`, `CANCELLED`, `REJECTED`; schema có `order_status_history`. Business document mô tả transition hợp lệ tại §6.3.

Trong source không có transition graph, status-specific handler, actor validation, transition transaction, optimistic locking, cancellation policy hoặc lịch sử append-only. `PUT /api/orders/:id` nhận field status tùy ý; endpoint lịch sử cho phép CRUD trực tiếp.

Kết quả:

- Lookup values/history persistence: **PARTIALLY IMPLEMENTED** (DB + CRUD).
- State machine: **MISSING**.
- Arbitrary order/status mutation qua CRUD: **IMPLEMENTED BUT INCORRECT** so với BR11/NFR04.
- DB không bắt buộc Order phải có ít nhất một Order Detail và không kiểm tra total formula/Payment amount; nhiều thao tác insert có thể để trạng thái liên quan không đồng bộ.

# 13. Delivery Flow Audit

`deliveries` có `shipper_id`, `pickup_time`, `delivery_time`, status check; `shippers` có trạng thái OFFLINE/ONLINE/BUSY. Đây mới là schema và CRUD.

Các thao tác tìm Shipper ONLINE, tạo/gửi delivery request khi READY_FOR_PICKUP, Shipper nhận/từ chối request, chống hai Shipper cùng claim, set BUSY/ONLINE, kiểm tra đúng assigned shipper, cập nhật PICKED_UP → DELIVERING → COMPLETED, cập nhật timestamp và đồng bộ Order/Payment: **NOT FOUND IN SOURCE CODE**.

Không có real-time GPS requirement trong business document; thiếu GPS **không phải gap**. Thiếu quy trình delivery nghiệp vụ/API là **PARTIALLY IMPLEMENTED** ở mức lưu record, còn end-to-end delivery là **MISSING**.

# 14. Delivery Fee Audit

Schema lưu latitude/longitude ở Restaurant/Address và `orders.delivery_fee`, phù hợp hướng biểu diễn yêu cầu §5.3. Source không có distance calculation, fee formula/config, minimum/maximum fee, địa chỉ tọa độ hợp lệ, endpoint preview fee hoặc server-side recomputation lúc checkout: **NOT FOUND IN SOURCE CODE**.

Delivery fee là **PARTIALLY IMPLEMENTED** ở mức cột lưu trữ; tính phí và bảo vệ client không tự chọn fee là **MISSING**. Không cần entity/table DeliveryFee riêng theo chính tài liệu nghiệp vụ.

# 15. Voucher Audit

DB có code unique, giá trị giảm, min order, usage limit/counter, trạng thái và start/end date, cùng CHECK một phần. Có generic voucher CRUD nhưng không có admin-only policy hoặc thao tác validate/apply.

Source không kiểm tra ACTIVE, thời gian hiện hành, min order, `used_count < usage_limit`, discount không vượt subtotal, voucher được áp dụng cho đúng Order, hoặc tăng usage counter atomically/transactionally. Không có bảo đảm rollback usage nếu tạo Order thất bại. Bởi vậy:

- Lưu/cấu hình voucher: **PARTIALLY IMPLEMENTED** (schema + CRUD).
- Áp dụng voucher vào checkout: **MISSING**.
- Enforcement giới hạn sử dụng trong tình huống đồng thời: **MISSING**.

# 16. Review Audit

Schema có rating CHECK 1–5, `order_id` UNIQUE (tối đa một Review/Order), status FK và thời gian; generic reviews CRUD được đăng ký.

Source không xác minh Order COMPLETED, review Customer có phải chủ Order, actor là Customer/Admin/Restaurant, giới hạn chỉnh sửa/xóa, hoặc admin moderation chỉ đổi status. `reviews.customer_id` và `reviews.order_id` là hai FK riêng nên DB vẫn có thể lưu Customer A đánh giá Order của Customer B. Generic update/delete cho phép thay nội dung hoặc xóa không theo rule.

Tính năng Review là **PARTIALLY IMPLEMENTED** ở mức schema/CRUD; nghiệp vụ eligibility/ownership/moderation **MISSING**, và CRUD mở rộng là **IMPLEMENTED BUT INCORRECT** so với BR12/21.

# 17. Validation Audit

- Request validation cho body, ID, email, phone, password policy, enum, numeric range, date, coordinates, file, ownership và field allowlist: **NOT FOUND IN SOURCE CODE**.
- Express app chỉ cài `express.json()`; không có validation middleware/schema.
- DB có một phần giới hạn (FK, unique, rating, giá/quantity/usage/date/status); các giới hạn này chỉ chạy lúc ghi DB và không thay thế error/validation contract API.
- Không kiểm tra yêu cầu payload rỗng, trường bắt buộc theo use case, loại actor hoặc business invariant đa bảng.
- Đánh giá: **MISSING** tại API layer; **PARTIALLY IMPLEMENTED** ở DB constraint layer.

# 18. Error Handling Audit

- Controllers bắt lỗi callback DB, ghi `console.error`, trả HTTP 500; create trả 201; get/update/delete kiểm tra trường hợp không tìm thấy và trả 404. Đây là phần xử lý cơ bản đã có trong mẫu [customersController.js](./src/controllers/customersController.js).
- Error response đưa `err.message` ra client; không có mã lỗi ổn định, mapping lỗi constraint/validation, request ID, logger cấu trúc hoặc central error middleware.
- Không có kiểm tra lỗi đầu vào trước DB; lỗi parse JSON/handler chưa được thống nhất theo response contract.
- Swagger không khớp hoàn toàn response thực tế: POST được khai báo 200 và schema `{id}`, trong khi controller trả 201 và `{success, message, id}`; docs cũng bỏ sót một số 404. Tham chiếu [src/swagger.js](./src/swagger.js) và controller mẫu.
- Đánh giá: **PARTIALLY IMPLEMENTED**, cần chuẩn hóa trước khi frontend phụ thuộc contract.

# 19. Missing Folders / Missing Architecture Components

| Component | Current Status | Reason Needed | Recommendation | Priority |
|---|---|---|---|---|
| Service/domain layer | NOT FOUND IN SOURCE CODE | Business flow gồm nhiều bảng, quyền và transaction; controller CRUD không thể đảm bảo invariant. | Thêm service theo use case: Auth, Cart/Checkout, Order, Delivery, Voucher, Review, Admin. | P0 |
| Authentication middleware | NOT FOUND IN SOURCE CODE | BR01–02/NFR01 yêu cầu xác thực và chặn account LOCKED. | Xác minh token/session, user active, lỗi auth thống nhất. | P0 |
| Authorization/ownership middleware | NOT FOUND IN SOURCE CODE | Actor chỉ được thao tác chức năng/dữ liệu thuộc quyền; chống IDOR. | Role policy + ownership checks trong service/query; deny-by-default. | P0 |
| Request validators/DTO | NOT FOUND IN SOURCE CODE | Body thô có thể bỏ qua required/business fields hoặc update field nhạy cảm. | Schema validation và allowlist riêng theo use case. | P0 |
| Central error middleware | NOT FOUND IN SOURCE CODE | Response lỗi lộ `err.message`, contract không đồng nhất. | Error types, stable codes, production-safe response, centralized logging. | P1 |
| Environment/config module | NOT FOUND IN SOURCE CODE | DB credential hiện hard-code; `dotenv` chưa sử dụng. | Đọc biến môi trường, không commit secret, cung cấp mẫu config không chứa secret. | P0 |
| Upload/storage module | NOT FOUND IN SOURCE CODE | Image columns không tiếp nhận hay kiểm tra file. | Upload handler có size/type validation; storage adapter; phân quyền. | P2 |
| DB migrations/seed separation | NOT FOUND IN SOURCE CODE | SQL khởi tạo destructive và gộp schema/sample seed. | Versioned migrations và seed riêng; backup trước migration. | P1 |
| Tests | NOT FOUND IN SOURCE CODE | Không có test scripts hoặc test files; không chứng minh contract/state/permission. | Unit/service + API integration tests với MySQL test DB. | P1 |
| Domain API documentation | PARTIALLY IMPLEMENTED | Swagger generated paths dùng schema chung và status/response khác code. | OpenAPI theo request/response thật, auth scheme và 4xx/5xx. | P2 |
| Logging/observability | NOT FOUND IN SOURCE CODE | Chỉ có `console.error`; khó truy vết order/delivery lỗi. | Structured logger, request/correlation ID, không ghi credential/token. | P2 |
| Reporting/query layer | NOT FOUND IN SOURCE CODE | Không có doanh thu/dashboard aggregate theo ngày/tháng. | Query/report service với quyền Admin/Restaurant. | P2 |

# 20. Missing Features

Các chức năng sau trong tài liệu nghiệp vụ chưa có implementation backend chuyên biệt:

1. Customer registration, login/logout, password lifecycle, locked-user enforcement và profile self-service.
2. Actor authentication/authorization và data ownership cho tất cả route.
3. Restaurant discovery/search/filter; menu/Food search; giờ OPEN/CLOSED và ngăn nhận Order ngoài giờ.
4. Business management Category chỉ dành Admin và Food chỉ thuộc Restaurant đăng nhập.
5. Cart operations (add/change/remove, availability check, subtotal, chuyển nhà hàng có xác nhận).
6. Address selection/ownership và checkout.
7. Atomic place-order flow: recheck Food, Restaurant, Address, totals, voucher, payment; insert Order + Details + Payment + Delivery/history trong transaction.
8. Delivery fee calculation dựa tọa độ.
9. Voucher eligibility/application và giới hạn lượt sử dụng có concurrency safety.
10. Restaurant order workflow accept/reject/reason/prepare/ready và doanh thu Restaurant.
11. Shipper online/offline/busy workflow, delivery request/accept, pickup, delivering, completion, lịch sử.
12. Đồng bộ Order/Delivery/Payment và COD collection khi hoàn tất.
13. Customer order tracking/history/cancel policy và Admin order monitor có filtering/joins.
14. Review eligibility/owner checks và Admin moderation.
15. Admin dashboard/reporting thống kê Order, revenue, Customer, Restaurant, Shipper.
16. File upload ảnh và account/restaurant image lifecycle.
17. Validation, error contract, integration test/security test cho business rules.

Schema tương ứng có thể đã hiện diện cho nhiều mục; danh sách này phân loại theo **behavior source**, không dựa vào sự tồn tại của table.

# 21. Incorrect / Incomplete Features

| Finding | Evidence | Classification | Consequence |
|---|---|---|---|
| CRUD endpoint được expose cho tất cả bảng, không có auth/role/ownership | [src/app.js](./src/app.js); mẫu [usersRouter.js](./src/router/usersRouter.js) | IMPLEMENTED BUT INCORRECT | Caller có thể thao tác trái vai trò/đối tượng; vi phạm BR01–02, BR15–19. |
| Users list/select trả toàn bộ columns | [usersModel.js](./src/models/usersModel.js) dùng `SELECT *`; controller trả `result` | IMPLEMENTED BUT INCORRECT | Có thể lộ `password_hash`, email và role/status. |
| Create/update nhận nguyên body | Controller mẫu [customersController.js](./src/controllers/customersController.js); các controller cùng body | IMPLEMENTED BUT INCORRECT | Không có field allowlist; dữ liệu do client chỉ định có thể ghi các cột quản trị/quan hệ. |
| Order/status có thể cập nhật trực tiếp bằng generic PUT | [ordersRouter.js](./src/router/ordersRouter.js), `ordersController`, `ordersModel` | IMPLEMENTED BUT INCORRECT | Bỏ qua transition, actor và history đồng bộ; không thể đảm bảo Order State Machine. |
| Cart update trigger có nhánh NULL không chặn mismatch | SQL trigger update, [DB script](./DB_Script_FoodDeliveryApp.sql) | IMPLEMENTED BUT INCORRECT | `restaurant_id` nullable; so sánh NULL với food restaurant không cho kết quả TRUE, nên không phát `SIGNAL`. |
| FK không đồng nhất owner và quan hệ đa bảng | SQL `orders.address_id`, `reviews.customer_id/order_id`, `order_details.food_id` | PARTIALLY IMPLEMENTED | DB cho phép address/review/food không thuộc actor/order tương ứng; cần kiểm tra service/query. |
| Order 3 sample có Payment 142000 nhưng Order total 132000 | [DB script](./DB_Script_FoodDeliveryApp.sql), seed orders/payments | IMPLEMENTED BUT INCORRECT (sample data) | Seed dữ liệu bất nhất gây sai lệch khi dùng làm kiểm thử/demo đối soát. |
| Swagger POST status/schema không khớp response controller | [src/swagger.js](./src/swagger.js), `customersController` | PARTIALLY IMPLEMENTED | Client dùng generated docs có thể nhận sai status/shape kỳ vọng. |
| SQL setup xóa DB trước khi tạo lại | [DB script](./DB_Script_FoodDeliveryApp.sql) | IMPLEMENTED BUT INCORRECT (vận hành) | Chạy lại có thể xóa dữ liệu; không phù hợp migration an toàn. |
| Có image path field nhưng không có file handling | `foods.image`, `restaurants.image`; `uploads/` trống | PARTIALLY IMPLEMENTED | Không thể upload/kiểm soát/hạn chế file qua API. |

# 22. Recommended Technologies

Khuyến nghị tận dụng dependency đang có nếu đáp ứng yêu cầu; bảng dưới là định hướng, không phải các thay đổi đã thực hiện.

| Requirement | Current Technology | Recommended Technology | Reason | Priority |
|---|---|---|---|---|
| DB credentials/config | mysql2 pool với thông tin kết nối hard-code; dotenv có nhưng chưa dùng | Environment config qua `process.env`/dotenv ở local, secret manager ở deployment | Tách secret khỏi source, hỗ trợ môi trường khác nhau; rotate credential bị lộ theo quy trình vận hành. | P0 |
| Authentication | `bcryptjs`, `jsonwebtoken` chỉ có trong package; flow NOT FOUND IN SOURCE CODE | Dùng bcryptjs để hash/verify và JWT có expiry/claim policy hoặc secure session theo kiến trúc chọn | Có dependency nhưng chưa có behavior; phải triển khai lifecycle, revoke/expiry và không expose password hash. | P0 |
| Authorization | NOT FOUND IN SOURCE CODE | Middleware/policy RBAC + ownership checks trong domain service | Đáp ứng phân quyền bốn actor và chống truy cập chéo record. | P0 |
| Domain/business layer | Controller gọi CRUD callback trực tiếp | Express controller → service/use case → model/repository | Cô lập rule, giao dịch, kiểm tra trạng thái và tái sử dụng logic. | P0 |
| Input validation | Chỉ có `express.json()`; validator NOT FOUND IN SOURCE CODE | Zod hoặc express-validator theo schema request | Validate type/required/range/enum/allowlist trước khi vào service. | P0 |
| DB access/transaction | mysql2 callback, query CRUD đơn bảng | mysql2 Promise API/connection transactions trong service; migration versioned (ví dụ Knex migrations) | Checkout/transition/voucher cần tính nguyên tử; migration an toàn hơn script DROP/recreate. | P1 |
| Upload | Không có middleware; folder uploads trống | Multer với MIME/size/filename controls; adapter local cho MVP, object storage cho production | JSON body không xử lý multipart; cần giới hạn file và kiểm soát truy cập. | P2 |
| HTTP security | Express 5; `cors` package chưa dùng; Helmet/rate-limit NOT FOUND IN SOURCE CODE | Helmet, CORS allowlist, rate limiting cho auth và public endpoints | Giảm bề mặt tấn công; không bật CORS rộng mặc định. | P1 |
| Error handling/logging | callback try-path inline, `console.error`, DB `err.message` trả client | Express central error middleware + stable error codes + structured logger | Ngăn lộ chi tiết nội bộ và cải thiện theo dõi lỗi. | P1 |
| API contract | swagger-ui-express với generic generated CRUD schema | OpenAPI mô tả domain request/response/status/auth thực tế | Đồng bộ frontend/backend và document các lỗi/permission. | P2 |
| Testing | Test runner/script không thấy trong package; test files NOT FOUND IN SOURCE CODE | Jest + Supertest; integration MySQL test DB | Kiểm chứng permission, transaction, transition, voucher race, response contract. | P1 |
| Distance fee | Tọa độ có trong MySQL; calculator NOT FOUND IN SOURCE CODE | Một service tính khoảng cách haversine (hoặc rule đã thống nhất) và fee config server-side | Công thức cần có acceptance criteria và test; không tin fee từ client. | P1 |
| Reporting | Report query NOT FOUND IN SOURCE CODE | MySQL aggregate/query service có filter ngày/tháng và quyền | Đáp ứng dashboard mà không mở rộng API CRUD chung. | P2 |

# 23. Implementation Priority

| Priority | Hạng mục | Lý do/điều kiện hoàn tất |
|---|---|---|
| P0 | Gỡ secret khỏi source và thay/rotate credential | Không để source chứa credential; config fail-fast nếu thiếu env. |
| P0 | Chặn API CRUD mở; authn/authz và record ownership | Anonymous access bị từ chối; mỗi actor chỉ thao tác route/record hợp lệ. |
| P0 | Tách fields public/private; ngăn mass assignment | User response không chứa password hash; write DTO không nhận role/status/password_hash ngoài use case cho phép. |
| P0 | Validation và business service foundation | Required fields và rule fail rõ ràng trước DB; có error response thống nhất. |
| P1 | Cart/address/checkout và transaction tạo Order | Một restaurant, món AVAILABLE, địa chỉ chính chủ, total tính server-side; persist toàn bộ liên quan nguyên tử. |
| P1 | Order transition/history/cancel | Chỉ transition đúng status/actor; history ghi append-only trong cùng transaction. |
| P1 | Delivery assignment + COD completion | Chỉ shipper phù hợp; claim không trùng; trạng thái Order/Delivery/Payment nhất quán. |
| P1 | Voucher eligibility/atomic usage và fee calculation | Kiểm tra server-side; usage limit chính xác khi request đồng thời; fee server computed. |
| P2 | Restaurant discovery/menu, image upload | Filter chỉ Restaurant/food hợp lệ; file giới hạn type/size/quyền truy cập. |
| P2 | Review moderation, Admin management, dashboard và revenue | Review completed/owner; moderation role; thống kê doanh thu loại delivery fee theo tài liệu. |
| P1 | Tests, schema/migration safety, API docs | Regression tests cho BR/NFR; không dùng destructive reset trong quy trình triển khai. |

# 24. Recommended Development Order

Roadmap này bắt đầu từ trạng thái thực tế là **schema có sẵn + generic table CRUD**, chưa có business workflow. Chưa có implementation nào trong roadmap được thực hiện bởi audit này.

1. **Foundation/security baseline**: giữ nguyên source audit làm baseline; rotate DB credential hard-code; chuyển config ra environment; thiết kế DTO/error contract; bỏ public surface CRUD nguy hiểm hoặc khóa sau auth. Thiết lập DB migration/backup trước thay đổi schema.
2. **Authentication + authorization**: triển khai Customer registration và login; password hashing; locked account checks; login cho Restaurant/Shipper/Admin theo tài khoản được cấp; role policies, ownership checks; self-profile/logout/password change. Viết tests trước khi mở các domain routes.
3. **Catalog và địa chỉ**: public discovery chỉ trả Restaurant ACTIVE/đang mở theo business rule; tìm kiếm/lọc; menu và Food AVAILABLE; Category Admin-only; Restaurant chỉ quản lý Food của mình; Customer address CRUD/select chính chủ.
4. **Cart + checkout + Order creation**: add/change/remove với cùng Restaurant và AVAILABLE; tính subtotal/discount/fee/total server-side; kiểm tra address/voucher/COD; tạo Order, details, payment, delivery request và history trong transaction; clear Cart chỉ sau commit.
5. **Restaurant order workflow + Order state machine**: PENDING accept/reject (lưu lý do), CONFIRMED → PREPARING → READY_FOR_PICKUP; transition policy và history transaction; Customer tracking/cancel/history; Restaurant order listing scoped.
6. **Shipper delivery workflow**: ONLINE/OFFLINE/BUSY; request từ READY_FOR_PICKUP; claim an toàn; assignment; PICKED_UP → DELIVERING → COMPLETED; timestamps, COD/payment state; lịch sử shipper. Không triển khai GPS realtime vì nằm ngoài phạm vi.
7. **Voucher + Review + moderation**: admin CRUD/configure; validate voucher trong transaction; review chỉ cho chủ Order COMPLETED, tối đa một; Admin ẩn/hiện không sửa nội dung; Restaurant chỉ xem review của mình.
8. **Admin/reporting và hoàn thiện**: dashboard, customer/restaurant/shipper/order management và lọc; doanh thu theo Order COMPLETED chỉ tính subtotal theo §13.1; upload an toàn nếu giao diện cần; OpenAPI, integration tests, security regression tests và deployment checks.

Mỗi phase nên có acceptance criteria theo BR/UC và API test; không coi endpoint CRUD thành công là bằng chứng use case đã hoàn tất.

# 25. Final Checklist for Coding Agent

- [ ] Đọc business rules và acceptance criteria; không coi table/CRUD là business feature.
- [ ] Gỡ/rotate credential hard-code; secrets không nằm trong code hoặc report.
- [ ] Có auth cho actor; LOCKED user bị chặn; credentials được hash và response không trả hash.
- [ ] Có role authorization và ownership check cho mọi resource read/write; đóng các CRUD endpoint không thuộc actor.
- [ ] Dùng allowlist request fields; không cho client tự gán actor ID, role, status, total, discount hay fee trái policy.
- [ ] Validate input ở API/service; DB constraints là lớp bảo vệ bổ sung, không phải validation duy nhất.
- [ ] Checkout kiểm tra Restaurant ACTIVE/open, Food AVAILABLE, Cart một Restaurant, Address chính chủ, COD và total do server tính.
- [ ] Tạo Order/Details/Payment/Delivery/History trong transaction; Cart/voucher usage chỉ thay đổi khi thành công.
- [ ] State machine chỉ chấp nhận transition được tài liệu cho phép, đúng actor; ghi history trong cùng transaction.
- [ ] Delivery claim không trùng; chỉ shipper được gán cập nhật; Order/Delivery/Payment không lệch trạng thái.
- [ ] Voucher kiểm tra ACTIVE/date/minimum/limit và xử lý đồng thời an toàn; Review yêu cầu Order COMPLETED/chính chủ.
- [ ] Error response không leak DB detail; có central handler, stable code và server-side structured logging.
- [ ] Upload nếu triển khai phải kiểm tra type/size, filename, storage và authorization; không tin file path do client gửi.
- [ ] Không chạy `DROP DATABASE` trên dữ liệu cần giữ; dùng migrations/backup và test DB riêng.
- [ ] Swagger/OpenAPI khớp method, status, response, validation errors và auth scheme.
- [ ] Có unit/API/integration tests cho permissions, ownership, SQL constraints, order transitions, voucher concurrency, COD và review rules.
- [ ] Hoàn tất NFR về bảo mật, nhất quán, hiệu năng và khả năng bảo trì; ghi rõ feature nào còn ngoài phạm vi.
