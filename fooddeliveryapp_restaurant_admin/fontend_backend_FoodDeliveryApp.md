## Hướng Dẫn Vibe Coding Cho GitHub Copilot Edits / Chat

BẠN HÃY ĐÓNG VAI LÀ MỘT SENIOR FRONTEND DEVELOPER CHUYÊN VỀ NEXT.JS (APP ROUTER), TYPESCRIPT, VÀ TAILWIND CSS,..

Chúng ta đang trong dự án Food-Delivery-App-main.
Nhiệm vụ của bạn là phát triển hoàn thiện toàn bộ phân hệ Admin Portal thuộc thư mục fooddeliveryapp_restaurant_admin dựa trên API hiện có từ backend fooddeliveryapp_backend.

## QUY TẮC VÀ RÀNG BUỘC QUAN TRỌNG

## NGHIÊM CẤM CHỈNH SỬA BACKEND

Thư mục fooddeliveryapp_backend là CỐ ĐỊNH. Không được chỉnh sửa bất kỳ đường dẫn API, DTO, hay logic nào thuộc backend. Bạn chỉ đọc file backend để kiểm tra endpoint, DTOs, Auth Token format và response structure.

## ⛔ QUY ĐỊNH GIỚI HẠN CHẠY FILE (CRITICAL CONSTRAINT)

chỉ được chạy 2 folder liên quan là fooddeliveryapp_backend và fooddeliveryapp_restaurant_admin ko chạy những folder ko liên quan

## KẾT NỐI API THỰC TẾ

Mọi tính năng đều phải kết nối API thực tế tới Backend qua thư mục services/ (hoặc Axios/Fetch instance).

## TUÂN THỦ CẤU TRÚC FOLDER

Tuân thủ chính xác cấu trúc Next.js App Router được định nghĩa dưới đây.

## BẮT BUỘC ĐẦY ĐỦ CÁC TÍNH NĂNG CƠ BẢN (CRUD + TÌM KIẾM + LÀM MỚI)

Ngoại trừ trang Login (Đăng nhập) và trang Dashboard (Báo cáo/Thống kê), TẤT CẢ các trang quản lý chức năng còn lại bắt buộc phải đáp ứng đầy đủ các tính năng sau:

THÊM MỚI (CREATE): Form / Modal nhập thông tin để tạo mới dữ liệu.

SỬA (UPDATE): Form / Modal chỉnh sửa dữ liệu đã có.

XÓA / ĐỔI TRẠNG THÁI (DELETE / TOGGLE STATUS): Thực hiện xóa bản ghi hoặc đổi trạng thái (Active/Inactive, Block/Unblock, Approve/Reject) tùy thuộc vào logic endpoint của Backend.

TÌM KIẾM (SEARCH): Input tìm kiếm theo từ khóa (tên, email, mã đơn hàng,...) kèm debounce hoặc nút Search.

LÀM MỚI (REFRESH): Nút Reload/Refresh dữ liệu để gọi lại API cập nhật danh sách mới nhất.

## CẤU TRÚC CÁC TRANG VÀ ROUTING (app/admin)

Vui lòng tạo/cập nhật cấu trúc thư mục trong fooddeliveryapp_restaurant_admin/app/admin như sau:

app/
└── admin/
├── login/
│ └── page.tsx # Trang đăng nhập dành riêng cho Admin (Ngoại lệ: Không áp dụng bộ CRUD)
└── (dashboard)/
├── layout.tsx # Shared Dashboard Layout (Sidebar + Header)
├── dashboard/
│ └── page.tsx # Trang Báo cáo / Thống kê (Ngoại lệ: Chỉ hiển thị dữ liệu báo cáo/thống kê)
├── categories/
│ └── page.tsx # Quản lý Danh mục (Đầy đủ: Thêm, Sửa, Xóa, Tìm kiếm, Làm mới)
├── customers/
│ └── page.tsx # Quản lý Khách hàng (Đầy đủ: Thêm, Sửa, Xóa/Khóa, Tìm kiếm, Làm mới)
├── restaurants/
│ └── page.tsx # Quản lý Nhà hàng (Đầy đủ: Thêm, Sửa, Xóa/Khóa, Tìm kiếm, Làm mới)
├── shippers/
│ └── page.tsx # Quản lý Tài xế / Shipper (Đầy đủ: Thêm, Sửa, Xóa/Khóa, Tìm kiếm, Làm mới)
├── orders/
│ └── page.tsx # Quản lý Đơn hàng (Đầy đủ: Thêm/Tạo đơn, Sửa/Cập nhật trạng thái, Xóa/Hủy đơn, Tìm kiếm, Làm mới)
├── reviews/
│ └── page.tsx # Quản lý Đánh giá (Đầy đủ: Thêm, Sửa, Xóa/Ẩn, Tìm kiếm, Làm mới)
└── vouchers/
└── page.tsx # Quản lý Mã giảm giá (Đầy đủ: Thêm, Sửa, Xóa, Tìm kiếm, Làm mới)

## THIẾT KẾ DÙNG CHUNG (LAYOUT & WIREFRAME)

## TRANG LOGIN (app/admin/login/page.tsx)

Giao diện Login tối giản, bao gồm: Email/Username, Password, nút "Đăng nhập".

Xử lý lưu Token (JWT) vào localStorage hoặc cookies sau khi gọi API đăng nhập thành công từ Backend.

Tự động chuyển hướng đến /admin/dashboard khi authenticated thành công.

## SHARED DASHBOARD LAYOUT (app/admin/(dashboard)/layout.tsx)

Layout dùng chung áp dụng cho tất cả các trang nằm trong nhóm (dashboard). Thiết kế dựa theo Wireframe:

+-------------------------------------------------------------------+
| ADMIN | Management System Administrator| <- Header Bar
+---------+---------------------------------------------------------+
| Danh mục| |
| Customer| |
| Restau..| |
| Shipper | NỘI DUNG TRANG | <- Main Content Area
| Order | (children dynamic component) |
| Đánh giá| |
| Voucher | |
|---------| |
|Đăng xuất| | <- Logout Action
+---------+---------------------------------------------------------+

## HEADER COMPONENT

Trái: Logo / Brand Name (ADMIN | Management System)

Phải: Tên tài khoản đang đăng nhập (mặc định: Administrator hoặc lấy thông tin từ Profile User).

## SIDEBAR COMPONENT

Danh sách Menu chuyển trang bao gồm:

Danh mục (/admin/categories)

Customer (/admin/customers)

Restaurant (/admin/restaurants)

Shipper (/admin/shippers)

Order (/admin/orders)

Đánh giá (/admin/reviews)

Voucher (/admin/vouchers)

Cuối Sidebar: Nút Đăng xuất (Xóa Token và chuyển hướng về /admin/login).

MÔ TẢ CHI TIẾT CÁC TÍNH NĂNG TỪNG TRANG

Hãy kiểm tra các Controller/API tương ứng trong fooddeliveryapp_backend để viết đầy đủ logic kết nối API cho từng trang:

## 1. TRANG DASHBOARD (/admin/dashboard) - NGOẠI LỆ: BÁO CÁO/THỐNG KÊ

Hiển thị các thẻ tổng quan (Thống kê Đơn hàng, Doanh thu, Số lượng Nhà hàng, Shipper, Khách hàng).

Nút Làm mới dữ liệu báo cáo.

## 2. TRANG QUẢN LÝ DANH MỤC (/admin/categories) - YÊU CẦU CRUD

Thêm mới danh mục món ăn.

Chỉnh sửa thông tin danh mục.

Xóa / Khóa danh mục.

Tìm kiếm danh mục theo tên.

Làm mới bảng dữ liệu danh mục.

## 3. TRANG QUẢN LÝ KHÁCH HÀNG (/admin/customers) - YÊU CẦU CRUD

Thêm tài khoản/thông tin khách hàng mới.

Sửa thông tin cá nhân/hồ sơ khách hàng.

Xóa hoặc Đổi trạng thái (Mở/Khóa tài khoản khách hàng).

Tìm kiếm khách hàng theo Tên / Email / SĐT.

Làm mới danh sách khách hàng.

## 4. TRANG QUẢN LÝ NHÀ HÀNG (/admin/restaurants) - YÊU CẦU CRUD

Thêm mới nhà hàng đối tác.

Sửa thông tin nhà hàng (Tên, Địa chỉ, Giờ mở cửa,...).

Xóa hoặc Phê duyệt / Khóa nhà hàng.

Tìm kiếm nhà hàng theo Tên / Địa chỉ.

Làm mới danh sách nhà hàng.

## 5. TRANG QUẢN LÝ SHIPPER (/admin/shippers) - YÊU CẦU CRUD

Thêm mới tài xế.

Sửa thông tin tài xế.

Xóa hoặc Phê duyệt / Đổi trạng thái hoạt động tài xế.

Tìm kiếm tài xế theo Tên / SĐT / Biển số xe.

Làm mới danh sách tài xế.

## 6. TRANG QUẢN LÝ ĐƠN HÀNG (/admin/orders) - YÊU CẦU CRUD

Tạo/Thêm đơn hàng thủ công (nếu backend hỗ trợ).

Sửa/Cập nhật trạng thái đơn hàng (Đã tiếp nhận, Đang giao, Hoàn thành, Đã hủy).

Xóa/Hủy đơn hàng.

Tìm kiếm đơn hàng theo Mã đơn / Tên khách hàng.

Làm mới danh sách đơn hàng.

## 7. TRANG QUẢN LÝ ĐÁNH GIÁ (/admin/reviews) - YÊU CẦU CRUD

Thêm đánh giá/phản hồi mẫu (nếu backend hỗ trợ).

Chỉnh sửa nội dung đánh giá.

Xóa hoặc Ẩn các đánh giá không phù hợp.

Tìm kiếm đánh giá theo Tên khách hàng / Nội dung / Món ăn.

Làm mới danh sách đánh giá.

## 8. TRANG QUẢN LÝ VOUCHER (/admin/vouchers) - YÊU CẦU CRUD

Thêm mới mã giảm giá/khuyến mãi.

Chỉnh sửa thời hạn, điều kiện và số lượng voucher.

Xóa / Vô hiệu hóa mã giảm giá.

Tìm kiếm voucher theo Mã / Tên chương trình.

Làm mới danh sách voucher.

## BẮT ĐẦU THỰC HIỆN KHI XỬ LÝ PROMPT

Hãy phân tích file cấu trúc Backend hiện có, sau đó lần lượt viết code cho:

services/admin/: Các hàm API CRUD tương ứng gọi đến backend.

types/admin/: Các Type/Interface TypeScript dựa trên DTO Backend.

app/admin/login/page.tsx: Trang login riêng biệt.

app/admin/(dashboard)/layout.tsx: Layout chung cho Admin (Sidebar & Header đúng wireframe).

Tất cả các trang page.tsx còn lại với giao diện tích hợp thanh Toolbar (Ô tìm kiếm, Nút Thêm mới, Nút Làm mới Data) và Bảng dữ liệu có cột Thao tác (Nút Sửa, Nút Xóa).
