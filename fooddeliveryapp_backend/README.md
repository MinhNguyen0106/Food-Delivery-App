# Food Delivery Backend

## Requirements

- Node.js with support for `node:test`
- MySQL 8 using a database created for this application

## Configuration

Copy `.env.example` to `.env` and set `DB_HOST`, `DB_PORT`, `DB_USER`,
`DB_PASSWORD`, `DB_NAME`, and a private `JWT_SECRET` containing at least 32
bytes. `PORT` defaults to `3000`; `DELIVERY_FEE_PER_KM` defaults to `5000`.
`OSRM_ROUTING_URL` defaults to the public OSRM demo driving endpoint for
development. It receives restaurant and delivery-address coordinates; use an
approved/private OSRM deployment for production.
For browser clients, set `CORS_ORIGINS` to a comma-separated list of exact
frontend origins (including ports), for example
`http://localhost:8081,http://localhost:8092`. Requests without a browser
Origin header remain available to native clients and command-line tools.
Do not commit `.env`.

Provision the database using the project SQL schema only after reviewing its
contents: `DB_Script_FoodDeliveryApp.sql` drops and recreates its named database.
Never run that script against a database containing data that must be retained.

## Run

```sh
npm install
npm start
```

Interactive API documentation is available at `http://localhost:3000/api-docs`.
Protected endpoints use `Authorization: Bearer <token>` from `/api/auth/login`.
Registration creates Customer accounts; Admin and other privileged accounts
must be provisioned through the approved account-management process.

Authentication uses stateless JWTs. The server does not store login sessions
in the database, and the same account may use multiple valid tokens on
different devices. `POST /api/auth/logout` confirms the request but cannot
revoke a token; the client must delete its local token. Changing a password
does not revoke already-issued JWTs; they remain valid until expiry or until
the account becomes inactive/suspended.

## Restaurant and Food images

Restaurant owners may upload or remove their own Restaurant image; Admin may
manage Restaurant images. A Restaurant may upload or remove images only for its
own Foods. Send one `multipart/form-data` file named `image`:

```sh
curl -X PUT "http://localhost:3000/api/foods/12/image" \
  -H "Authorization: Bearer <token>" \
  -F "image=@dish.webp"
```

Supported image formats are JPEG/JPG, PNG, and WEBP, up to 5 MiB per file.
The backend checks extension, declared MIME type, and file signature, then
generates a server-side filename. Image paths are returned and stored in the
existing `foods.image` or `restaurants.image` column, for example
`/uploads/foods/1720000000000-<uuid>.webp`. The file is served from
`/uploads/...`. Use `DELETE /api/foods/:id/image` or
`DELETE /api/restaurants/:id/image` to remove the current reference and its
managed local file. Existing JSON create/update endpoints remain available.
Uploaded runtime files are ignored by Git.

## Test

```sh
npm test
```

The built-in Node test suite exercises Phase 8 validation, authorization,
central error responses, OpenAPI coverage, and a local HTTP startup/protection
smoke test. Database integration tests are skipped unless explicitly enabled.

## Scheduled delivery

After provisioning the base database and applying migrations `001` through
`003`, apply `db/migrations/004_scheduled_delivery.sql` once. It adds
15-minute slots, default capacity (4 orders), preparation time (20 minutes),
buffer (5 minutes), scheduled-order timestamps, and the `SCHEDULED` and
`PROCESSING` statuses. Tune restaurant values in `restaurant_capacities`; each
row configures a restaurant/slot template. Restaurants without an override use
those same defaults. `opening_time` and `closing_time` must be set for
scheduled delivery to be offered.

The authenticated Customer endpoints are:

- `GET /api/v1/delivery/available-slots?address_id=1&date=YYYY-MM-DD`
- `POST /api/v1/orders/schedule` with `address_id`, `date`, `slot_id`, and
  optional `note` or `voucher_code`

Slot timestamps use the database server's local time and must align with the
restaurant's operating-time configuration. The selected slot is checked again
inside a transaction when submitted; locking the restaurant row prevents
concurrent overbooking. OSRM supplies road distance; routes over 10 km are
rejected. Travel time is estimated from road distance at
`DELIVERY_AVERAGE_SPEED_KMH` (default `20` km/h). A slot is offered only when
prep + estimated travel + buffer fits, capacity remains, and the trigger is
not before opening. Configure the default speed in the backend environment.

Run `npm run worker:scheduled` as a separate long-lived process alongside the
API. MySQL row locks (`SKIP LOCKED`) allow multiple worker instances. The
worker activates due orders as `PROCESSING`, creates a delivery request at the
pre-pack dispatch point, and reserves the least-recently-assigned online
Shipper when one is available. If the Restaurant marks a scheduled order ready
early, dispatch still waits until its calculated dispatch time; the worker then
includes `READY_FOR_PICKUP` orders so they are not skipped. If the restaurant is
unavailable at activation, the order is cancelled and voucher usage restored.
Customer cancellation is free while status is `SCHEDULED`; subsequent
restaurant and delivery transitions use the existing APIs.

This backend currently supports COD only and has no payment-refund, push
notification, or coupon-issuance provider. Automatic cancellation therefore
does not refund online payments or issue a courtesy coupon; integrate those
providers before enabling online payments.

### Isolated MySQL integration tests

Use local MySQL credentials already configured in `.env`; never point these
commands at `food_delivery_app` or another database containing important data.
The bootstrap command requires a fresh name matching
`food_delivery_app_it_YYYYMMDD[_N]`, creates only that database, and refuses to
overwrite an existing schema. It strips the destructive database-creation
header from the project SQL script, imports the tables/triggers/seed into the
isolated database, and corrects the sample Order 3 / Payment 3 amount there.
It does not drop any database.

PowerShell example (use a new suffix for each fresh test database):

```powershell
$env:DB_NAME = "food_delivery_app_it_20260928_12"
npm run test:db:bootstrap
$env:RUN_DB_INTEGRATION = "1"
npm run test:integration
```

The integration runner also refuses to run unless `DB_NAME` has the dedicated
test-database prefix. It exercises API workflows against the seeded test data
and changes test fixtures only in that database. It requires local MySQL,
valid `.env` connection settings, and permission to create the dedicated
database and its tables/triggers.

## Reports

Admin dashboard and revenue endpoints are under `/api/reports/admin`.
Restaurant revenue is exposed at `/api/reports/restaurant/revenue` and is
scoped to the authenticated Restaurant. Restaurant revenue sums completed Order
subtotals and excludes delivery fees.
