# Theo dõi tiến độ Food Delivery App

- **Cập nhật lần cuối:** 2026-10-06
- **Tổng quan:** Đã rà soát mã nguồn của Backend, Customer, Restaurant/Admin và Shipper. Các luồng cốt lõi hiện diện ở nhiều phân hệ, nhưng chưa đủ bằng chứng để xác nhận toàn hệ thống hoàn thành hoặc đưa ra một tỷ lệ phần trăm nghiệm thu đáng tin cậy.
- **Lưu ý đánh giá:** `Có trong mã nguồn` không đồng nghĩa với đã chạy thành công. Phần lớn luồng ứng dụng chưa được kiểm thử end-to-end với backend và MySQL.
- **Trạng thái:** `Có trong mã nguồn (chưa nghiệm thu)` = đã tìm thấy luồng tương ứng trong mã; `Đang thực hiện` = mới có một phần hoặc có vấn đề cần xử lý; `Chưa xác minh` = chưa có đủ bằng chứng; `Bị chặn` = chưa thể tiếp tục vì phụ thuộc chưa đáp ứng.
- **Cập nhật bảng:** Khi thay đổi trạng thái, ghi kết quả chạy thử, người phụ trách và ngày cập nhật ở ghi chú/nhật ký.

## Tổng quan

| Phân hệ | Trạng thái hiện tại | Tóm tắt |
|---|---|---|
| Phân tích yêu cầu và phạm vi | Có tài liệu; cần xác nhận | Có tài liệu yêu cầu nghiệp vụ cho Customer và Restaurant/Admin; chưa xác nhận đây là baseline đã được duyệt. |
| Backend API và cơ sở dữ liệu | Đang thực hiện | Nhiều API/nghiệp vụ đã có; 23 test tự động đạt, 1 bỏ qua; chưa xác minh kết nối và luồng dữ liệu MySQL tích hợp. |
| Ứng dụng Customer | Đang thực hiện | Các màn hình/luồng chính đã có; lint và TypeScript đạt; checkout COD còn điểm cần xác nhận, chưa có test tự động riêng. |
| Web Restaurant/Admin | Đang thực hiện | Restaurant đã có bảo vệ phiên/role, dashboard lọc doanh thu, thực đơn, xử lý và lịch sử đơn, hồ sơ cửa hàng/tài khoản; lint/build đạt. Admin còn hạn chế CRUD/báo cáo; chưa E2E với API/DB thật. |
| Ứng dụng Shipper | Đang thực hiện | Luồng chính đã có và TypeScript đạt; lint thất bại với 2 lỗi và 1 cảnh báo. |
| Tích hợp, kiểm thử và bàn giao | Đang thực hiện | Chưa chạy E2E; integration test MySQL bị skip; hướng dẫn chạy có trong README nhưng chưa nghiệm thu triển khai. |

## 1. Phân tích yêu cầu và phạm vi

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Yêu cầu và phạm vi Customer | Có tài liệu; cần xác nhận | Có [BUSINESS_REQUIREMENTS.md](./fooddeliveryapp_customer/BUSINESS_REQUIREMENTS.md) và [CUSTOMER_UI_SPECIFICATIONS.md](./fooddeliveryapp_customer/CUSTOMER_UI_SPECIFICATIONS.md); chưa có bằng chứng duyệt yêu cầu. |
| Yêu cầu và phạm vi Restaurant/Admin | Có tài liệu; cần xác nhận | Có [BUSINESS_REQUIREMENTS.md](./fooddeliveryapp_restaurant_admin/BUSINESS_REQUIREMENTS.md); chưa xác nhận mức độ đồng bộ với mã nguồn hiện tại. |
| Luồng nghiệp vụ và vòng đời đơn hàng | Có mô tả; chưa nghiệm thu | Có mô tả nghiệp vụ và API trạng thái đơn; cần kiểm thử xuyên suốt các vai trò. |

## 2. Backend và cơ sở dữ liệu

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Cấu hình môi trường và kết nối MySQL | Đang thực hiện | Có kiểm tra cấu hình và DB pool tại `fooddeliveryapp_backend/src/config/env.js`, `src/common/db.js`; chưa khởi tạo/kiểm thử kết nối DB trong lần rà soát. |
| Xác thực, phân quyền và tài khoản | Đang thực hiện | Customer auth/profile và kiểm tra vai trò có trong `src/services/authService.js`, middleware; tài khoản vai trò đặc quyền được cấp riêng. JWT stateless không thu hồi token khi logout. |
| API nhà hàng, danh mục và món ăn | Có trong mã nguồn (chưa nghiệm thu) | Catalog, kiểm soát quyền và API hồ sơ owner-scoped `GET/PATCH /api/restaurants/me` có trong `src/router/catalogRouter.js`, `src/services/catalogService.js`; validator và kiểm thử quyền truy cập chạy đạt, chưa xác minh với MySQL. |
| Địa chỉ, giỏ hàng và đặt COD | Có trong mã nguồn (chưa nghiệm thu) | Mỗi Customer được lưu tối đa 3 địa chỉ; backend kiểm tra giới hạn trong transaction, Customer hiển thị số lượng và chặn nút thêm ở sổ địa chỉ/checkout. Có address CRUD, giỏ hàng, báo giá và checkout giao dịch trong `src/services/addressService.js`, `src/services/orderService.js`; chưa xác minh với MySQL. |
| Xử lý đơn hàng và lịch sử trạng thái | Có trong mã nguồn (chưa nghiệm thu) | API Customer/Restaurant và chuyển trạng thái có trong `src/router/ordersRouter.js`, `src/services/orderService.js`; chưa kiểm thử E2E. |
| API nhận và thực hiện giao hàng | Có trong mã nguồn (chưa nghiệm thu) | Có availability, nhận đơn, lấy hàng, giao hàng và lịch sử tại `src/router/deliveriesRouter.js`, `src/services/deliveryService.js`; tính đúng đắn DB/concurrency chưa được xác minh. |
| Đánh giá, voucher và báo cáo | Có trong mã nguồn (chưa nghiệm thu) | Có service đánh giá, voucher, báo cáo; chưa xác minh các truy vấn trên DB tích hợp. |
| Quản trị tài khoản và đơn hàng | Đang thực hiện | Admin có danh sách/chi tiết/cập nhật trạng thái tài khoản và xem đơn; chưa thấy CRUD đầy đủ cho Customer/Restaurant/Shipper hoặc thao tác đổi trạng thái đơn từ Admin. |
| Validate, lỗi và kiểm soát truy cập | Có trong mã nguồn (đã kiểm tra một phần) | Có validators, middleware vai trò/quyền sở hữu và xử lý lỗi tập trung; một số test liên quan chạy đạt, chưa phải kiểm thử bao phủ toàn API. |

## 3. Ứng dụng Customer

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Đăng ký, đăng nhập và tài khoản cá nhân | Có trong mã nguồn (chưa nghiệm thu) | Có đăng ký/đăng nhập, lưu phiên, hồ sơ, đổi mật khẩu và đăng xuất; chưa kiểm thử với backend đang chạy. |
| Khám phá/tìm kiếm nhà hàng và xem menu | Có trong mã nguồn (chưa nghiệm thu) | Có trang khám phá, tìm kiếm nhà hàng/món ăn, chi tiết nhà hàng và món; chưa chạy xác minh trên thiết bị/API thật. |
| Chi tiết món ăn và quản lý giỏ hàng | Có trong mã nguồn (chưa nghiệm thu) | Luồng giỏ hàng gọi API thông qua provider/service; chưa kiểm thử liên thông. |
| Địa chỉ, chọn vị trí và bản đồ | Có trong mã nguồn (chưa nghiệm thu) | Có quản lý địa chỉ và hỗ trợ chọn vị trí/geocoding/bản đồ; cần thử quyền vị trí, nền tảng và dịch vụ ngoài. |
| Tính phí giao hàng và đặt đơn COD | Đang thực hiện | UI lấy báo giá từ server và hiển thị COD; request checkout chưa gửi lựa chọn phương thức thanh toán. Cần xác nhận hợp đồng API/backend mặc định COD có chủ đích hay không. |
| Theo dõi trạng thái và lịch sử đơn | Có trong mã nguồn (chưa nghiệm thu) | Có danh sách, chi tiết, hủy đơn và cập nhật trạng thái định kỳ; đây không phải theo dõi GPS shipper trực tiếp. |
| Đánh giá đơn đã hoàn thành | Có trong mã nguồn (chưa nghiệm thu) | UI giới hạn đánh giá theo trạng thái đơn và gọi review API; chưa kiểm thử backend thực tế. |

## 4. Web Restaurant/Admin

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Đăng nhập và phân quyền | Có trong mã nguồn (chưa nghiệm thu) | `RestaurantPortalShell` xác minh phiên và role `RESTAURANT`, chặn phiên hết hạn/sai role, cung cấp đăng xuất và điều hướng tới `/`; chưa xác minh bằng tài khoản thật. |
| Restaurant quản lý hồ sơ và thực đơn | Có trong mã nguồn (chưa nghiệm thu) | CRUD món ăn hiện có; trang hồ sơ cập nhật thông tin cửa hàng, ảnh, email đăng nhập và mật khẩu. Địa chỉ nhà hàng duy nhất có thể được tìm/chọn/kéo ghim trên OpenStreetMap; tọa độ và địa chỉ được lưu cùng hồ sơ qua API `GET/PATCH /api/restaurants/me`, chỉ theo actor đang đăng nhập. Lint, TypeScript và build portal đạt; chưa thử API với DB thật hoặc kiểm tra tương tác bản đồ E2E. |
| Restaurant tiếp nhận và cập nhật đơn | Có trong mã nguồn (chưa nghiệm thu) | Có bộ lọc trạng thái, xác nhận/từ chối/chuẩn bị/sẵn sàng lấy hàng; chi tiết line items tải theo yêu cầu. Chưa kiểm thử quy trình nhiều vai trò với API/DB đang chạy. |
| Restaurant xem lịch sử đơn và doanh thu | Có trong mã nguồn (chưa nghiệm thu) | Có trang đơn COMPLETED/CANCELLED/REJECTED, timeline trạng thái, và dashboard doanh thu có lọc ngày/nhóm thời gian; chưa đối soát số liệu với DB thật. |
| Điều hướng và giao diện mobile Restaurant | Có trong mã nguồn (chưa nghiệm thu) | Shell có sidebar desktop, bottom navigation 5 mục trên mobile và vùng nội dung thích ứng; chưa kiểm tra trực quan trên thiết bị/viewport thực tế. |
| Admin quản lý Customer, Restaurant và Shipper | Đang thực hiện | Có danh sách/tìm kiếm và xem hồ sơ; Customer có tạo qua API đăng ký và khóa/mở khóa, Restaurant có đổi trạng thái, Shipper có khóa/mở khóa. Chưa có sửa/xóa hồ sơ hoặc tạo Restaurant/Shipper từ portal. |
| Admin quản lý danh mục, đơn hàng, đánh giá và voucher | Đang thực hiện | Danh mục/voucher có CRUD; đánh giá có ẩn/hiện; đơn hàng có tra cứu và xem chi tiết, chưa có thao tác đổi trạng thái/hủy từ Admin. |
| Admin xem báo cáo và thống kê | Đang thực hiện | Dashboard có số tổng quan, đơn theo trạng thái và doanh thu hôm nay; backend/service có API doanh thu Admin nhưng chưa thấy trang/biểu đồ để lọc và xem xu hướng. |

## 5. Ứng dụng Shipper

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Đăng nhập và quản lý tài khoản | Đang thực hiện | Login/profile/logout có trong mã; lỗi đăng nhập hiện được gán vào biến chưa sử dụng nên chưa hiển thị rõ cho người dùng. |
| Bật/tắt trạng thái sẵn sàng nhận đơn | Có trong mã nguồn (chưa nghiệm thu) | Có tải yêu cầu và cập nhật trạng thái online/offline qua API; chưa kiểm thử trên backend đang chạy. |
| Xem và nhận yêu cầu giao hàng | Có trong mã nguồn (chưa nghiệm thu) | Có màn hình danh sách và gọi API nhận giao hàng; chưa kiểm thử liên thông. |
| Cập nhật trạng thái lấy hàng và giao hàng | Đang thực hiện | Các chuyển trạng thái có trong mã; lỗi ở một số thao tác chỉ được log, chưa thấy thông báo lỗi rõ cho người dùng. |
| Xem lịch sử giao hàng | Có trong mã nguồn (chưa nghiệm thu) | Có danh sách/lọc lịch sử và thống kê đơn hoàn thành; chưa có test tự động cho ứng dụng. |

## 6. Tích hợp, kiểm thử và bàn giao

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Cấu hình kết nối các ứng dụng với API | Đang thực hiện | Đã có API client/service; cần xác minh cấu hình theo môi trường. Shipper còn URL LAN/localhost theo nền tảng; chưa xác nhận triển khai trên thiết bị/mạng khác. |
| Backend unit/smoke tests | Đạt một phần | `npm --prefix fooddeliveryapp_backend test`: **28 passed, 0 failed, 1 skipped** (bao gồm test giới hạn 3 địa chỉ và smoke test quyền `/api/restaurants/me`). |
| Backend MySQL integration tests | Chưa xác minh | `npm --prefix fooddeliveryapp_backend run test:integration`: **1 skipped**, không xác nhận luồng DB tích hợp. |
| Customer static checks | Đạt | `npm --prefix fooddeliveryapp_customer run lint`: đạt; `tsc --noEmit` từ thư mục Customer: đạt. Không tìm thấy test script/test suite riêng của Customer. |
| Restaurant/Admin static checks và build | Đạt | `npm --prefix fooddeliveryapp_restaurant_admin run lint`: đạt; `npm --prefix fooddeliveryapp_restaurant_admin run build`: build và TypeScript đạt với 16 route (8 Admin, 5 Restaurant, 3 chung/not-found). Chưa có test tự động riêng cho portal. |
| Shipper static checks | Đang thực hiện | TypeScript `tsc --noEmit`: đạt. `npm --prefix fooddeliveryapp_shipper run lint`: thất bại với 2 lỗi React `setState` trong effect (`src/app/giaohang.tsx:1479`, `src/hooks/use-color-scheme.web.ts:11`) và 1 cảnh báo biến `errorMsg` chưa dùng (`src/app/LoginScreen.tsx:321`). |
| Kiểm thử end-to-end xuyên Customer → Restaurant → Shipper | Chưa xác minh | Chưa chạy luồng thật từ đặt món đến giao hàng. Không tìm thấy test script/test suite riêng cho các ứng dụng frontend. |
| Hướng dẫn cài đặt/chạy và bàn giao | Chưa xác minh | README có trong từng module; chưa kiểm tra toàn bộ hướng dẫn trên môi trường sạch hoặc xác nhận phiên bản bàn giao. |

## Vấn đề cần xử lý

| Mức độ | Nội dung | Gợi ý bước tiếp theo | Trạng thái |
|---|---|---|---|
| Cao | Lint Shipper không đạt do 2 lỗi React hooks; có thêm cảnh báo biến lỗi đăng nhập chưa dùng. | Sửa hai lỗi lint và đảm bảo lỗi đăng nhập được hiển thị; chạy lại lint. | Đang mở |
| Cao | Backend MySQL integration test bị skip; chưa xác minh thao tác DB và luồng tích hợp. | Chuẩn bị DB test chuyên dụng theo README rồi chạy integration test và E2E. | Chưa xác minh |
| Trung bình | Restaurant portal đã có auth guard, hồ sơ, lịch sử đơn và dashboard báo cáo; chưa xác minh trên phiên đăng nhập và dữ liệu thật. | Chạy E2E Restaurant với tài khoản/DB test; kiểm thử lưu hồ sơ, ảnh, đơn và lọc doanh thu. | Chưa xác minh |
| Trung bình | Một số thao tác CRUD/quản trị và báo cáo Admin còn thiếu so với nhu cầu bàn giao. | Chốt phạm vi Admin cần có rồi bổ sung theo ưu tiên sản phẩm. | Đang mở |
| Trung bình | Customer hiển thị lựa chọn COD nhưng request checkout không gửi phương thức thanh toán. | Xác nhận API mặc định COD có chủ đích; đồng bộ request, tài liệu và kiểm thử. | Cần xác nhận |
| Trung bình | URL API Shipper phụ thuộc địa chỉ LAN/localhost, chưa được xác minh khi triển khai. | Kiểm thử cấu hình trên thiết bị/môi trường mục tiêu và chuẩn hóa cấu hình môi trường nếu cần. | Chưa xác minh |

## Nhật ký cập nhật

| Ngày | Nội dung cập nhật | Người cập nhật |
|---|---|---|
| 2026-10-06 | Thêm phân trang client cho danh sách Customer (nhà hàng, tìm kiếm món/nhà hàng, đơn hàng, đánh giá, voucher, thực đơn/đánh giá nhà hàng, giỏ hàng và món trong đơn) cùng Restaurant portal (thực đơn, đơn đang xử lý, lịch sử). Kích thước trang 5–10 mục tùy loại danh sách; giữ bộ lọc hiện có. Xác minh lint/typecheck Customer và lint/build portal. | Copilot |
| 2026-10-06 | Chuẩn hóa lỗi đăng nhập Customer, Restaurant, Admin và Shipper: thông tin sai, tài khoản sai vai trò hoặc bị khóa đều không tiết lộ phân hệ/trạng thái tài khoản, chỉ hiện “Tài khoản hoặc mật khẩu không đúng.”; giữ nguyên phản hồi lỗi kết nối. | Copilot |
| 2026-10-06 | Xác nhận giới hạn tối đa 3 địa chỉ cho mỗi Customer được kiểm tra trong transaction; chặn thao tác thêm ở sổ địa chỉ và màn hình checkout, cập nhật Swagger/tài liệu API. Sửa mock pool trong unit test để kiểm chứng trường hợp địa chỉ thứ tư bị từ chối. Backend test 28 đạt, 1 bỏ qua; Customer lint/typecheck đạt; chưa chạy MySQL integration. | Copilot |
| 2026-10-06 | Bổ sung chọn vị trí OpenStreetMap trên hồ sơ Restaurant: tìm địa chỉ, chọn/kéo ghim, định vị trình duyệt và tự điền địa chỉ/tọa độ vào cùng một hồ sơ nhà hàng. Xác minh portal lint, TypeScript, build và `git diff --check`; chưa kiểm thử tương tác OSM/API với dịch vụ/DB thật. | Copilot |
| 2026-10-06 | Hoàn thiện mã nguồn Restaurant portal: thêm owner-scoped API hồ sơ, guard phiên/role, điều hướng mobile, hồ sơ cửa hàng/tài khoản, lọc doanh thu, lịch sử đơn và xem chi tiết line items theo yêu cầu; cập nhật tài liệu API/OpenAPI. Xác minh backend tests (23 đạt, 1 bỏ qua), portal lint/build và `git diff --check`; chưa chạy E2E/DB thật. | Copilot |
| 2026-10-06 | Rà soát source, package scripts và tài liệu của cả bốn phân hệ; chạy backend tests, lint/typecheck/build hiện có. Ghi rõ các chức năng đã thấy trong mã nhưng chưa nghiệm thu runtime, kết quả kiểm thử và các điểm thiếu/đang mở. | Copilot |

## 7. Rà soát giao diện web Customer/Admin — đợt đầu

**Phạm vi đã xem:** Expo Web Customer tại `/login` và `/register`; cổng web tại `/`, `/admin/login` và hành vi truy cập `/admin/dashboard` khi chưa đăng nhập. Đây mới là lượt rà soát các trang công khai/xác thực; chưa đánh giá các trang dữ liệu sau đăng nhập.

| Khu vực | Kết quả quan sát | Trạng thái |
|---|---|---|
| Customer — đăng nhập/đăng ký | Expo Web tải được; khi chưa có phiên, trang gốc đưa tới `/login`. Trang đăng ký tải được sau bước kiểm tra phiên và hiển thị các trường họ tên, email, số điện thoại, mật khẩu, xác nhận mật khẩu và ngày sinh tùy chọn. | Đã xem giao diện; chưa thử gửi form/API |
| Admin — điểm vào `/` | Có trang đăng nhập chung Nhà hàng/Admin, mặc định chọn Nhà hàng; lựa chọn vai trò đổi nội dung và vai trò mong đợi sau đăng nhập. | Đã xem giao diện; chưa thử đăng nhập |
| Admin — `/admin/login` | Có trang đăng nhập dành riêng cho Admin, khác giao diện trang `/`. | Đã xem giao diện; chưa thử đăng nhập |
| Admin — trang cần xác thực | Mở `/admin/dashboard` khi không có phiên cuối cùng đưa về `/admin/login`; nội dung dashboard không được mở khi chưa xác thực. | Đã xác nhận chuyển hướng; chưa thử phiên hợp lệ |
| Bố cục màn hình nhỏ | Trang đăng nhập Admin chuyển thành bố cục dọc và cần cuộn để tới hết form; chưa kiểm tra đầy đủ các màn hình sau đăng nhập trên mobile. | Quan sát sơ bộ |
| Console Customer | Khi mở web có cảnh báo React Native Web về các thuộc tính `shadow*`/`textShadow*` đã deprecated; chưa thấy lỗi runtime trong các trang auth đã mở. | Cần rà soát thêm |

### Phát hiện từ lượt rà soát

| Mức độ | Phát hiện | Bằng chứng/ảnh hưởng | Trạng thái |
|---|---|---|---|
| Trung bình | Checkbox “Ghi nhớ đăng nhập” ở trang `/` chưa có tác dụng. | Form có checkbox `name="remember"` nhưng `handleSubmit` chỉ đọc email/mật khẩu; `authService.login` luôn lưu `accessToken` vào `localStorage`. Trạng thái chọn/bỏ chọn không thay đổi thời hạn lưu phiên. | Đang mở |
| Thấp | Có hai điểm vào đăng nhập Admin với giao diện khác nhau. | Admin có thể chọn Admin tại `/` hoặc vào `/admin/login`; cần xác định URL nào là đường dẫn chính và đảm bảo trải nghiệm/hướng dẫn nhất quán. | Cần thống nhất |

### Chưa kiểm chứng và bước tiếp theo

- Chưa đăng nhập Customer/Admin thành công; chưa thử tìm kiếm, đặt hàng, CRUD quản trị, phân trang, thông báo lỗi API hoặc đăng xuất sau đăng nhập.
- Chưa xác minh luồng gọi API/DB từ trình duyệt. Không sử dụng thông tin xác thực thật trong lượt rà soát này.
- Tiếp tục bằng tài khoản kiểm thử Customer và Admin cùng backend/DB test có thể truy cập; kiểm thử lần lượt luồng thành công, lỗi, quyền truy cập, thao tác dữ liệu và bố cục desktop/mobile.
- Xác nhận yêu cầu của checkbox ghi nhớ: nếu giữ tùy chọn, cần triển khai hành vi có khác biệt; nếu không hỗ trợ, bỏ checkbox hoặc đổi nội dung để tránh gây hiểu nhầm.

| Ngày | Nội dung cập nhật | Người cập nhật |
|---|---|---|
| 2026-10-06 | Mở Expo Web Customer và Next.js Admin; kiểm tra trang đăng nhập/đăng ký công khai, chuyển hướng khi chưa đăng nhập và bố cục Admin trên màn hình nhỏ. Ghi nhận checkbox ghi nhớ phiên chưa được nối với hành vi lưu token; các màn hình yêu cầu xác thực chờ kiểm thử bằng tài khoản test. | Copilot |

## 8. Rà soát chức năng Web Admin và Restaurant

**Phạm vi:** Đối chiếu toàn bộ route/page và service của `fooddeliveryapp_restaurant_admin` với API backend liên quan. Đánh giá dưới đây xác nhận chức năng có trong mã và phạm vi thao tác được nối từ UI; không khẳng định luồng dữ liệu thật hoạt động vì chưa đăng nhập bằng tài khoản kiểm thử và chưa kiểm thử với MySQL.

### Admin

| Chức năng | Đã làm được trong mã | Chưa làm / giới hạn hiện tại |
|---|---|---|
| Đăng nhập và bảo vệ khu vực Admin | Trang đăng nhập chung `/` cho phép chọn Admin; trang `/admin/login` cũng có đăng nhập riêng. Admin dashboard kiểm tra access token, gọi profile và yêu cầu role `ADMIN`; trang cần đăng nhập sẽ chuyển về `/admin/login` khi chưa có phiên hợp lệ. | Có hai giao diện/đường dẫn đăng nhập Admin cần thống nhất. Checkbox “Ghi nhớ đăng nhập” ở trang `/` không làm thay đổi cách lưu token. Chưa xác minh bằng tài khoản Admin hợp lệ. |
| Dashboard | Hiển thị tổng số đơn, doanh thu nhà hàng, số nhà hàng/shipper/customer, đơn hôm nay, đơn hoàn thành/chờ/hủy và doanh thu hôm nay; có nút tải lại. | Chưa có biểu đồ/lọc khoảng ngày hoặc báo cáo xu hướng ở UI, dù backend có API doanh thu Admin. Số liệu chưa đối chiếu DB thật. |
| Danh mục món ăn | Liệt kê/tìm kiếm và tạo/sửa/xóa danh mục; bật/tắt trạng thái hoạt động. | Chưa kiểm thử thao tác trên dữ liệu thật. |
| Customer | Tìm kiếm/liệt kê, xem chi tiết, tạo tài khoản qua API đăng ký, khóa/mở khóa. | Không có sửa thông tin hoặc xóa Customer từ giao diện/API Admin hiện có. |
| Restaurant | Tìm kiếm/liệt kê, xem hồ sơ và đổi trạng thái nhà hàng. | Không có tạo/sửa/xóa hồ sơ nhà hàng trong Admin portal/API Admin hiện tại. |
| Shipper | Tìm kiếm/liệt kê, xem chi tiết, khóa/mở khóa tài khoản. | Không có tạo/sửa/xóa hồ sơ Shipper trong Admin portal/API Admin hiện tại. |
| Đơn hàng | Tìm kiếm/liệt kê và xem chi tiết gồm thông tin đơn, món, địa chỉ, thanh toán/giao hàng/lịch sử. | Admin chưa có thao tác đổi trạng thái hoặc hủy đơn. |
| Đánh giá | Liệt kê và ẩn/hiện đánh giá để kiểm duyệt. | Chưa có thao tác tạo/sửa đánh giá; chưa kiểm thử API. |
| Voucher | Liệt kê, tạo, sửa và xóa voucher. | Chưa kiểm thử validate/CRUD với backend và DB thật. |

### Restaurant

| Chức năng | Đã làm được trong mã | Chưa làm / giới hạn hiện tại |
|---|---|---|
| Đăng nhập | Trang `/` có lựa chọn Nhà hàng; `RestaurantPortalShell` kiểm tra profile/role trên toàn bộ `/restaurant/*`, đưa phiên không hợp lệ về `/` và có logout. | Đã kiểm tra lint/build và API smoke auth guard; chưa xác minh login/logout bằng tài khoản Restaurant đang hoạt động. |
| Dashboard | Hiển thị KPI và doanh thu theo khoảng ngày/nhóm thời gian, có tải lại và trạng thái lỗi/đang tải. | Chưa đối soát phép tính và dữ liệu với MySQL thật. |
| Thực đơn và hồ sơ | CRUD món, bật/tắt món; trang hồ sơ cho phép sửa thông tin cửa hàng, ảnh, email và mật khẩu. Backend có `GET/PATCH /api/restaurants/me` với owner scoping. | Chưa thử lưu hồ sơ, upload ảnh hoặc CRUD món bằng tài khoản/DB thật. |
| Xử lý đơn và lịch sử | Lọc đơn theo trạng thái; xác nhận, từ chối, chuẩn bị và sẵn sàng lấy hàng; tải chi tiết món theo yêu cầu; trang lịch sử hiển thị đơn kết thúc và timeline trạng thái. | Chưa kiểm thử quy trình nhiều vai trò với API/DB thật. |
| Điều hướng và giao diện mobile | Sidebar desktop và bottom navigation 5 mục trên mobile; các trang mới có bố cục responsive. | Chưa nghiệm thu trực quan trên thiết bị hoặc các viewport mục tiêu. |

### Bằng chứng kiểm tra và việc cần làm tiếp

- Có 8 trang chức năng Admin (dashboard, categories, customers, restaurants, shippers, orders, reviews, vouchers) và 5 trang Restaurant (dashboard, menu, orders, history, profile), ngoài các route đăng nhập/chung.
- `npm --prefix fooddeliveryapp_backend test`: 28 passed, 0 failed, 1 skipped; bao gồm kiểm thử giới hạn 3 địa chỉ, smoke test xác nhận profile route trả 401 khi chưa đăng nhập và 403 cho CUSTOMER.
- `npm --prefix fooddeliveryapp_restaurant_admin run lint`: đạt.
- `npm --prefix fooddeliveryapp_restaurant_admin run build`: đạt, gồm biên dịch và kiểm tra TypeScript; giao diện Restaurant đã chuyển sang tông quản trị trung tính, giảm nhấn màu/bo góc/đổ bóng.
- `git diff --check`: đạt.
- Chưa tìm thấy test script/test suite tự động riêng cho portal; chưa đăng nhập bằng tài khoản Restaurant hoặc chạy lưu hồ sơ/CRUD/đơn hàng/báo cáo với MySQL.
- Bước tiếp theo: kiểm thử E2E bằng tài khoản/DB test; tiếp tục chốt scope Admin còn thiếu (CRUD và báo cáo); rà soát/giải quyết các vấn đề Customer và Shipper đang mở.

| Ngày | Nội dung cập nhật | Người cập nhật |
|---|---|---|
| 2026-10-06 | Tinh chỉnh giao diện Restaurant theo phong cách portal vận hành chuyên nghiệp: màu trung tính, điểm nhấn tiết chế, bố cục sidebar/header gọn và danh sách thực đơn rõ ràng; xác minh lint/build. | Copilot |
| 2026-10-06 | Cập nhật kết quả rà soát Admin/Restaurant sau khi hoàn thiện portal Restaurant; phân biệt rõ chức năng có trong mã với phần chưa nghiệm thu qua E2E/DB thật. | Copilot |
| 2026-10-06 | Rà soát toàn bộ trang và service Web Admin/Restaurant, đối chiếu thao tác UI với API backend; ghi rõ chức năng đã có, giới hạn/chức năng chưa có và các phần chưa thể nghiệm thu nếu thiếu tài khoản hoặc DB test. | Copilot |
