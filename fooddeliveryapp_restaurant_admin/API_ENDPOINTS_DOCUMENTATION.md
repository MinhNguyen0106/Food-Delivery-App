# Food Delivery Backend API Documentation

This document describes the HTTP routes mounted by the current backend source.

It is based on `src/app.js`, `src/router`, controllers, services, models,

middleware, validators, `src/swagger.js`, and `README.md`. OpenAPI is a

cross-check, not the sole source of truth.

## 1. Overview

- **Framework:** Express 5 on Node.js.

- **Base URL:** `http://localhost:<PORT>`; `PORT` defaults to `3000`. Set the

  environment variable to use a different port/host.

- **API prefix:** `/api`.

- **Authentication:** JWT bearer token, signed with HS256, issuer

  `food-delivery-backend`, audience `food-delivery-api`, lifetime 3600 seconds.

  The authenticated user subject is `sub`; current role, account status and

  actor IDs are resolved from the database on each protected request.

- **Stateless behavior:** the server does not read or write persisted login

  sessions. Logout does not revoke a token. Tokens remain valid until expiry

  or an account-status check rejects the account.

- **Actors:** Customer, Restaurant, Shipper, Admin. Registration is Customer

  only; the other account types must already be provisioned.

- **JSON response convention:** business endpoints generally return

  `{ "success": true, "data": ... }`, sometimes with a `message` or top-level

  `id`. Errors from the central handler return

  `{ "success": false, "message": "...", "error": "..." }`. Some legacy CRUD

  handlers have a different Vietnamese message shape; see section 8.

- **Swagger UI:** `/api-docs`. Its declared server URL is

  `http://localhost:3000`.

Customer catalog routes are authenticated; there is no anonymous restaurant,

category, or food listing endpoint. Static files under `/uploads/...` are

served without authentication.

### Common protected-request header

```http

Authorization: Bearer <JWT>

```

`Content-Type: application/json` is used for JSON request bodies. Image

endpoints instead require `multipart/form-data`.

## 2. Authentication APIs

### Register Customer

- **Endpoint:** `POST /api/auth/register`

- **Actor / authentication / role:** Public; no token; creates `CUSTOMER`.

- **Path/query:** none.

- **Request body:**

  ```json
  {
    "email": "person@example.com",

    "password": "at-least-8-characters",

    "fullName": "Full Name",

    "phone": "+84912345678",

    "dateOfBirth": "2000-01-31"
  }
  ```

  `dateOfBirth` is optional and may be `null`. Other keys are rejected.

- **Success:** `201`

  ```json
  {
    "success": true,

    "data": {
      "user": {
        "userId": 12,

        "customerId": 8,

        "email": "person@example.com",

        "role": "CUSTOMER",

        "fullName": "Full Name",

        "phone": "+84912345678",

        "dateOfBirth": "2000-01-31"
      }
    }
  }
  ```

- **Validation:** email syntax/maximum 150 characters; password 8–72 UTF-8

  bytes; non-empty full name up to 100 characters; phone 8–15 digits with

  optional leading `+`; date must be a valid `YYYY-MM-DD`.

- **Errors:** `400` invalid/unsupported input; `409` duplicate email or phone;

  `500` unexpected/database failure.

### Login

- **Endpoint:** `POST /api/auth/login`

- **Actor / authentication / role:** Public; no token; any provisioned actor.

- **Request body:** `{ "email": "person@example.com", "password": "..." }`.

  No other fields are accepted.

- **Success:** `200`, `data` contains `{ "token": "...", "expiresIn": 3600,

  "user": {...} }`. The `user`shape contains`userId`, `email`, `role`, and

  the linked actor profile (`customer`, `restaurant`, `shipper`, or `admin`)

  when present. `password_hash` is not returned.

- **Errors:** `400` invalid input; `401` invalid credentials;

  `403` user account locked/inactive. Login itself checks user-account status;

  a token can be issued for an ACTIVE user whose Restaurant is not ACTIVE, but

  subsequent protected requests are rejected by authentication/role middleware.

### Logout

- **Endpoint:** `POST /api/auth/logout`

- **Actor / authentication / role:** Any authenticated actor.

- **Body/path/query:** none.

- **Success:** `200` — `{ "success": true, "message": "Logged out successfully" }`.

- **Behavior:** this acknowledges client logout only; discard the token on the

  client. It remains cryptographically valid until expiration or a current

  account-status check denies it.

- **Errors:** `401` missing/invalid/expired bearer token; `403` blocked account.

### Get profile

- **Endpoint:** `GET /api/auth/me`

- **Actor / authentication / role:** Any authenticated actor.

- **Success:** `200`, `{ "success": true, "data": <safe user profile> }`.

  The profile contains `userId`, `email`, `role` and the linked profile; it

  excludes `password_hash`.

- **Errors:** `401` invalid token; `403` unavailable/inactive account.

### Update profile

- **Endpoint:** `PATCH /api/auth/me`

- **Actor / authentication / role:** Any authenticated actor; changes only

  their own account.

- **Request body:** a non-empty subset of `email`, `fullName`, `phone`,

  `dateOfBirth`. No other fields are accepted.

- **Role-specific fields:** Customer may update email, fullName, phone,

  dateOfBirth; Shipper may update email, fullName, phone; Admin may update

  email and fullName; Restaurant may update email only. Unsupported fields

  for an actor type return validation error.

- **Success:** `200`, `{ "success": true, "data": <safe updated user profile> }`.

- **Errors:** `400` invalid/unsupported fields or invalid profile value;

  `409` duplicate email/phone; `401` authentication failure; `500` unexpected

  failure.

### Change password

- **Endpoint:** `POST /api/auth/change-password`

- **Actor / authentication / role:** Any authenticated actor; changes own

  password.

- **Request body:** `{ "currentPassword": "...", "newPassword": "..." }`;

  both required and no extra keys accepted.

- **Success:** `200` — `{ "success": true, "message": "Password changed successfully." }`.

- **Errors:** `400` invalid password, unsupported/missing fields, or new

  password identical to current; `401` incorrect current password;

  `403` unavailable account; `500` unexpected failure.

- **Token behavior:** existing JWTs are not revoked after password change.

## 3. CUSTOMER APIs

All Customer APIs below require an authenticated `CUSTOMER` token, except

catalog read routes, which also permit Restaurant and Admin actors. Customer

IDs are derived from the token/database identity, not supplied in the request.

### 3.1 Restaurants

#### List restaurants

- **Method / endpoint:** `GET /api/restaurants`

- **Path/body:** none.

- **Query:** optional `q`, `categoryId`, `minPrice`, `maxPrice`, `minRating`,

  `isOpen`, `latitude`, `longitude`, `maxDistanceKm`.

- **Success:** `200`, `{ success: true, data: [...] }`. Items contain

  `restaurant_id`, `name`, `address`, `phone`, `description`, `latitude`,

  `longitude`, `image`, `opening_time`, `closing_time`, `status`, `is_open`,

  `rating_average`; `distance_km` is included when latitude/longitude are

  supplied.

- **Behavior:** Customer results are limited to ACTIVE restaurants.

  `categoryId`/price filters require available foods in an active category;

  rating uses visible reviews (including legacy reviews previously marked
  PENDING). Latitude and longitude must be supplied

  together; `maxDistanceKm` requires both.

- **Errors:** `400` malformed/out-of-range filters; `401` missing/invalid

  token; `403` role/account not permitted; `500` unexpected failure.

#### Get restaurant detail

- **Method / endpoint:** `GET /api/restaurants/{id}`

- **Path:** `id` positive integer.

- **Success:** `200`, same restaurant fields as the list item.

- **Ownership/visibility:** Customer sees ACTIVE restaurants; Restaurant sees

  only its own record; Admin can see records of any status.

- **Errors:** `400` invalid ID; `401` authentication failure; `403` forbidden;

  `404` not found/not visible.

### 3.2 Categories

#### List categories

- **Method / endpoint:** `GET /api/categories`

- **Success:** `200`, category array with `category_id`, `name`,

  `description`, `is_active`, `created_at`.

- **Visibility:** Customer and Restaurant see active categories only; Admin

  can also see inactive categories.

- **Role:** Customer, Restaurant, Admin.

#### Get category

- **Method / endpoint:** `GET /api/categories/{id}`

- **Path:** positive integer `id`.

- **Success:** `200`, one category using the fields above.

- **Visibility:** same active-only rule as the list.

- **Errors:** `400`, `401`, `403`, `404`, `500` as applicable.

#### List categories used by a restaurant

- **Method / endpoint:** `GET /api/restaurants/{id}/categories`

- **Path:** positive integer restaurant `id`.

- **Success:** `200`, array of `{ category_id, name, description }`.

- **Visibility:** only categories used by available foods in an active category;

  Customer sees only ACTIVE restaurants. A Restaurant actor is scoped to its

  own restaurant.

- **Role:** Customer, Restaurant, Admin.

- **Errors:** `400`, `401`, `403`, `404`, `500`.

### 3.3 Foods

#### List foods

- **Method / endpoint:** `GET /api/foods`

- **Query:** optional `q`, `restaurantId`, `categoryId`, `minPrice`, `maxPrice`.

- **Success:** `200`, array of food items including `food_id`,

  `restaurant_id`, `restaurant_name`, `category_id`, `category_name`, `name`,

  `description`, `price`, `image`, `status`, `created_at`, `updated_at`.

- **Visibility:** Customer sees only AVAILABLE food from ACTIVE restaurants

  and active categories. Restaurant results are scoped to that Restaurant.

  Admin can inspect all matched records.

- **Errors:** `400`, `401`, `403`, `500`.

#### Get food

- **Method / endpoint:** `GET /api/foods/{id}`

- **Path:** positive integer `id`.

- **Success:** `200`, one food item using the list fields.

- **Visibility:** same role/availability rules as the list; Restaurant is

  scoped to its own food.

- **Errors:** `400`, `401`, `403`, `404`, `500`.

### 3.4 Addresses

All address routes are Customer-only and scoped to the authenticated Customer.

#### List addresses

- **Method / endpoint:** `GET /api/addresses`

- **Success:** `200`, `{ success: true, data: [...] }`; each row is an owned

  address record.

#### Create address

- **Method / endpoint:** `POST /api/addresses`

- Each Customer can save at most three addresses. Creating a fourth address
  returns `409` with error code `ADDRESS_LIMIT_REACHED`; updating existing
  addresses is still allowed.

- **Body:** required `address_name`, `receiver_name`, `receiver_phone`,

  `full_address`, `latitude`, `longitude`; optional `note`, `is_default`.

- **Success:** `201`, `{ success: true, data: <created address> }`.

- **Validation:** text lengths: address/receiver 100, phone 20,

  full address/note 255; phone 8–15 digits optionally prefixed by `+`;

  latitude -90..90; longitude -180..180; `is_default` boolean or 0/1.

#### Get, update, delete address

- **Methods / endpoints:** `GET /api/addresses/{id}`,

  `PUT /api/addresses/{id}`, `DELETE /api/addresses/{id}`.

- **Path:** positive integer `id`.

- **Update body:** non-empty subset of the create fields; unsupported fields

  rejected.

- **Success:** GET/PUT `200` with `{success:true,data:...}`; DELETE `200` with

  `{success:true,message:"Address deleted"}`.

- **Ownership:** another Customer's address is not exposed and returns `404`.

- **Errors:** `400` invalid ID/body; `401` authentication failure; `403` wrong

  role; `404` missing/not owned; `409` address is referenced by an order and

  cannot be deleted; `500` unexpected failure.

### 3.5 Cart

#### Get cart

- **Method / endpoint:** `GET /api/carts`

- **Success:** `200`, `{success:true,data:{cart_id,customer_id,restaurant_id,items,subtotal}}`.

  Items include `cart_item_id`, `food_id`, `food_name`, `quantity`,

  `unit_price`, `subtotal`, `image`, `food_status`, `food_restaurant_id`.

  Calling this route initializes an empty cart when needed.

#### Clear cart

- **Method / endpoint:** `DELETE /api/carts`

- **Body:** none.

- **Success:** `200`, `{success:true,data:<current empty cart or null>}`.

#### Add item

- **Method / endpoint:** `POST /api/cart_items`

- **Body:** `{ "food_id": 1, "quantity": 2 }`; both positive 32-bit integers.

- **Success:** `200`, returns the updated cart shape above.

- **Behavior:** price/restaurant come from the database; food must be

  AVAILABLE, its restaurant ACTIVE and its category active. One cart cannot

  contain food from different restaurants.

#### Update item quantity

- **Method / endpoint:** `PATCH /api/cart_items/{id}`

- **Path:** positive integer cart item ID.

- **Body:** `{ "quantity": 2 }`, positive 32-bit integer.

- **Success:** `200`, updated cart.

- **Ownership:** cart item must belong to the authenticated Customer.

#### Remove item

- **Method / endpoint:** `DELETE /api/cart_items/{id}`

- **Path:** positive integer cart item ID; no body.

- **Success:** `200`, updated cart.

- **Errors for cart operations:** `400` invalid body/ID; `401` token error;

  `403` wrong role; `404` item not found/not owned; `409` unavailable food,

  mixed-restaurant cart, or empty-cart conflict where applicable; `500`

  unexpected failure.

### 3.6 Checkout

- **Method / endpoint:** `POST /api/orders/checkout`

- **Actor / authentication:** Customer only.

- **Body:** required `address_id`; optional `note` (string, max 255) and

  `voucher_code` (non-empty string, max 50). No client-calculated amount or

  status fields are accepted.

- **Success:** `201`:

  ```json
  {
    "success": true,

    "data": {
      "orderId": 14,

      "orderCode": "FD...",

      "subtotal": 100,

      "deliveryFee": 10,

      "discount": 0,

      "totalAmount": 110,

      "paymentMethod": "COD",

      "voucherCode": null
    }
  }
  ```

- **Server calculations:** food prices, subtotal, distance-based delivery

  fee, discount and total are calculated by the backend. Address must belong

  to the Customer. Cart items must be available and from one active/open

  restaurant. Successful checkout creates the order, order details, pending

  COD payment, delivery, history record and clears the cart in a transaction.

- **Errors:** `400` invalid fields; `401` authentication failure; `403` wrong

  actor; `404` address not found/not owned; `409` empty cart, unavailable

  food/restaurant, closed restaurant, restaurant mismatch, or invalid/

  expired/inactive/exhausted voucher; `500` configuration or unexpected error.

### 3.7 Orders

#### List orders

- **Method / endpoint:** `GET /api/orders`

- **Query:** optional `status` from `PENDING`, `CONFIRMED`, `PREPARING`,

  `READY_FOR_PICKUP`, `PICKED_UP`, `DELIVERING`, `COMPLETED`, `CANCELLED`,

  `REJECTED`.

- **Role:** Customer or Restaurant.

- **Success:** `200`, array of order summaries.

- **Scope:** Customer's own orders or orders belonging to the authenticated

  Restaurant only.

#### Get order and status history

- **Methods / endpoints:** `GET /api/orders/{id}`,

  `GET /api/orders/{id}/history`.

- **Path:** positive integer order ID.

- **Role/ownership:** Customer who owns the order or the owning Restaurant.

- **Success:** `200`, order detail includes order fields, `items` and `history`.

  Customer detail additionally includes `payment` and `delivery`; Restaurant

  detail does not include those fields. History endpoint returns the history

  array with status, `changed_by_user_id`, note and timestamp.

- **Errors:** `400` invalid ID; `401`, `403`, `404`, `500`.

#### Order transitions

All are `POST /api/orders/{id}/<action>` with optional body `{ "note": "..." }`

(string max 255); request body may be empty. Success is `200`,

`{success:true,data:{orderId,previousStatus,status}}`.

| Endpoint | Actor | Allowed source → target |

|---|---|---|

| `POST /api/orders/{id}/confirm` | Owning Restaurant | `PENDING` → `CONFIRMED` |

| `POST /api/orders/{id}/reject` | Owning Restaurant | `PENDING` → `REJECTED` |

| `POST /api/orders/{id}/prepare` | Owning Restaurant | `CONFIRMED` → `PREPARING` |

| `POST /api/orders/{id}/ready-for-pickup` | Owning Restaurant | `PREPARING` → `READY_FOR_PICKUP` |

| `POST /api/orders/{id}/cancel` | Owning Customer | `PENDING` → `CANCELLED` |

Each transition checks ownership and current state and writes status history in

a transaction. Reject/cancel also cancels a still-requested delivery and its

pending payment.

- **Errors:** `400` invalid ID/body; `401` missing/invalid token; `403`

  incorrect role/inactive Restaurant; `404` order missing/not owned; `409`

  invalid transition; `500` missing status configuration or unexpected error.

### 3.8 Vouchers

#### List currently available vouchers

- **Method / endpoint:** `GET /api/vouchers/available`

- **Role:** Customer.

- **Success:** `200`, array of `{code,discount_value,min_order_value,start_date,end_date}`.

- **Note:** voucher redemption itself is part of checkout; there is no

  standalone voucher-apply endpoint.

### 3.9 Reviews

#### Create review

- **Method / endpoint:** `POST /api/reviews`

- **Role:** Customer.

- **Body:** required `order_id` (positive 32-bit integer) and `rating`

  (integer 1–5); optional `comment` (string/null, max 1000).

- **Success:** `201`, `{success:true,data:{reviewId,orderId,status:"VISIBLE"}}`.

- Reviews are visible immediately; Admin may hide or restore reviews that
  violate community rules.

- **Eligibility:** order must belong to this Customer and be COMPLETED; one

  review per order.

- **Errors:** `400` validation; `401`; `403`; `404` order not owned/not found;

  `409` order not completed or duplicate review; `500` configuration/database

  failure.

#### List own reviews

- **Method / endpoint:** `GET /api/reviews/mine`

- **Role:** Customer.

- **Success:** `200`, own review array; includes review ID, order ID, rating,

  comment, moderation status, dates and restaurant name.

#### List public restaurant reviews

- **Method / endpoint:** `GET /api/reviews/restaurant/{restaurantId}`

- **Role:** Customer.

- **Success:** `200`, visible reviews for the restaurant; customer identifiers
  are not returned. Previously pending reviews are also shown.

#### Get own review

- **Method / endpoint:** `GET /api/reviews/{id}`

- **Role:** Customer, owning Restaurant, or Admin.

- **Visibility:** Customer only sees their own; Restaurant sees only a VISIBLE

  review for its orders, with customer ID removed; Admin can see any review.

- **Errors:** `400`, `401`, `403`, `404`.

### 3.10 Profile / Account

Use `GET/PATCH /api/auth/me` and `POST /api/auth/change-password` in section 2.

There is no Customer-specific registration or profile endpoint beyond these.

## 4. RESTAURANT APIs

Restaurant APIs require a `RESTAURANT` token. Routes using the role middleware

(including catalog reads/writes, order processing and reports) require the

Restaurant status to be ACTIVE. Authentication rejects SUSPENDED/REJECTED

Restaurants; routes that only authenticate do not all apply the ACTIVE check.

Restaurant ownership is derived from the authenticated identity; routes do not

accept `restaurant_id` to select an owner.

### 4.1 Restaurant profile

`GET /api/auth/me` returns the safe identity/profile. `PATCH /api/auth/me` can

change email only for Restaurant accounts. The following owner-scoped endpoints
read and update the Restaurant business profile:

- `GET /api/restaurants/me`: returns the authenticated Restaurant's profile.
- `PATCH /api/restaurants/me`: accepts a non-empty subset of `name`, `address`,
  `phone`, `description`, `latitude`, `longitude`, `opening_time`, and
  `closing_time`. Opening and closing times must be supplied together; use
  `null` to clear both. Restaurant ID and status cannot be changed by this
  endpoint.
- **Ownership:** Restaurant ID is resolved from the authenticated token and
  updates additionally match the owning user ID.
- **Success:** `200`, `{success:true,data:<Restaurant profile>}`.
- **Errors:** `400` invalid/unsupported profile fields; `401` invalid token;
  `403` incorrect role or unavailable account; `404` Restaurant profile not
  found; `500` unexpected/database error.

Email and password changes continue to use `PATCH /api/auth/me` and
`POST /api/auth/change-password` from section 2.

### 4.2 Categories

Restaurant can read `GET /api/categories`, `GET /api/categories/{id}`, and

`GET /api/restaurants/{id}/categories`. Category create/update/delete require

Admin; Restaurant cannot manage shared categories.

### 4.3 Foods

- `GET /api/foods` and `GET /api/foods/{id}`: results scoped to this Restaurant.

- `POST /api/foods`: required `category_id`, `name`, `price`; optional

  `description`, `image`, `status_id`. Category must be active. Default food

  status is AVAILABLE. Allowed status names are AVAILABLE/UNAVAILABLE.

- `PUT /api/foods/{id}`: non-empty partial subset of those food fields; only

  own food. `status_id` must map to AVAILABLE/UNAVAILABLE.

- `DELETE /api/foods/{id}`: deletes own food.

- Create success: `201` `{success:true,message:"Food created",id}`. Update/delete

  success: `200` with a message.

- **Errors:** `400` invalid fields/category; `401`, `403`, `404`; `409` record

  in use; `500`.

### 4.4 Orders

Restaurant uses `GET /api/orders`, `GET /api/orders/{id}`,

`GET /api/orders/{id}/history`, and the four Restaurant order transitions

(`confirm`, `reject`, `prepare`, `ready-for-pickup`) from section 3.7.

Every order is scoped to the authenticated Restaurant.

### 4.5 Reviews

- `GET /api/reviews/restaurant/mine`: visible reviews (including legacy
  PENDING reviews) for this

  Restaurant's orders; customer ID is not included.

- `GET /api/reviews/{id}`: only a VISIBLE review belonging to an order of this

  Restaurant; customer ID is removed.

- Restaurant cannot create, edit or moderate reviews.

### 4.6 Revenue / Reports

- **Endpoint:** `GET /api/reports/restaurant/revenue`

- **Query:** optional `from`, `to` as valid `YYYY-MM-DD`; optional `groupBy`

  `day`, `week`, or `month` (defaults to `day`).

- **Success:** `200`, array of `{period,revenue,completed_orders}`.

- **Scope:** authenticated Restaurant only. Counts/revenue use completed order

  history; revenue sums order subtotal and excludes delivery fees.

- **Errors:** `400` invalid date/range/groupBy; `401`; `403`; `500`.

### 4.7 Image upload

Restaurant may update/delete its own Restaurant image and images only for its

own Foods. See section 7.

## 5. SHIPPER APIs

All routes require an authenticated `SHIPPER`. Shipper ID is resolved from

the JWT subject/current database identity.

### 5.1 Availability

- **Endpoint:** `PATCH /api/deliveries/me/status`

- **Body:** `{ "status": "ONLINE" }` or `{ "status": "OFFLINE" }`.

- **Success:** `200`, `{success:true,data:{status:"ONLINE"|"OFFLINE"}}`.

- **Behavior:** a Shipper with an active delivery cannot change availability.

  BUSY is server-controlled.

- **Errors:** `400` invalid body/status; `401`; `403`; `409` active delivery;

  `500`.

### 5.2 Available deliveries

- **Endpoint:** `GET /api/deliveries/available`

- **Success:** `200`, array containing `delivery_id`, `order_id`, `order_code`,

  `restaurant_name`, `restaurant_address`.

- **Behavior:** Shipper must be ONLINE. Only REQUESTED deliveries for

  READY_FOR_PICKUP orders with no assigned shipper are returned.

- **Errors:** `401`, `403`, `409` Shipper not ONLINE, `500`.

### 5.3 Assigned deliveries / detail

- **Endpoints:** `GET /api/deliveries/mine`,

  `GET /api/deliveries/{deliveryId}`.

- **Success:** `200`, assigned-delivery fields include delivery ID/order ID,

  delivery status/timestamps/note, order code/total/order status, restaurant

  name/address/phone and recipient name/phone/address/coordinates.

- **Scope:** own assigned delivery only; list covers ACCEPTED, PICKED_UP and

  DELIVERING statuses.

- **Errors:** `400` invalid ID; `401`; `403`; `404` not owned/not found.

### 5.4 Accept and update delivery

The following endpoints accept no request fields. An empty body is optional.

All successful transitions return `200` with `{success:true,data:{...}}`.

| Endpoint | Preconditions | Effect |

|---|---|---|

| `POST /api/deliveries/{deliveryId}/accept` | ONLINE Shipper, no active delivery, unassigned REQUESTED delivery, order READY_FOR_PICKUP | Assigns delivery; delivery becomes ACCEPTED and Shipper becomes BUSY |

| `POST /api/deliveries/{deliveryId}/pickup` | Assigned Shipper; delivery ACCEPTED; order READY_FOR_PICKUP | Delivery/order become PICKED_UP; pickup timestamp/history recorded |

| `POST /api/deliveries/{deliveryId}/start` | Assigned BUSY Shipper; delivery/order PICKED_UP | Delivery/order become DELIVERING; history recorded |

| `POST /api/deliveries/{deliveryId}/complete` | Assigned BUSY Shipper; delivery/order DELIVERING; pending COD payment | Delivery/order become COMPLETED, the COD payment is recorded as PAID for the order total, Shipper becomes ONLINE; timestamps/history recorded |

Transitions and COD/payment/order/history updates run transactionally. The

client cannot submit a shipper ID or COD amount. Errors include `400` invalid

ID/body; `401`; `403`; `404` not owned/not found; `409` unavailable delivery,

busy/not-online shipper, invalid transition, or invalid COD payment; `500`.

### 5.5 Order delivery tracking

- **Endpoint:** `GET /api/deliveries/orders/{orderId}`

- **Roles:** Customer, Restaurant, or Shipper.

- **Success:** `200`, `{order_id,order_code,order_status,delivery_status,pickup_time,delivery_time}`.

- **Ownership:** Customer's own order, Restaurant's order, or a delivery

  assigned to the Shipper.

- **Errors:** `400`, `401`, `403`, `404`.

There is no GPS/realtime endpoint or separate delivery-history endpoint.

## 6. ADMIN APIs

Every `/api/admin/...` route requires `ADMIN` authentication.

### 6.1 Customer management

- `GET /api/admin/customers`: optional `q` (name/phone/email) and `status`

  (`ACTIVE|LOCKED`); returns customer/account/profile fields.

- `GET /api/admin/customers/{id}`: detail.

- `PATCH /api/admin/customers/{id}/status`: body `{ "status": "ACTIVE" }` or

  `{ "status": "LOCKED" }`.

- Success: `200`, `{success:true,data:...}`.

- Errors: `400`, `401`, `403`, `404`, `500`.

### 6.2 Restaurant management

- `GET /api/admin/restaurants`: optional `q`, `status`

  (`PENDING|ACTIVE|REJECTED|SUSPENDED`).

- `GET /api/admin/restaurants/{id}`: detail.

- `PATCH /api/admin/restaurants/{id}/status`: body `{ "status": ... }` with

  the same four statuses. Allowed transitions: PENDING→ACTIVE/REJECTED,

  ACTIVE→SUSPENDED, SUSPENDED→ACTIVE; REJECTED has no outgoing transition.

- Success: `200`, `{success:true,data:...}`.

- Errors: `400`, `401`, `403`, `404`, `409` invalid transition, `500`.

### 6.3 Shipper management

- `GET /api/admin/shippers`: optional `q`, `accountStatus` (`ACTIVE|LOCKED`),

  `availability` (`OFFLINE|ONLINE|BUSY`).

- `GET /api/admin/shippers/{id}`: detail.

- `PATCH /api/admin/shippers/{id}/account-status`: body

  `{ "status": "ACTIVE"|"LOCKED" }`. A Shipper with an active delivery

  cannot be locked.

- Success: `200`, `{success:true,data:...}`.

- Errors: `400`, `401`, `403`, `404`, `409` active delivery/transition conflict,

  `500`.

### 6.4 Order monitoring

- `GET /api/admin/orders`: optional `q`, `status`, `from`, `to` filters.

  `status` is one of the current Order statuses; dates use `YYYY-MM-DD`.

  Returns at most the latest 500 matching orders.

- `GET /api/admin/orders/{id}`: order detail with associated items, payment,

  delivery and status history.

- Success: `200`, `{success:true,data:...}`.

- Errors: `400`, `401`, `403`, `404`, `500`.

### 6.5 Food / Category management

Admin can read the catalog and manage shared Categories (`POST /api/categories`,

`PUT /api/categories/{id}`, `DELETE /api/categories/{id}`). Category body fields

and responses are listed in section 4.2/4.3. The dedicated Food write routes

are Restaurant-only; Admin has no dedicated Food create/update/delete API.

### 6.6 Voucher management

- `GET /api/vouchers`: list all; records include `voucher_id`, `code`,

  `discount_value`, `min_order_value`, `usage_limit`, `used_count`, `status`,

  `start_date`, `end_date`.

- `POST /api/vouchers`: required body fields:

  `code`, `discount_value`, `min_order_value`, `usage_limit`, `status`,

  `start_date`, `end_date`. Code allows letters/numbers/underscore/hyphen,

  1–50 characters. Status is ACTIVE/INACTIVE/EXPIRED. Dates use

  `YYYY-MM-DD HH:mm:ss`, end must follow start.

- `GET /api/vouchers/{id}`: detail.

- `PUT /api/vouchers/{id}`: full replacement with the same required fields.

- `DELETE /api/vouchers/{id}`: remove only if unused and not linked to an order.

- Success: list/detail `200`; create `201`; update/delete `200`, each wrapped

  with `success:true,data:...`.

- Errors: `400`, `401`, `403`, `404`, `409` duplicate code, used-count limit,

  or voucher in use; `500`.

### 6.7 Review management

- `GET /api/reviews`: optional `status` (`VISIBLE|HIDDEN|PENDING`); list

  includes customer/order/restaurant association and review content.

- `GET /api/reviews/{id}`: detail.

- `PATCH /api/reviews/{id}/status`: body `{ "status": "VISIBLE"|"HIDDEN" }`.
  Reviews appear immediately after submission. Admin may hide violating reviews
  and restore them by setting `VISIBLE`.

- Success: `200`; moderation returns `{reviewId,previousStatus,status}` in data.

- Errors: `400`, `401`, `403`, `404`, `500`.

### 6.8 Reports

- `GET /api/reports/admin/summary`: `200`; returns user/customer/restaurant/

  shipper/order counts, order counts by status, orders today, total restaurant

  revenue and today's completed revenue.

- `GET /api/reports/admin/revenue`: query `from`, `to` valid `YYYY-MM-DD`;

  optional `groupBy=day|month` (default `day`). Returns an array of

  `{period,revenue,completed_orders}`. Revenue is completed-order subtotal

  and excludes delivery fees.

- Errors: `400`, `401`, `403`, `500`.

### 6.9 Other Admin APIs

`POST/GET /api/auth` profile behavior is shared with the other actors. Generic

lookup/read-only resource routes are listed separately in section 11. There is

no separately mounted restaurant registration review, Admin Food editor, or

Admin endpoint for changing order status.

## 7. IMAGE UPLOAD APIs

| Method and URL | Actor / ownership | Body / content type | Success |

|---|---|---|---|

| `PUT /api/restaurants/{id}/image` | Restaurant owner or Admin; Restaurant can only update its own image | `multipart/form-data`, exactly one file field named `image` | `200` `{success:true,data:{image:"/uploads/restaurants/..."}}` |

| `DELETE /api/restaurants/{id}/image` | Restaurant owner or Admin | No body | `200` `{success:true,data:{image:null}}` |

| `PUT /api/foods/{id}/image` | Owning Restaurant only | `multipart/form-data`, exactly one file field named `image` | `200` `{success:true,data:{image:"/uploads/foods/..."}}` |

| `DELETE /api/foods/{id}/image` | Owning Restaurant only | No body | `200` `{success:true,data:{image:null}}` |

Allowed MIME types/extensions: `image/jpeg` with `.jpg` or `.jpeg`,

`image/png` with `.png`, `image/webp` with `.webp`. Maximum size is

5 MiB; a single file is accepted and the content signature is checked.

Unsupported extension/MIME/content returns `415`; missing/malformed upload or

invalid ID returns `400`; too large returns `413`; role/ownership failure

returns `403`; missing resource `404`; unexpected storage/database failure

`500`. The returned image path is a public URL path; use it under the backend

host. `GET /uploads/...` is static and unauthenticated.

## 8. COMMON RESPONSE FORMAT

Business service/controller success responses commonly use:

```json
{ "success": true, "data": {} }
```

Some endpoints also return a top-level `message` or `id`. Do not assume all

data is an object: list endpoints return arrays, and `DELETE /api/carts` can

return `null` if no cart exists.

The central error handler returns:

```json
{
  "success": false,

  "message": "Readable error",

  "error": "ERROR_CODE"
}
```

Exceptions: older generic CRUD controllers use Vietnamese `message` strings.

Their 404 responses omit the `error` key; their database errors use

`error:"DATABASE_ERROR"`.

## 9. AUTHENTICATION / AUTHORIZATION

```text

Frontend

   ↓ Authorization: Bearer <JWT>

JWT signature/issuer/audience/expiry validation

   ↓

Database lookup by JWT sub (current role/status/actor IDs)

   ↓

Role and resource-ownership checks

   ↓

Controller → service → model/database

```

Role claims inside a client-supplied or stale token do not replace current

database authorization. Locked/inactive user accounts and suspended/rejected

Restaurants are rejected. There is no persisted-session lookup, refresh-token

API, or server-side token revocation endpoint.

## 10. ERROR CODES

These statuses are emitted by mounted routes/middleware:

| Status | Typical source |

|---|---|

| `200` | Successful read/update/delete/transition |

| `201` | Registration, creation, checkout, review |

| `400` | Validation, malformed JSON, invalid request |

| `401` | Missing/invalid/expired JWT or invalid credentials |

| `403` | Role, account status, or access restriction |

| `404` | Missing route/resource or resource not visible to actor |

| `409` | State, ownership-independent business, duplicate, or database conflict |

| `413` | Oversized JSON body or image |

| `415` | Unsupported image extension/MIME/signature |

| `500` | Unexpected/configuration/database/storage failure |

For central-handler errors, 5xx responses replace the internal message with

`Internal server error`; database details are not part of the JSON response.

Some legacy CRUD controllers log and return their own `DATABASE_ERROR` shape.

## 11. LEGACY GENERIC RESOURCE ROUTES

`src/app.js` also mounts standard CRUD routers for the resources below at

`/api/{resource}`. These routes are authenticated and pass through

`authorizeResource`. The current policy allows collection/item reads only as

shown; all generic POST/PUT/DELETE operations for these mounted resources are

blocked by the route policy (`403 FORBIDDEN`). Use the business-specific

endpoints above instead of relying on generic CRUD.

The common declared route template is:

| Method | Template | Request / response |

|---|---|---|

| `GET` | `/api/{resource}` | No body; `200 {success:true,data:[rows]}` subject to role/list restrictions below |

| `GET` | `/api/{resource}/{id}` | `id` path value; `200 {success:true,data:row}`, `403` if role/ownership check fails, or legacy 404 |

| `POST` | `/api/{resource}` | JSON body is passed toward the legacy controller, but policy blocks it with `403` |

| `PUT` | `/api/{resource}/{id}` | JSON body is passed toward the legacy controller, but policy blocks it with `403` |

| `DELETE` | `/api/{resource}/{id}` | No body; policy blocks it with `403` |

Mounted resources and GET collection policy:

| Resource | Collection GET actors | Item GET scope |

|---|---|---|

| `admins` | No collection role permitted | Owner identity check; Admin bypass is intentionally not applied to this resource |

| `customer_profiles` | Admin | Own linked profile or Admin |

| `customers` | Admin | Own Customer or Admin |

| `food_statuses` | Customer, Restaurant, Shipper, Admin | Admin only; other roles have no item-ownership rule |

| `order_details` | Admin | Own order, Restaurant's order, assigned Shipper's order, or Admin |

| `order_status_history` | Admin | Own order, Restaurant's order, assigned Shipper's order, or Admin |

| `order_statuses` | Customer, Restaurant, Shipper, Admin | Admin only; other roles have no item-ownership rule |

| `payment_methods` | Customer, Restaurant, Shipper, Admin | Admin only; other roles have no item-ownership rule |

| `payment_statuses` | Customer, Restaurant, Shipper, Admin | Admin only; other roles have no item-ownership rule |

| `payments` | Admin | Own order, Restaurant's order, assigned Shipper's order, or Admin |

| `restaurant_statuses` | Customer, Restaurant, Shipper, Admin | Admin only; other roles have no item-ownership rule |

| `restaurants` | Served by the dedicated catalog route first | Dedicated visibility rules |

| `review_statuses` | Customer, Restaurant, Shipper, Admin | Admin only; other roles have no item-ownership rule |

| `shipper_statuses` | Customer, Restaurant, Shipper, Admin | Admin only; other roles have no item-ownership rule |

| `shippers` | Admin | Own Shipper or Admin |

| `user_roles` | Admin | Admin policy |

| `user_statuses` | Admin | Admin policy |

| `users` | Admin | Same user ID, or Admin |

| `voucher_statuses` | Admin | Admin only; Customer has no item-ownership rule |

`GET /api/carts/{id}` is a mounted generic item route for the authenticated

Customer's own cart (or Admin), but the preferred cart endpoint is

`GET /api/carts`, which returns items and subtotal. Generic `PUT`/`DELETE`

on `/api/carts/{id}` are forbidden.

Generic row fields depend on the corresponding legacy model query. The

`users` legacy model explicitly selects `user_id`, `role_id`, `email`,

`status_id`, `created_at`, `updated_at` and excludes `password_hash`.

## API Documentation Issues

| Issue | Actual Backend | Swagger/OpenAPI | Impact |

|---|---|---|---|

| Generic cart item route | `/api/carts/{id}` has a mounted generic GET/PUT/DELETE router; GET is owner-scoped and PUT/DELETE are policy-blocked | `/api/carts/{id}` is removed from `paths` | Frontend cannot discover the legacy GET route in Swagger |

| Generic carts writes | Generic `POST /api/carts` and `PUT/DELETE /api/carts/{id}` exist in the router but every write is rejected by resource policy | Swagger describes generic `POST /api/carts`; the item path is omitted | Swagger does not express that collection POST is forbidden and omits the legacy item route; use `GET/DELETE /api/carts` and cart item API instead |

| Request body detail | Address, category, food, cart-item generic Swagger schemas use the broad `Record` schema in places | Validators/services accept narrower, explicit fields and required fields | Swagger does not fully communicate request constraints; this document lists source-validated bodies |

| Generic resource methods | Mounted generic CRUD routers define POST/PUT/DELETE, while resource policies block writes for the mounted generic resources | OpenAPI removes write operations for its `readOnlyResources` list, but not all policy-denied generic writes (notably generic carts) | Swagger may imply a successful write where the actual response is 403 |

| Legacy collection/item access | `/api/admins` collection is forbidden to every role; lookup-table collections can be readable by several roles while individual lookup records are Admin-only because those roles have no ownership query | Generated generic Swagger paths describe successful reads without these per-route restrictions | Frontend must follow this document's collection/item role matrix; some otherwise readable lookup tables are not individually readable to non-Admin actors |

| Role metadata | Router/middleware enforce actor roles and ownership | OpenAPI mainly declares bearer authentication and prose; it does not encode role scopes consistently | Frontend must use the role requirements in this document, not infer access from Swagger alone |
