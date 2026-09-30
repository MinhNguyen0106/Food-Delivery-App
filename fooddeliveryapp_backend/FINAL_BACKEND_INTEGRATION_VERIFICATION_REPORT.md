# FINAL BACKEND INTEGRATION VERIFICATION REPORT

## 1. Environment

- Backend: Node.js, Express, CommonJS, MySQL 8, and the built-in `node:test` runner.
- Existing environment settings were loaded from the local `.env`; no credential or secret values were copied into this report or committed.
- Local MySQL was reachable and authenticated successfully.
- The configured application database name was `food_delivery_app`. It was not used for schema import, writes, or destructive tests.
- No package was installed for this verification.

## 2. Database test setup

- Created a separate MySQL database: `food_delivery_app_it_20260928_11`.
- Imported the project SQL schema after removing its `DROP DATABASE`, `CREATE DATABASE`, and `USE food_delivery_app` header. The importer refuses non-test database names, refuses existing targets, verifies it removed destructive statements, and never drops a database.
- Imported 28 tables and the two Cart triggers.
- Corrected Order 3 / Payment 3 amount in the isolated test database only. The source SQL remains unchanged.
- The project schema does not contain `user_sessions`; the application auth code does query it. No replacement table was added because the requested verification forbids changing schema.
- Temporary test databases created during setup attempts were removed by exact test-only names after verification. The final isolated database above is retained for reproducibility.
- Integration tests ran against seeded sample actors/orders and test-only fixture updates. No production data was used.

## 3. Test data / fixtures

The isolated SQL seed supplied Customer, Restaurant, Shipper, Admin, Food, Address, Cart, Order, Voucher, Payment, Delivery, and Review records. Integration setup replaced placeholder password values only in the isolated test database, opened two active Restaurants for checkout, and set two test Shippers online. Additional addresses, a Customer, Foods, Category, Orders, Reviews, and upload files were created only in the isolated test database and cleaned up where applicable.

For protected API workflow tests, JWT signatures and expiry were exercised, but session identity lookup was stubbed to the seeded test actors because the canonical SQL does not define `user_sessions`. Those results do not constitute a PASS for database-backed session authentication.

## 4. Image Upload verification

**PASS** for authenticated API behavior with the session identity lookup stubbed and all resource/file/database operations running against the isolated MySQL schema:

- Restaurant-owned Food image upload wrote a server-generated path to the existing `foods.image` column and the physical file was served through `/uploads`.
- Restaurant B could not upload to Restaurant A's Food.
- Replacing an image removed the old managed file after the database update.
- Deletion set the database image reference to `NULL` and removed the managed file.
- Missing-file request returned `400`.
- Existing automated tests additionally passed file-size, extension, MIME, signature, traversal, static headers/dotfile, replacement rollback, and cleanup-on-connection-failure checks.

Restaurant-image resource lifecycle is covered by unit/service wiring and OpenAPI checks; a database-backed upload for a Restaurant record was not run in this integration pass.

## 5. Authentication verification

| Test | Result | Evidence |
|---|---|---|
| Customer registration | PASS | Real isolated-DB API registration returned `201`; response had no `password_hash`. |
| Duplicate email | PASS | Real isolated-DB API request returned `409`. |
| Client role spoof during registration | PASS | Attempt to register with `role: RESTAURANT` returned `400`. |
| Wrong password | PASS | Returned `401` before session creation. |
| Locked account | PASS | Correct test password for a locked seeded account returned `403 ACCOUNT_LOCKED`. |
| Invalid / expired / missing JWT | PASS | Rejected with `401`. |
| Safe profile response | PASS | No `password_hash` in Customer or Restaurant profile response. |
| Successful database-backed login | **FAIL** | Returned `500`; MySQL reported `ER_NO_SUCH_TABLE` because `user_sessions` is absent from the canonical schema. |
| Logout | **FAIL** | Returned `500` for the same missing table. |
| Change password | **FAIL** | Returned `500` for the same missing table; transaction rolled back. |
| Restaurant registration | NOT APPLICABLE | No self-service Restaurant registration feature is exposed; role injection is rejected. |

## 6. Authorization / ownership verification

**PASS** for role and ownership decisions after authentication was supplied a test identity from the isolated actor fixture:

- Customer, Restaurant, and Shipper were rejected from Admin customer APIs with `403`; Admin was allowed.
- Customer could not access another Customer's Order or Address (`404`).
- Restaurant A could not edit Restaurant B's Food (`403`).
- Shipper could not read another Shipper's Delivery (`404`).
- Customer and Restaurant could not track another actor's Order delivery (`404`).
- Customer could not list Admin vouchers (`403`).
- Customer B could not update Customer A's Address (`404`) or remove Customer A's Cart item (`404`).

Database-backed JWT session issuance/revocation remains failed as described in Section 5.

## 7. Catalog verification

**PASS** on the isolated database:

- Customer Restaurant listing omitted the suspended Restaurant.
- Customer could not read an unavailable Food or a nonexistent Food (`404`).
- Admin created and deleted a Category.
- Restaurant created, updated, read, and deleted its own Food.
- Cross-Restaurant Food mutation was rejected.

Restaurant create/registration is not available as self-service and was not treated as an API requirement.

## 8. Address verification

**PASS** on the isolated database:

- Customer created, read, updated, and deleted its own Address.
- Another Customer could not read or update it (`404`).
- Checkout using an Address belonging to another Customer was rejected (`404`).

## 9. Cart verification

**PASS** on the isolated database:

- Clear/read, add Food, quantity validation, and Cart subtotal calculation were exercised.
- Client-supplied `unit_price` / `subtotal` fields were rejected (`400`); calculated Food price came from the database.
- Quantity zero was rejected (`400`).
- Unavailable Food and mixed-Restaurant Cart additions were rejected (`409`).
- Another Customer could not mutate a Cart item (`404`).
- The unsupported `/api/carts/{id}` GET/PUT/DELETE operations returned `404` and were removed from Swagger.

## 10. Checkout verification

**PASS** on the isolated database:

- Server created Order, OrderDetails, COD Payment, Delivery, and OrderStatusHistory from Cart and Address data.
- Client-supplied subtotal, fee, discount, total, and payment amount were rejected by request validation (`400`).
- Backend-calculated subtotal, delivery fee, voucher discount, and total were internally consistent.
- Successful checkout used COD and cleared the Cart.
- Invalid, expired, and below-minimum voucher attempts were rejected.

## 11. Order state machine verification

**PASS** on the isolated database:

- Restaurant could not skip from `PENDING` directly to `PREPARING` (`409`).
- A Restaurant could not transition another Restaurant's Order (`404`).
- `PENDING → CONFIRMED → PREPARING → READY_FOR_PICKUP` succeeded.
- Delivery transitions updated the Order and appended status history.

## 12. Delivery verification

**PASS** on the isolated database:

- Two Shippers concurrently attempted to claim one ready Delivery; exactly one returned `200`, the other `409`.
- The non-owner could not complete the Delivery (`404`).
- Starting before pickup was rejected (`409`).
- Pickup, start-delivery, and completion succeeded for the winning Shipper.
- Customer tracking succeeded only for the Customer's own Order.

## 13. COD verification

**PASS** on the isolated database:

- Checkout created a pending COD Payment whose amount matched the server-calculated Order total.
- Completion changed Order, Delivery, and Payment consistently; Payment became `PAID`, amount remained equal to Order total, and history was recorded.
- No client amount override was accepted.

## 14. Voucher verification

**PASS** on the isolated database:

- Invalid, expired, inactive/expired-status, and minimum-order conditions were exercised.
- Valid voucher discount was calculated server-side.
- Checkout rollback test injected a failure before Payment insert. No partial Order remained, Cart stayed intact, and voucher usage was rolled back.
- Two concurrent checkouts competed for a single-use voucher; exactly one succeeded, one was rejected, and `used_count` remained within `usage_limit`.

## 15. Review verification

**PASS** on the isolated database:

- Invalid rating was rejected (`400`).
- Customer could not review another Customer's Order (`404`).
- Eligible completed-Order review was created pending moderation.
- Duplicate review was rejected (`409`).
- Restaurant did not see pending review; Admin moderation to visible made it visible.
- Restaurant response omitted the review's `customer_id`; non-Admin moderation was forbidden (`403`).

## 16. Admin verification

**PASS** for tested endpoints:

- Admin customer listing succeeded.
- Category create/delete succeeded through the Admin-authorized catalog API.
- Admin review listing and moderation succeeded.
- Admin voucher listing succeeded.
- Customer, Restaurant, and Shipper access to the Admin customer API was rejected.

Every Admin management operation in the API was not exhaustively exercised.

## 17. Reporting verification

**PASS** for tested report endpoints on the isolated database:

- Admin summary and revenue endpoints returned `200`.
- Valid date/group filters returned `200`; reversed date range returned `400`.
- Restaurant revenue returned `200` using the authenticated Restaurant identity.
- Customer was forbidden from Admin reports (`403`).

Timezone edge cases and every reporting filter combination were not exhaustively tested.

## 18. Swagger / API contract verification

- **PASS:** Removed nonexistent `/api/carts/{id}` path; retained collection `GET/DELETE /api/carts` and actual Cart item routes.
- **PASS:** OpenAPI Cart paths/methods match the mounted Cart routers in the explicit route inventory check.
- **PASS:** Unit suite verifies the unsupported Cart item path is absent.
- **PARTIAL:** Full OpenAPI request/response/status/auth contract comparison across every endpoint was not completed. Existing verification's anonymous route smoke check was not repeated as a complete semantic schema audit.

## 19. Security verification

- **PASS:** Real isolated-DB integration requests demonstrated role checks, ownership boundaries, no client-controlled Cart prices/totals, no client-controlled COD amount, voucher locking, and duplicate review prevention.
- **PASS:** Invalid/expired JWTs and missing tokens were rejected; exposed profile/registration responses did not include `password_hash`.
- **PASS:** Upload checks from the existing suite covered extension/MIME/signature, size, traversal, managed path deletion, and static response headers.
- **FAIL / HIGH:** Session-backed authentication lifecycle is unavailable when provisioning only from the checked-in schema; login/logout/password change expose generic `500` rather than functioning.
- No production or development business data was queried by the integration tests. No credential/secret values were printed or added.

## 20. Automated test results

- `npm test`: **PASS** — 11 passed, 0 failed, 1 integration test skipped by default.
- `npm run test:db:bootstrap` with `DB_NAME=food_delivery_app_it_20260928_11`: **PASS** — 28 tables imported; seed Payment 3 corrected only in test DB.
- `npm run test:integration` with `RUN_DB_INTEGRATION=1` and the isolated DB:
  - Business/integration checks: **7 PASS**.
  - **2 authentication test groups FAIL** because the canonical SQL is missing `user_sessions` (login; change-password/logout).
  - Node reports the enclosing integration test as failed as well.
- `node --check` for JavaScript in `src`, `test`, and `scripts`: **PASS**, 141 files.
- Swagger Cart path/method check: **PASS**.
- `git diff --check`: **PASS**; only existing LF/CRLF conversion warnings for package lock files.
- Image test cleanup: the known file left by a failed test attempt was removed after its isolated DB reference was verified. An unreferenced `.jpg` in `uploads/` was not removed because its origin could not be established.

## 21. PASS list

- Customer registration and duplicate-email rejection.
- Role-spoof rejection and safe profile response.
- Wrong-password, locked-account, invalid/expired/missing-token responses.
- Role gates and database-backed ownership checks, with session lookup stubbed.
- Catalog Food/Category and Address CRUD coverage.
- Cart price authority, invalid quantity/Food handling, ownership, and one-Restaurant rule.
- Checkout totals, COD creation, Cart clearing, voucher validation, and injected transaction rollback.
- Valid/invalid Order transitions and status-history persistence.
- Concurrent Delivery claim, ownership, full Shipper transition, COD settlement.
- Voucher limit concurrency and single successful redemption.
- Review eligibility, ownership, duplicate protection, and Admin moderation.
- Food image upload/replace/delete lifecycle and static serving.
- Tested Admin/report APIs and Cart Swagger method reconciliation.

## 22. FAIL list

### F-01 — Canonical schema omits the authentication session table

- **Feature:** Login/session lifecycle.
- **Endpoint/file:** `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/change-password`; `src/models/authModel.js`; `DB_Script_FoodDeliveryApp.sql`.
- **Expected behavior:** Successful login creates a session; logout/password change revoke it; a provisioned database supports the session queries.
- **Actual behavior:** On a fresh database imported from the checked-in SQL, login returns `500`; MySQL reports `ER_NO_SUCH_TABLE`. Logout and password change also return `500`.
- **Severity:** HIGH — authentication lifecycle cannot operate on a database created solely from the committed canonical schema.
- **Reproduction steps:** Bootstrap `food_delivery_app_it_20260928_11`; set a valid bcrypt password hash for a seeded user; `POST /api/auth/login`; observe generic HTTP `500` and server log `ER_NO_SUCH_TABLE`. Then invoke logout/change-password through a signed test identity and observe the same missing-table failure.
- **Suggested fix:** In a separately approved schema-change task, add a versioned migration for `user_sessions` matching the code's `session_id`, `user_id`, `expires_at`, and `revoked_at` queries, or align auth persistence to an already-supported schema. No schema change was made here, per instruction.

### F-02 — OpenAPI previously documented nonexistent Cart item routes

- **Feature:** Cart API documentation.
- **Endpoint/file:** `/api/carts/{id}` in `src/swagger.js`.
- **Expected behavior:** Swagger only describes mounted endpoints.
- **Actual behavior:** No item-level Cart route exists; Customer-authenticated GET/PUT/DELETE requests return `404`.
- **Severity:** MEDIUM.
- **Reproduction steps:** Use a valid test Customer identity and request each of GET/PUT/DELETE `/api/carts/1`; observe `404`.
- **Suggested fix:** **Fixed in this change** by removing `/api/carts/{id}` and adding a regression assertion. Existing collection-level Cart endpoints remain documented.

## 23. BLOCKED list

- Database-backed session issuance, session revocation, logout, password change, and protected requests using actual persisted sessions: blocked by F-01; route authorization/business tests used a mocked session identity lookup and real isolated database data.
- Restaurant-image database lifecycle: endpoint/service follows the same code path but only Food image persistence/replacement/deletion was run end-to-end.
- Full CRUD/reporting matrix across every Admin API and every report filter.
- Full OpenAPI schema comparison for every endpoint's body/response/status/security.
- Cross-origin browser upload behavior (CORS is not mounted in the existing app).
- Timezone/date-boundary behavior and broader simultaneous load beyond the tested single-voucher/single-delivery races.

## 24. Known limitations

- This task did not change project SQL/database schema. Auth session operations require a schema object absent from the checked-in SQL.
- Database-backed protected endpoint integration used controlled test identity stubbing due to the session-table mismatch; do not interpret these results as validation of persisted session revocation.
- Image signature checks do not fully decode or re-encode image files.
- Local filesystem storage is not shared across multiple backend instances.
- One unreferenced `.jpg` remains in the uploads directory; it was retained because its origin could not be safely attributed to this test run.

## 25. Files modified

Created:

- `FINAL_BACKEND_INTEGRATION_VERIFICATION_REPORT.md`
- `scripts/bootstrapTestDatabase.js`
- `test/integration.test.js`

Modified:

- `package.json` — added `test:integration` and guarded `test:db:bootstrap` scripts.
- `src/swagger.js` — removed the nonexistent `/api/carts/{id}` path.
- `test/phase8.test.js` — added Swagger Cart path regression assertions.
- `README.md` — documented isolated test database setup and the session-table limitation.

Not modified: `DB_Script_FoodDeliveryApp.sql`, database schema in the application database, production data, credentials, or package dependencies.

## 26. Recommended next step

Approve and implement a dedicated, versioned schema migration for `user_sessions` (or formally change the auth session persistence design). Then rerun the integration suite against a fresh isolated database with real session persistence. Until this is resolved, the backend should **not** be assessed as fully verified or production-ready.
