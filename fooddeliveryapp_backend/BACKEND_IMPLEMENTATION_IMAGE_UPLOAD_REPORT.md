# Image Upload / File Management Implementation Report

## 1. Objective

Implemented the missing Restaurant and Food image upload/file-management capability identified by the existing backend gap and verification reports. The change is limited to the image fields already present in the database and does not introduce a new application phase or unrelated business features.

## 2. Scope and exclusions

Included:

- Restaurant image upload, replacement, and removal.
- Food image upload, replacement, and removal.
- Authenticated role checks and database-backed resource ownership checks.
- Local file storage, static image delivery, request validation, API documentation, and automated tests.

Not included:

- Avatar, Category, or Review images; no corresponding image field was found in the existing schema for these entities.
- Cloud storage, image transformations, malware scanning, realtime features, or database schema changes.
- Changes to existing order, payment, voucher, or review behavior.

## 3. Database mapping

The implementation uses the existing nullable `image` columns on `restaurants` and `foods`. It does not add or alter tables or columns. The database stores a generated relative URL, such as `/uploads/foods/<timestamp>-<uuid>.png`, not an absolute filesystem path.

## 4. Implemented API endpoints

| Method | Endpoint | Behavior |
|---|---|---|
| `PUT` | `/api/restaurants/:id/image` | Upload or replace a Restaurant image |
| `DELETE` | `/api/restaurants/:id/image` | Clear the Restaurant image reference and remove its managed local file |
| `PUT` | `/api/foods/:id/image` | Upload or replace a Food image |
| `DELETE` | `/api/foods/:id/image` | Clear the Food image reference and remove its managed local file |

Upload requests use `multipart/form-data` with exactly one file field named `image`. Successful responses use `{ "success": true, "data": { "image": "/uploads/..." } }`; delete returns the same shape with `image: null`.

## 5. Authentication, roles, and ownership

- All four API endpoints require the existing Bearer-token authentication middleware.
- Restaurant images: Restaurant role may manage its own Restaurant after the service confirms the database owner; Admin may manage any Restaurant.
- Food images: only an active Restaurant may manage a Food whose `restaurant_id` matches the Restaurant identity resolved from the authenticated session.
- Customer, Shipper, and other unauthorized roles are rejected before multipart processing.
- The resource ID comes from the validated route parameter. The request body cannot select a filesystem path or override the actor identity.
- Food ownership is checked before saving and rechecked under a row lock in the update transaction. Restaurant owner identity is also rechecked before the database update.

## 6. Upload contract and validation

- Accepted formats: JPEG/JPG, PNG, and WEBP.
- Maximum: 5 MiB and one file per request.
- The only accepted multipart field is `image`; other form fields and excess parts/files are rejected.
- The extension is checked against the declared MIME type, and the file signature is checked against that MIME type.
- Missing files, malformed multipart requests, invalid names, mismatched types, and oversized files receive explicit client errors.
- Client filenames are never used to construct storage paths; generated names use a timestamp and UUID.

## 7. Storage and static delivery

Files are stored below the dedicated backend `uploads` directory, separated into `foods` and `restaurants`. The directory is created when needed. Static delivery is mounted only at `/uploads`; directory listings and dotfiles are disabled, and responses include `X-Content-Type-Options: nosniff` and a restrictive Content Security Policy.

Uploaded images are publicly readable catalog assets. Upload and deletion operations remain authenticated and authorized. Runtime upload files are excluded from Git while `uploads/.gitkeep` preserves the directory.

## 8. Replacement lifecycle

Replacement writes the new file first, then starts a MySQL transaction, locks and rechecks the resource, updates the existing image column, and commits. The prior managed file is removed only after commit. If connection acquisition or a database operation fails, the new file is cleaned up; rollback is attempted when a connection exists.

## 9. Deletion lifecycle

Deletion locks the resource and clears its `image` column within a transaction. Once committed, the service removes only files whose relative URL matches the application-managed entity prefix and generated-filename format. Legacy or externally managed image paths are not treated as local files.

The database and filesystem do not share a transaction. If post-commit file cleanup fails, the database remains authoritative and the cleanup failure is logged; an orphaned local file may remain.

## 10. Error handling

The endpoints use the existing central JSON error handler. Documented outcomes include:

- `200`: upload, replacement, or deletion succeeded.
- `400`: invalid ID, missing image, or malformed multipart request.
- `401`: authentication required or invalid.
- `403`: role or ownership is not permitted.
- `404`: resource not found or not visible to the actor.
- `413`: file exceeds 5 MiB.
- `415`: unsupported extension, MIME type, or file signature.
- `500`: storage or database operation failed; internal details are not returned to the client.

## 11. Existing API compatibility

Existing JSON create/update APIs remain available and were not removed. Frontends can continue consuming the existing image string field; new uploads return the relative `/uploads/...` URL. The image endpoints use the existing Restaurant and Food resource IDs and database fields.

## 12. OpenAPI and frontend usage

Swagger documents all four endpoints, their Bearer authentication requirement, multipart field and accepted formats, file-size limit, response shape, and expected error statuses. README includes a `curl` upload example and describes the supported formats and local storage behavior.

Example:

```sh
curl -X PUT "http://localhost:3000/api/foods/12/image" \
  -H "Authorization: Bearer <token>" \
  -F "image=@dish.webp"
```

## 13. Security controls

- Multer uses bounded in-memory storage with file/part limits.
- Extension, MIME type, and file signature are checked independently.
- Generated filenames and constrained deletion paths prevent client-controlled path traversal.
- Static serving is confined to the uploads directory and denies dotfiles.
- Role checks precede file parsing; ownership is checked against database records and revalidated under lock before writes.
- No credentials or secrets were added to the implementation.

## 14. Automated tests

Added Node built-in test coverage for:

- Valid multipart upload parsing and missing/invalid/oversized file rejection.
- Filename/type/signature validation and traversal rejection.
- Generated relative paths, static serving headers, managed-file removal, and hidden-file denial.
- Image replacement, old-file cleanup after commit, rollback cleanup, and cleanup when a database connection cannot be acquired.
- Anonymous and wrong-role rejection.
- Successful Food and Restaurant upload route/controller wiring with the service mocked.

## 15. Verification results

- `npm test`: **PASS**, 11 tests passed, 0 failed.
- Focused image upload tests: **PASS**, 5 tests passed.
- `node --check` over `src` and `test`: **PASS**, 139 JavaScript files checked.
- OpenAPI path/method/Bearer-security check for the four image operations: **PASS**.
- `git diff --check`: **PASS**; only line-ending warnings were reported for package lock files.
- Upload test cleanup: verified that only `uploads/.gitkeep` remained after the focused suite.

## 16. Database and integration-test status

No live database-backed upload request was run. No isolated test database was provided, and the existing configured database was not assumed safe for write tests. Ownership rechecks and transaction lifecycle were exercised using mocked model/connection behavior; actual MySQL locking, SQL execution, database rollback, and concurrent uploads remain **BLOCKED pending an isolated test database**.

## 17. Known limitations

- Signature checks inspect file headers; the implementation does not fully decode images, scan for malware, or re-encode files.
- In-memory upload buffering is bounded per request, but high concurrent upload volume can still consume memory; production deployments should enforce suitable request/concurrency limits.
- Local storage is specific to one backend filesystem. Multi-instance deployments need a shared/persistent storage strategy, which is outside this change.
- The existing app does not mount CORS middleware even though the dependency is present. Same-origin/native requests are unaffected, but cross-origin browser upload behavior is not verified and may be blocked by browsers; this implementation did not broaden the existing CORS policy.
- Filesystem cleanup after a successful database commit cannot be atomic with the database; cleanup failures can leave orphaned files and are logged for operations follow-up.

## 18. Files created and modified

Created:

- `src/config/uploads.js`
- `src/services/imageStorageService.js`
- `src/middleware/imageUpload.js`
- `uploads/.gitkeep`
- `test/imageUpload.test.js`
- `BACKEND_IMPLEMENTATION_IMAGE_UPLOAD_REPORT.md`

Modified:

- `package.json` and `package-lock.json` — added Multer.
- `.gitignore` — excludes runtime uploads while retaining `.gitkeep`.
- `src/app.js` — mounts constrained static image serving.
- `src/router/catalogRouter.js` — adds authenticated resource-specific upload/delete routes.
- `src/controllers/catalogController.js` — adds upload/delete handlers.
- `src/services/catalogService.js` — adds ownership, transactional image replacement/removal, and file cleanup.
- `src/models/catalogModel.js` — accesses the existing image columns and locks resources for updates.
- `src/swagger.js` — documents the image operations and response/error contracts.
- `README.md` — documents upload usage and supported formats.
