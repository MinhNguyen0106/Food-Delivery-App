# Stateless JWT Migration Report

## Summary

Authentication no longer depends on persisted login-session records. Login
issues a signed JWT directly, and protected requests identify the account by
the JWT subject (`sub`) and load its current identity and account status from
the existing database tables. The database schema was not changed.

## Behavior

- Login issues an HS256 JWT with the existing issuer, audience, role claim,
  one-hour lifetime, numeric user ID subject, and a unique `jti`. The `jti` is
  not stored or looked up in the database.
- Multiple tokens for one account may remain valid concurrently.
- Authorization continues to use the current role, account status, and
  customer/restaurant/shipper/admin IDs loaded from the database. Locked or
  inactive users and suspended or rejected restaurants remain blocked.
- Logout remains authenticated and returns success for API compatibility, but
  cannot invalidate the token server-side. The client must discard its token.
- Changing a password updates the password hash but does not invalidate
  existing JWTs. They remain valid until expiry or an account-status check
  rejects them.
- Admin account lock and restaurant status changes no longer write session
  revocations; current status is checked on every authenticated request.

## Files Changed

- `src/models/authModel.js`
- `src/services/authService.js`
- `src/middleware/authenticate.js`
- `src/controllers/authController.js`
- `src/models/adminModel.js`
- `src/services/adminService.js`
- `src/swagger.js`
- `README.md`
- `test/phase8.test.js`
- `test/imageUpload.test.js`
- `test/integration.test.js`

## Verification

- `npm test`: passed — 11 tests passed, 1 database integration test skipped
  because integration was not enabled in this run.
- `npm run test:db:bootstrap` with
  `DB_NAME=food_delivery_app_it_20260928_12`: passed; created a dedicated
  integration database and imported 28 tables. No existing database was
  overwritten.
- `npm run test:integration` with that dedicated database and
  `RUN_DB_INTEGRATION=1`: passed — 10 tests passed, including login,
  concurrent valid JWTs, logout behavior, password change, token expiry,
  role authorization, locked/suspended account checks, order/delivery
  workflows, and other existing integration coverage.
- JavaScript syntax checks for `src`, `test`, and `scripts`: passed.
- `git diff --check`: passed.
- `DB_Script_FoodDeliveryApp.sql`: unchanged.
- No runtime, test, script, or README references remain to `user_sessions`,
  session lookup/revocation APIs, or `SESSION_SECONDS`.

The integration suite intentionally triggers and logs a database signal while
checking checkout rollback; that subtest passed and the isolated database
contains the test changes.

## Limitations

- Logout is client-side only; a stolen JWT cannot be individually revoked.
- Password change does not revoke tokens previously issued to other devices.
- There is no server-side session listing, per-device logout, or token
  blacklist. These would require additional state and are outside this
  stateless migration.
- Protected requests still require a database identity/status lookup. This is
  intentional so current role and account restrictions take effect without
  waiting for JWT expiry.
