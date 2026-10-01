# BACKEND FULL VERIFICATION REPORT

**Dự án:** Food Delivery App — Backend  
**Thời điểm kiểm tra:** 28/09/2026  
**Phạm vi:** Backend Phase 1–8, chỉ kiểm tra; không sửa source, không chạy SQL setup, không ghi hoặc xóa dữ liệu.  
**Kết quả tổng quát:** Kiểm tra tự động hiện có và các smoke test không cần database đều đạt. Chưa đủ cơ sở để xác nhận các luồng nghiệp vụ tích hợp end-to-end do không có isolated test database/data fixture. Ghi nhận 1 lỗi OpenAPI có thể tái hiện, 1 rủi ro vận hành từ SQL bootstrap và 1 capability upload chưa có implementation.

## 1. Test environment

- Hệ điều hành: Windows.
- Runtime được quan sát khi chạy kiểm thử: Node.js v24.12.0.
- Backend: Express, CommonJS, MySQL qua `mysql2`; tests hiện có dùng Node built-in test runner.
- `npm test` chạy mà không gọi database; test HTTP dùng session identity giả lập trong bộ nhớ.
- Không sử dụng dữ liệu production có chủ đích; không chạy SQL script, không ghi/xóa dữ liệu.
- Không có isolated test database được cung cấp để chạy các test ghi nghiệp vụ. Một smoke probe có identity Admin đã tới bước cần MySQL nhưng kết nối bị từ chối (`ER_ACCESS_DENIED_ERROR`); không có truy vấn dữ liệu thành công. Các kết quả database-dependent được đánh dấu **BLOCKED**.
- Tài liệu tham chiếu source/schema: [BACKEND_IMPLEMENTATION_GAP_ANALYSIS.md](./BACKEND_IMPLEMENTATION_GAP_ANALYSIS.md), [FoodDeliveryApp_Tonghop.docx](./FoodDeliveryApp_Tonghop.docx), [DB_Script_FoodDeliveryApp.sql](./DB_Script_FoodDeliveryApp.sql), [README.md](./README.md), [src/swagger.js](./src/swagger.js).

## 2. Tests performed

1. `npm test`: chạy bộ test hiện có trong `test/`.
2. `node --check` cho source và test JavaScript.
3. `git diff --check`.
4. Smoke test HTTP local với session identity giả lập:
   - thiếu, sai và hết hạn JWT;
   - Customer, Restaurant và Shipper bị chặn tại Admin API;
   - Admin qua được role gate tới validation mà không truy vấn database;
   - một số role gate của Cart, Delivery và Voucher.
5. Gọi các trường hợp đăng ký email sai định dạng và password quá yếu ở service validation, trước khi mở kết nối DB.
6. Kiểm tra 112 operation được tài liệu hóa bằng request HTTP không có credential/empty body. Đây chỉ là kiểm tra router/method không trả 404 trong điều kiện chưa xác thực, **không** chứng minh quyền, body, response hoặc nghiệp vụ thành công.
7. Dùng Customer identity giả lập để đối chiếu `/api/carts/{id}` giữa OpenAPI và route thực tế.
8. Security review tĩnh source backend được thực hiện riêng; không chỉnh sửa code.
9. Đọc source router/controller/service/model và schema SQL ở chế độ chỉ đọc; không thực thi script database.

## 3. PASS

| Kiểm tra | Kết quả |
|---|---|
| Test suite hiện có | PASS — 6/6 tests. |
| Cú pháp JavaScript | PASS — 135 file trong `src/` và `test/` qua `node --check`. |
| Whitespace/diff | PASS — `git diff --check`. |
| JWT thiếu/sai/hết hạn | PASS — bị từ chối HTTP 401 trước khi tra cứu session. |
| Admin role gate | PASS — Customer/Restaurant/Shipper nhận 403; Admin qua middleware và dừng tại validator với request cố ý sai. |
| Một số role gate domain | PASS — Restaurant không được đọc Cart; Customer không được gọi Shipper availability; Restaurant không được gọi Admin Voucher listing. |
| Validation đăng ký | PASS — email sai và password quá yếu bị trả `VALIDATION_ERROR` trước DB. |
| Swagger routing smoke | PASS một phần — 112 operation được tài liệu hóa đã được thử không xác thực; không gặp 404 ở vòng smoke này. Kết quả không khẳng định các response schema hoặc quyền đã chính xác. |
| Security review tĩnh | PASS theo review đã thực hiện — không ghi nhận vulnerability có thể xác nhận trong phạm vi source được kiểm tra. Đây không thay thế kiểm thử API/data ownership thực tế. |

## 4. FAIL

### F-01 — Swagger công bố Cart item routes không tồn tại

- **Feature:** Cart API / OpenAPI.
- **Endpoint/file:** `GET`, `PUT`, `DELETE /api/carts/{id}` trong [src/swagger.js](./src/swagger.js); router thật là [src/router/cartsRouter.js](./src/router/cartsRouter.js).
- **Expected behavior:** Mọi operation được tài liệu hóa đều có route thực tế và method tương ứng.
- **Actual behavior:** Router Cart hiện chỉ có các route collection `GET /` và `DELETE /`; không đăng ký route item `/:id`. Khi gửi Customer JWT hợp lệ giả lập tới ba method trên `/api/carts/1`, backend trả **404** cho cả ba.
- **Severity:** MEDIUM — tài liệu API sai và client có thể tích hợp vào endpoint không tồn tại.
- **Reproduction steps:** Khởi động app với session identity được stub thành Customer; gửi `GET`, `PUT`, `DELETE /api/carts/1` với JWT test. Quan sát HTTP 404. Không cần DB.
- **Suggested fix:** Xóa các operation item path không được hỗ trợ khỏi OpenAPI; chỉ thêm route nếu business API thực sự cần. Chưa thực hiện sửa trong lượt verification.

## 5. BLOCKED

Không có isolated test database và bộ dữ liệu kiểm thử được cấp. Các test dưới đây chưa chạy; **không được xem là PASS**:

| Nhóm | Test bị BLOCKED | Lý do |
|---|---|---|
| Authentication | Đăng ký thành công; duplicate email; login đúng/sai password; tài khoản LOCKED; Restaurant SUSPENDED/REJECTED với identity DB thực; session hết hạn/revoked; logout; đổi password; kiểm tra mọi response không lộ `password_hash`. | Cần account/session fixture và truy vấn database. |
| Authorization / ownership | Restaurant truy cập Restaurant khác; Customer truy cập Order/Address/Cart của người khác; Shipper truy cập delivery của Shipper khác; Admin và các role trên mọi API. | Cần record nhiều actor và request end-to-end; smoke chỉ kiểm tra một số role gate bằng identity giả. |
| Catalog | List/detail dữ liệu thực; restaurant/food inactive; food ownership; invalid IDs; category/food CRUD và filtering. | Cần dữ liệu database có trạng thái cụ thể. |
| Address | CRUD, ownership giữa Customer A/B, dùng địa chỉ người khác trong checkout. | Cần fixture nhiều Customer/Address. |
| Cart | Add/update/remove, quantity 0/âm, inactive/nonexistent Food, khác Restaurant, ownership, giá DB thay vì client. | Cần fixture Cart/Food và database. |
| Checkout / COD | Cart rỗng, address sai owner, voucher invalid/expired, client giả subtotal/fee/discount/total/payment amount; kiểm tra các số backend tính và records được tạo. | Cần database cô lập và dữ liệu kiểm thử; không tạo Order trên DB không xác định. |
| Transaction / rollback | Lỗi giữa Order/Details/Payment/Delivery/Cart; Order+History; COD completion; Voucher usage rollback. | Cần fault injection trên isolated database. |
| Order workflow | Toàn bộ transition hợp lệ/không hợp lệ, nhảy/ngược trạng thái, Customer tự đổi status, cross-Restaurant/Shipper, ghi history. | Cần các trạng thái và actors trong database. |
| Delivery | Availability, assignment, hai Shipper nhận đồng thời, ownership, pickup/delivering/complete, invalid status. | Cần database và concurrency test. |
| Voucher | Active/inactive/expired, minimum order, usage limit, duplicate/concurrent application và phép tính giảm. | Cần dữ liệu voucher và các transaction cạnh tranh. |
| Review | Order chưa completed, cross-customer, eligibility, duplicate race, rating sai, quyền chỉnh/xóa, moderation và Restaurant scope. | Cần Order/Review fixture và DB. |
| Admin/reporting | Đọc/ghi Admin thực; Category/Voucher/Review moderation; dashboard/revenue/date filters; Customer/Restaurant report isolation. | Đọc report hoặc đổi trạng thái cần database có fixture; không dùng dữ liệu production. |
| API contract | Request-body/status/response semantics đầy đủ trên tất cả API và so khớp OpenAPI. | Smoke hiện tại chỉ xác nhận routing/method, không có response fixture đáng tin cậy. |
| Server với DB | Khởi động server kết nối thành công và smoke test DB thực. | Kết nối MySQL trong lần probe bị từ chối; cần cấu hình test database riêng. |

## 6. Security findings

- Security reviewer không ghi nhận vulnerability có thể xác nhận trong source đã xem.
- **Không đồng nghĩa toàn bộ security test đã PASS:** IDOR/ownership, session revoke trên DB thực, password hash exposure qua mọi response, mass-assignment trên mọi legacy route và các luồng số tiền chưa được kiểm thử end-to-end vì thiếu fixture.
- JWT signature/expiration và một số role gates đã được kiểm tra qua smoke test giả lập; không thay thế kiểm tra role/identity lưu trong database.
- Không phát hiện hard-coded credential/secret qua review tĩnh được thực hiện; chi tiết secret không được đọc hoặc đưa vào báo cáo.

## 7. Business logic findings

### B-01 — Các business workflow trọng yếu chưa được xác nhận end-to-end

- **Feature:** Checkout, Order State Machine, Delivery/COD, Voucher, Review và ownership.
- **Endpoint/file:** Các domain routers trong [src/router/](./src/router/), services trong [src/services/](./src/services/) và models trong [src/models/](./src/models/).
- **Expected behavior:** Các workflow đúng business rule và bảo toàn quyền sở hữu/trạng thái/giá trị giữa các bảng.
- **Actual behavior:** Có implementation và test unit/smoke một phần; chưa xác nhận qua API/database thực cho các scenario nghiệp vụ liệt kê ở mục 5.
- **Severity:** BLOCKED — chưa có đủ bằng chứng để phân loại pass/fail runtime.
- **Reproduction steps:** Cần provision isolated MySQL test schema, seed actor/entity fixtures riêng, chạy integration tests theo ma trận mục 5.
- **Suggested fix:** Tạo môi trường kiểm thử cô lập và bổ sung integration/regression tests; không chạy trên database không xác định.

## 8. Data integrity findings

### D-01 — Payment seed của Order 3 không khớp tổng Order

- **Feature:** SQL sample data / đối soát COD.
- **Endpoint/file:** [DB_Script_FoodDeliveryApp.sql](./DB_Script_FoodDeliveryApp.sql), seed Order 3 và Payment 3.
- **Expected behavior:** Payment amount bằng `orders.total_amount` cho cùng Order.
- **Actual behavior:** Order 3 có `total_amount = 132000`; Payment 3 có `amount = 142000`.
- **Severity:** LOW — sample data bất nhất; không chứng minh lỗi runtime backend.
- **Reproduction steps:** Đọc các INSERT seed của Order 3 và Payment 3 trong SQL. Không chạy script.
- **Suggested fix:** Đồng bộ seed amount trước khi dùng bộ seed cho integration test/demo; không chỉnh schema.

## 9. API findings

- **F-01** ở mục 4 là lỗi API đã tái hiện: OpenAPI Cart item operations trả 404 với identity Customer hợp lệ giả lập.
- Các route legacy CRUD vẫn được mount cho một số bảng. Một số thao tác ghi bị policy từ chối; chưa kiểm thử mọi method/role trên toàn bộ collection.
- Các request có identity Admin đi vào phần cần database không thể hoàn tất do kết nối bị từ chối. Do đó CRUD/report thực tế chưa được coi là PASS.

## 10. Documentation findings

### DOC-01 — Cart item API được mô tả nhưng không có route

- **Feature:** OpenAPI Cart.
- **Endpoint/file:** `/api/carts/{id}` trong [src/swagger.js](./src/swagger.js).
- **Expected behavior:** OpenAPI chỉ mô tả endpoint và method được mount.
- **Actual behavior:** `GET`, `PUT`, `DELETE` được hiển thị nhưng Customer-authenticated request đều nhận 404.
- **Severity:** MEDIUM.
- **Reproduction steps:** Như F-01.
- **Suggested fix:** Đồng bộ Swagger với `cartsRouter`; giữ API collection hiện có nếu đó là contract mong muốn.

Các phép kiểm tra tự động đã xác nhận route/method cho toàn bộ 112 operations được tài liệu hóa ở mức routing chưa xác thực. Chưa xác minh đầy đủ request body, response schema, error codes và auth requirement cho tất cả operations. Không thấy kết quả smoke này chứng minh các khía cạnh đó chính xác.

## 11. Code quality findings

### CQ-01 — Regression test suite chưa bao phủ đầy đủ business-critical flows

- **Feature:** Test strategy / toàn backend.
- **Endpoint/file:** [test/phase8.test.js](./test/phase8.test.js), [package.json](./package.json).
- **Expected behavior:** Có integration tests cô lập cho authentication, authorization/ownership, Cart/Checkout, transaction rollback, order/delivery transitions, voucher/review và Admin/report.
- **Actual behavior:** Test hiện có gồm 6 test Phase 8; không có bộ integration tests chạy các flow database nêu trên.
- **Severity:** MEDIUM — làm giảm khả năng phát hiện regression; không tự nó chứng minh runtime bug.
- **Reproduction steps:** Chạy `npm test`; kết quả 6/6 pass nhưng không exercise các thao tác nghiệp vụ trên MySQL.
- **Suggested fix:** Bổ sung test fixture và isolated test database; không dùng cấu hình production.

### CQ-02 — Upload/file lifecycle chưa được implement

- **Feature:** Upload ảnh Restaurant/Food.
- **Endpoint/file:** [src/router/](./src/router/) không có upload route; [src/app.js](./src/app.js) không mount upload handler.
- **Expected behavior:** Theo yêu cầu ảnh trong business/NFR và gap analysis, nếu client cần upload thì file phải có validation và storage flow tương ứng.
- **Actual behavior:** Chỉ có field ảnh/path trong schema/catalog; không có API upload/file handling trong source backend hiện tại.
- **Severity:** MEDIUM — capability chưa được cung cấp; không phải upload vulnerability vì chưa có upload endpoint.
- **Reproduction steps:** Gửi request tới route upload chưa định nghĩa như `POST /api/upload` sẽ không đi vào upload handler; xác nhận bằng source route inventory.
- **Suggested fix:** Xác nhận nhu cầu nghiệp vụ và thiết kế upload riêng có giới hạn file/type/quyền trước khi triển khai. Không thực hiện trong lượt verification.

## 12. Critical issues

**Không ghi nhận Critical issue đã xác nhận.**

## 13. High issues

### H-01 — SQL bootstrap có thể xóa database đã tồn tại nếu bị chạy

- **Feature:** Database setup / bảo toàn dữ liệu.
- **Endpoint/file:** Dòng đầu [DB_Script_FoodDeliveryApp.sql](./DB_Script_FoodDeliveryApp.sql).
- **Expected behavior:** Quy trình setup an toàn không xóa database chứa dữ liệu cần giữ.
- **Actual behavior:** Script bắt đầu bằng `DROP DATABASE IF EXISTS food_delivery_app` rồi tạo lại database.
- **Severity:** HIGH nếu chạy nhầm trên database có dữ liệu cần giữ; đây là rủi ro vận hành có điều kiện, không phải hành vi runtime API.
- **Reproduction steps:** Chỉ cần đọc câu lệnh đầu script; **không chạy** để xác minh.
- **Suggested fix:** Không dùng bootstrap script này ngoài database local/test rỗng; tách migration không phá hủy và yêu cầu backup/approval trước setup. Script không được chạy trong lần kiểm tra.

## 14. Medium issues

1. **F-01 / DOC-01:** Swagger Cart item methods không tồn tại; xem chi tiết ở mục 4.
2. **CQ-01:** Regression test chưa bao phủ business-critical flows; xem mục 11.
3. **CQ-02:** Upload/file handling chưa có implementation; xem mục 11.

## 15. Low issues

1. **D-01:** Seed Payment 3 không khớp Order 3; xem mục 8.
2. Chưa xác minh các limit/filter/timezone của reporting trên dữ liệu thực; hiện **BLOCKED**, chưa có bằng chứng lỗi runtime để nâng thành FAIL.

## 16. Recommended fixes

1. Điều chỉnh OpenAPI Cart: bỏ `/api/carts/{id}` nếu không thuộc API contract, hoặc triển khai route đúng business requirement trong một yêu cầu implementation riêng.
2. Chỉ dùng SQL bootstrap trên database local/test rỗng; tạo quy trình migration/backup an toàn cho triển khai.
3. Sửa bộ seed Payment 3/Order 3 để amount nhất quán trước khi dùng làm integration fixture.
4. Provision một isolated MySQL test database; không sao chép hoặc dùng production data.
5. Bổ sung integration tests cho matrix mục 5: ownership theo actor, transaction rollback, race/concurrency assignment và voucher usage, COD, review moderation, Admin/report.
6. Mở rộng OpenAPI contract checks để so khớp method/path/request/response/security với routes và controllers, không chỉ kiểm tra routing.
7. Xác nhận upload ảnh có thực sự thuộc scope vận hành; nếu có, tạo yêu cầu riêng với file size/type validation, storage và access policy.

---

**Giới hạn kết luận:** Đây là verification tĩnh và smoke-level, không phải xác nhận production readiness end-to-end. Không có code/database nào được thay đổi trong lượt kiểm tra này. Chưa triển khai thêm feature hoặc Phase mới.
