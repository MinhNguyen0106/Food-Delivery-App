# Food Delivery Backend

## Requirements

- Node.js with support for `node:test`
- MySQL 8 using a database created for this application

## Configuration

Copy `.env.example` to `.env` and set `DB_HOST`, `DB_PORT`, `DB_USER`,
`DB_PASSWORD`, `DB_NAME`, and a private `JWT_SECRET` containing at least 32
bytes. `PORT` defaults to `3000`; `DELIVERY_FEE_PER_KM` defaults to `5000`.
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
