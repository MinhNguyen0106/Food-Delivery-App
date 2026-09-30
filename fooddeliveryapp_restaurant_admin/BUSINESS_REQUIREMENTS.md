BÁO CÁO PHÂN TÍCH NGHIỆP VỤ HỆ THỐNG FOOD DELIVERY APP

1. TỔNG QUAN HỆ THỐNG
   1.1. Mục đích
   Hệ thống Food Delivery App là một nền tảng hỗ trợ đặt và giao đồ ăn trực tuyến, kết nối Customer với Restaurant và Shipper dưới sự quản lý của Admin. Hệ thống số hóa các nghiệp vụ từ tìm kiếm nhà hàng, lựa chọn món ăn, đặt hàng, nhà hàng tiếp nhận và chuẩn bị món, shipper nhận và giao hàng cho đến khi đơn hoàn thành và Customer thực hiện đánh giá.
   Hệ thống được xây dựng theo mô hình nhiều ứng dụng/phân hệ, trong đó mỗi nhóm người dùng sử dụng một giao diện phù hợp với nghiệp vụ của mình:
   • Customer Mobile App: ứng dụng dành cho khách hàng.
   • Restaurant Web: trang quản lý dành cho nhà hàng.
   • Shipper Mobile App: ứng dụng dành cho shipper.
   • Admin Web: trang quản trị toàn hệ thống.
   • Backend API: xử lý nghiệp vụ, xác thực, phân quyền và kết nối cơ sở dữ liệu.
   • Database MySQL: lưu trữ thông tin tài khoản, nhà hàng, món ăn, đơn hàng, giao hàng, đánh giá, voucher và các dữ liệu liên quan.
   Trong phạm vi đồ án, hệ thống tập trung vào nghiệp vụ đặt và giao đồ ăn cơ bản, không triển khai các chức năng nâng cao như theo dõi GPS shipper theo thời gian thực hoặc thanh toán trực tuyến qua cổng thanh toán.
   1.2. Mục tiêu nghiệp vụ
   Hệ thống hướng tới các mục tiêu sau:
1. Cho phép Customer đăng ký, đăng nhập và tìm kiếm các Restaurant đang hoạt động.
1. Cho phép Customer xem menu, lựa chọn món ăn, quản lý giỏ hàng và địa chỉ giao hàng.
1. Cho phép Customer đặt hàng và thanh toán bằng hình thức COD (Cash on Delivery).
1. Tự động tính phí giao hàng dựa trên khoảng cách giữa Restaurant và địa chỉ giao hàng của Customer.
1. Cho phép Restaurant tiếp nhận, xác nhận, từ chối và xử lý đơn hàng đến khi món sẵn sàng giao.
1. Cho phép Shipper trực tuyến nhận yêu cầu giao hàng, nhận món tại Restaurant và giao đến Customer.
1. Cho phép Customer theo dõi trạng thái đơn hàng theo từng bước nghiệp vụ, nhưng không theo dõi vị trí GPS của Shipper theo thời gian thực.
1. Cho phép Customer xem lịch sử đơn hàng và đánh giá đơn hàng sau khi giao thành công.
1. Cho phép Admin quản lý Customer, Restaurant, Shipper, danh mục món ăn, Order, Review, Voucher và các báo cáo thống kê cơ bản.
1. Hỗ trợ quản lý trạng thái và lịch sử của đơn hàng xuyên suốt vòng đời nghiệp vụ.
   1.3. Phạm vi hệ thống
   Trong phạm vi
   • Đăng ký Customer.
   • Đăng nhập và đăng xuất.
   • Quản lý thông tin tài khoản cá nhân.
   • Tìm kiếm và khám phá Restaurant.
   • Xem menu và chi tiết món ăn.
   • Quản lý giỏ hàng.
   • Quản lý địa chỉ giao hàng.
   • Chọn địa chỉ bằng cách nhập địa chỉ hoặc lựa chọn vị trí trên bản đồ.
   • Lưu và lựa chọn địa chỉ giao hàng.
   • Tính phí giao hàng theo khoảng cách giữa Restaurant và địa chỉ giao hàng.
   • Đặt hàng bằng COD.
   • Restaurant xử lý đơn hàng.
   • Shipper nhận và thực hiện giao hàng.
   • Theo dõi trạng thái đơn hàng.
   • Quản lý lịch sử đơn hàng.
   • Customer đánh giá Order sau khi Order hoàn thành.
   • Admin quản lý danh mục món ăn dùng chung toàn hệ thống.
   • Admin quản lý Customer, Restaurant, Shipper, Order, Review và Voucher.
   • Báo cáo, thống kê cơ bản.
   Ngoài phạm vi
   • Thanh toán online qua MoMo, VNPay, thẻ ngân hàng hoặc cổng thanh toán khác.
   • Theo dõi GPS Shipper theo thời gian thực.
   • Chat realtime giữa Customer, Restaurant và Shipper.
   • Thuật toán phân phối Shipper phức tạp dựa trên AI.
   • Dynamic pricing/phí giao hàng thay đổi theo thời tiết hoặc nhu cầu.
   • Chương trình thành viên nhiều cấp.
   • Hệ thống quảng cáo và đấu thầu vị trí hiển thị.
   • Nhiều loại voucher phức tạp.
   • Đối soát tài chính tự động giữa nền tảng, Restaurant và Shipper.
1. CÁC ACTOR TRONG HỆ THỐNG
   Hệ thống có 4 Actor chính.
   Actor Mô tả Nền tảng
   Customer Người tìm kiếm, đặt và nhận đồ ăn Mobile App
   Restaurant Nhà hàng cung cấp món ăn và xử lý đơn hàng Web
   Shipper Người nhận món tại Restaurant và giao đến Customer Mobile App
   Admin Người quản trị và giám sát toàn bộ hệ thống Web
   2.1. Customer
   Customer là người sử dụng ứng dụng để tìm kiếm Restaurant, xem món ăn, tạo giỏ hàng, lựa chọn địa chỉ, đặt hàng, theo dõi đơn hàng và đánh giá sau khi hoàn thành.
   2.2. Restaurant
   Restaurant là đơn vị cung cấp đồ ăn. Restaurant sử dụng Web để quản lý thông tin cửa hàng, món ăn và xử lý các Order được Customer gửi đến.
   2.3. Shipper
   Shipper là người thực hiện khâu giao hàng. Shipper sử dụng Mobile App để chuyển trạng thái hoạt động, nhận yêu cầu giao hàng, nhận món tại Restaurant và xác nhận giao hàng thành công.
   2.4. Admin
   Admin quản lý toàn bộ nền tảng, bao gồm tài khoản, Restaurant, Shipper, danh mục món ăn, Order, Review, Voucher và báo cáo thống kê.
   Lưu ý về Payment Gateway: Trong phiên bản hiện tại, hệ thống chỉ sử dụng COD nên Payment Gateway không được xem là Actor nghiệp vụ chính. Nếu sau này triển khai thanh toán online, Payment Gateway có thể được bổ sung như một hệ thống bên ngoài.

---

3. PHÂN NHÓM CHỨC NĂNG TOÀN HỆ THỐNG
   3.1. Customer
1. Đăng ký.
1. Đăng nhập.
1. Quản lý tài khoản.
1. Tìm kiếm và khám phá nhà hàng.
1. Xem và lựa chọn món ăn.
1. Quản lý giỏ hàng.
1. Quản lý địa chỉ giao hàng.
1. Đặt hàng.
1. Theo dõi đơn hàng.
1. Quản lý đơn hàng.
1. Đánh giá đơn hàng.
   3.2. Restaurant
1. Đăng nhập.
1. Quản lý tài khoản nhà hàng.
1. Quản lý thông tin nhà hàng.
1. Quản lý món ăn.
1. Quản lý đơn hàng.
1. Quản lý lịch sử và doanh thu.
   3.3. Shipper
1. Đăng nhập.
1. Quản lý tài khoản Shipper.
1. Quản lý trạng thái hoạt động.
1. Quản lý yêu cầu giao hàng.
1. Thực hiện giao hàng.
1. Quản lý lịch sử giao hàng.
   3.4. Admin
1. Đăng nhập.
1. Quản lý tài khoản Admin.
1. Quản lý danh mục món ăn.
1. Quản lý Customer.
1. Quản lý Restaurant.
1. Quản lý Shipper.
1. Quản lý Order.
1. Quản lý đánh giá.
1. Quản lý Voucher.
1. Báo cáo và thống kê.
   3.5. Nguyên tắc tổ chức chức năng
   Đăng ký và Đăng nhập được xác định là các Use Case độc lập, không đặt bên trong Use Case “Quản lý tài khoản”.
   Use Case Quản lý tài khoản tập trung vào các thao tác sau:
   • Đăng xuất.
   • Xem thông tin cá nhân.
   • Cập nhật thông tin cá nhân.
   • Đổi mật khẩu.
   • Khôi phục mật khẩu nếu hệ thống triển khai chức năng này.
   Đăng nhập được xem là điều kiện tiên quyết đối với các chức năng yêu cầu xác thực, thay vì tạo quan hệ <<include>> Đăng nhập với mọi Use Case.

---

4. NGHIỆP VỤ CUSTOMER
   4.1. Đăng ký
   Mục đích
   Cho phép người dùng mới tạo tài khoản Customer để sử dụng hệ thống.
   Thông tin nhập
   • Họ tên.
   • Số điện thoại.
   • Email.
   • Mật khẩu.
   Quy trình
1. Người dùng mở chức năng đăng ký.
1. Nhập thông tin tài khoản.
1. Hệ thống kiểm tra các trường bắt buộc.
1. Hệ thống kiểm tra Email/Số điện thoại đã tồn tại hay chưa.
1. Nếu thông tin hợp lệ, hệ thống tạo tài khoản Customer.
1. Tài khoản được tạo ở trạng thái hoạt động theo chính sách hệ thống.
   Business Rule
   • Email không được trùng.
   • Số điện thoại không được trùng nếu hệ thống dùng số điện thoại làm định danh.
   • Mật khẩu phải đáp ứng yêu cầu tối thiểu của hệ thống.
   • Không cho phép tạo tài khoản nếu dữ liệu không hợp lệ.

---

4.2. Đăng nhập
Customer nhập thông tin tài khoản để xác thực và truy cập các chức năng yêu cầu đăng nhập.
Quy trình

1. Customer nhập Email/Số điện thoại và mật khẩu.
2. Hệ thống kiểm tra tài khoản.
3. Hệ thống kiểm tra trạng thái tài khoản.
4. Nếu thông tin hợp lệ, hệ thống tạo phiên đăng nhập.
5. Customer được chuyển vào ứng dụng.
   Business Rule
   • Tài khoản bị khóa không được đăng nhập.
   • Thông tin xác thực không hợp lệ thì hệ thống từ chối đăng nhập.

---

4.3. Quản lý tài khoản Customer
Customer có thể:
• Đăng xuất.
• Xem thông tin cá nhân.
• Cập nhật họ tên.
• Cập nhật số điện thoại.
• Cập nhật email.
• Cập nhật ảnh đại diện.
• Đổi mật khẩu.
• Khôi phục mật khẩu nếu quên mật khẩu.

---

4.4. Tìm kiếm và khám phá nhà hàng
4.4.1. Xem danh sách nhà hàng
Hệ thống hiển thị các Restaurant đang hoạt động.
Thông tin có thể gồm:
• Tên Restaurant.
• Hình ảnh.
• Địa chỉ.
• Đánh giá.
• Khoảng cách.
• Trạng thái mở/đóng cửa.
4.4.2. Tìm kiếm nhà hàng
Customer nhập từ khóa để tìm Restaurant theo tên hoặc thông tin liên quan.
4.4.3. Lọc nhà hàng
Customer có thể lọc theo các tiêu chí cơ bản:
• Loại món ăn/danh mục.
• Khoảng giá.
• Đánh giá.
• Khoảng cách.
4.4.4. Xem thông tin nhà hàng
Customer có thể xem:
• Tên.
• Hình ảnh.
• Địa chỉ.
• Số điện thoại.
• Giờ hoạt động.
• Mô tả.
• Đánh giá.
• Menu.
Business Rule
Restaurant đang đóng cửa hoặc không hoạt động không được nhận Order mới.

---

4.5. Xem và lựa chọn món ăn
4.5.1. Xem menu
Customer xem các món ăn thuộc Restaurant.
Các món được phân loại theo danh mục dùng chung do Admin quản lý.
Ví dụ:
• Cơm.
• Mì & Phở.
• Gà.
• Burger.
• Pizza.
• Bánh mì.
• Đồ ăn vặt.
• Lẩu.
• Sushi.
• Đồ chay.
• Đồ uống.
• Tráng miệng.
Restaurant không tự tạo danh mục riêng. Khi Restaurant thêm món ăn, Restaurant lựa chọn một danh mục do Admin đã tạo.
Cách tổ chức này giúp các danh mục có tên thống nhất giữa các Restaurant và giúp Customer dễ dàng tìm kiếm, lọc món ăn trên toàn hệ thống.
4.5.2. Tìm kiếm món ăn
Có thể tìm kiếm món ăn bằng cách nhập tên món ăn vào search bar
4.5.3. Xem chi tiết món ăn
Thông tin món gồm:
• Tên món.
• Hình ảnh.
• Giá.
• Mô tả.
• Danh mục.
• Trạng thái AVAILABLE/UNAVAILABLE.
4.5.4. Chọn số lượng
Customer lựa chọn số lượng món trước khi thêm vào giỏ.
Business Rule
Món ăn ở trạng thái UNAVAILABLE không được thêm vào Order.

---

4.6. Quản lý giỏ hàng
4.6.1. Thêm món vào giỏ
Customer có thể thêm Food vào Cart nếu món ăn đang ở trạng thái AVAILABLE.
Khi Customer thêm món đầu tiên, hệ thống xác định Restaurant của món ăn và gắn Restaurant đó với Cart.
4.6.2. Thay đổi số lượng
Customer có thể tăng hoặc giảm số lượng món trong Cart.
Hệ thống cập nhật lại:
• Số lượng.
• Đơn giá.
• Thành tiền của Cart Item.
• Tổng tiền tạm tính của Cart.
4.6.3. Xóa món
Customer có thể xóa một món khỏi Cart.
Nếu Cart không còn Cart Item nào, Cart trở thành Cart rỗng và có thể được sử dụng để thêm món từ Restaurant khác.
4.6.4. Xem tổng tiền
Hệ thống tính:
Tạm tính món ăn + Phí giao hàng - Giảm giá = Tổng thanh toán
Trong đó:
• Tạm tính: tổng tiền các món ăn trong Cart.
• Phí giao hàng: được tính dựa trên khoảng cách giữa Restaurant và địa chỉ giao hàng.
• Giảm giá: giá trị Voucher nếu Voucher hợp lệ.
• Tổng thanh toán: số tiền Customer cần thanh toán khi nhận hàng.
4.6.5. Quy tắc một Restaurant
Một Cart chỉ được chứa Food của một Restaurant.
Khi Customer đang có Food của Restaurant A trong Cart nhưng chọn thêm Food của Restaurant B, hệ thống không cho phép hai Restaurant cùng tồn tại trong một Cart.
Hệ thống yêu cầu Customer xác nhận xóa Cart hiện tại trước khi tạo Cart mới cho Restaurant B.
Business Rule
• Food phải ở trạng thái AVAILABLE mới được thêm vào Cart.
• Một Cart chỉ chứa Food của một Restaurant.
• Mỗi Customer chỉ có một Cart hiện tại.
4.7. Quản lý địa chỉ giao hàng
4.7.1. Thêm địa chỉ
Customer có thể tạo địa chỉ giao hàng bằng cách:
• Nhập địa chỉ bằng văn bản.
• Chọn vị trí trên bản đồ.
• Nhập tên địa chỉ để dễ nhận biết.
• Nhập thông tin người nhận.
• Nhập số điện thoại.
• Thêm ghi chú giao hàng.
4.7.2. Chọn vị trí trên bản đồ
Customer có thể lựa chọn vị trí giao hàng trên bản đồ. Hệ thống lưu thông tin vị trí phục vụ việc xác định địa chỉ và tính khoảng cách.
4.7.3. Sửa địa chỉ
Customer cập nhật thông tin địa chỉ đã lưu.
4.7.4. Xóa địa chỉ
Customer xóa địa chỉ không còn sử dụng.
4.7.5. Chọn địa chỉ khi Checkout
Customer lựa chọn một địa chỉ đã lưu hoặc tạo địa chỉ mới trong quá trình Checkout.
Business Rule
Địa chỉ giao hàng phải có đủ thông tin cần thiết để hệ thống xác định nơi giao hàng.

---

5. NGHIỆP VỤ ĐẶT HÀNG
   5.1. Tổng quan
   Đặt hàng là nghiệp vụ cốt lõi của hệ thống.
   Quy trình tổng quát:
   Restaurant → Menu → Food → Cart → Checkout → Address → Delivery Fee → Voucher → COD → Place Order

---

5.2. Checkout
Customer kiểm tra:
• Restaurant.
• Danh sách món.
• Số lượng.
• Tạm tính.
• Địa chỉ giao hàng.
• Phí giao hàng.
• Voucher.
• Tổng thanh toán.
• Phương thức thanh toán.

---

5.3. Tính phí giao hàng
Hệ thống tính phí giao hàng dựa trên khoảng cách giữa:
Vị trí Restaurant → Vị trí địa chỉ giao hàng của Customer
Quy trình:

1. Xác định vị trí của Restaurant.
2. Xác định vị trí của địa chỉ giao hàng.
3. Tính khoảng cách giữa hai vị trí.
4. Áp dụng công thức hoặc mức phí đã được cấu hình.
5. Hiển thị phí giao hàng cho Customer.
6. Lưu phí giao hàng vào Order.
7. Cộng phí giao hàng vào tổng thanh toán.
   Thông tin vị trí của Restaurant được lưu bằng:
   • Latitude.
   • Longitude.
   Thông tin vị trí của Address cũng được lưu bằng:
   • Latitude.
   • Longitude.
   Trong phạm vi đồ án, không yêu cầu Shipper bật GPS để hệ thống liên tục theo dõi vị trí. Khoảng cách phục vụ việc tính phí chỉ được xác định giữa Restaurant và điểm giao hàng của Customer.
   Ví dụ:
   • Tiền món: 100.000đ.
   • Phí giao hàng: 25.000đ.
   • Voucher: 0đ.
   • Tổng thanh toán: 125.000đ.
   Phí giao hàng là một giá trị thuộc Order, không yêu cầu xây dựng một đối tượng nghiệp vụ riêng cho DeliveryFee.
   5.4. Áp dụng Voucher
   Customer có thể nhập/chọn Voucher trong Checkout.
   Hệ thống kiểm tra:
   • Voucher có tồn tại hay không.
   • Voucher có đang hoạt động hay không.
   • Thời gian hiệu lực.
   • Điều kiện giá trị đơn hàng tối thiểu.
   • Giới hạn số lần sử dụng.
   • Giá trị giảm.
   Nếu hợp lệ, hệ thống áp dụng giảm giá vào tổng đơn.
   Ví dụ:
   • Code: GIAM30K.
   • Giảm: 30.000đ.
   • Đơn tối thiểu: 150.000đ.
   • Trạng thái: ACTIVE.

---

5.5. Chọn phương thức thanh toán
Trong phạm vi đồ án chỉ hỗ trợ:
COD – Cash on Delivery
Customer thanh toán tiền mặt cho Shipper khi nhận hàng.
Không triển khai:
• MoMo.
• VNPay.
• Thẻ ngân hàng.
• Cổng thanh toán trực tuyến.

---

5.6. Xác nhận đặt hàng
Sau khi Customer xác nhận:

1. Hệ thống kiểm tra Restaurant.
2. Kiểm tra trạng thái các món ăn.
3. Kiểm tra số lượng món.
4. Kiểm tra địa chỉ giao hàng.
5. Tính phí giao hàng.
6. Kiểm tra Voucher nếu có.
7. Tính tổng tiền.
8. Tạo Order.
9. Gán trạng thái PENDING.
10. Thông báo Order cho Restaurant.

---

6. VÒNG ĐỜI ĐƠN HÀNG
   6.1. Sơ đồ trạng thái
   PENDING
   │
   ├──────────────→ CANCELLED
   │
   ├──────────────→ REJECTED
   │
   ↓
   CONFIRMED
   ↓
   PREPARING
   ↓
   READY_FOR_PICKUP
   ↓
   PICKED_UP
   ↓
   DELIVERING
   ↓
   COMPLETED
   6.2. Ý nghĩa trạng thái
   Trạng thái Ý nghĩa
   PENDING Customer vừa tạo Order, đang chờ Restaurant xử lý
   CONFIRMED Restaurant đã chấp nhận Order
   PREPARING Restaurant đang chuẩn bị món
   READY_FOR_PICKUP Món đã sẵn sàng để Shipper đến nhận
   PICKED_UP Shipper đã nhận món
   DELIVERING Shipper đang giao hàng
   COMPLETED Giao hàng thành công
   CANCELLED Order bị Customer hủy theo chính sách
   REJECTED Restaurant từ chối Order
   6.3. Quy tắc chuyển trạng thái
   • PENDING → CONFIRMED: Restaurant chấp nhận.
   • PENDING → REJECTED: Restaurant từ chối.
   • PENDING → CANCELLED: Customer hủy khi được phép.
   • CONFIRMED → PREPARING: Restaurant bắt đầu chuẩn bị.
   • PREPARING → READY_FOR_PICKUP: Restaurant hoàn thành chuẩn bị.
   • READY_FOR_PICKUP → PICKED_UP: Shipper nhận món.
   • PICKED_UP → DELIVERING: Shipper bắt đầu giao.
   • DELIVERING → COMPLETED: Shipper xác nhận giao thành công.

---

7. THEO DÕI ĐƠN HÀNG
   Customer có thể xem trạng thái hiện tại của Order.
   Ví dụ:
   ✓ Đã đặt hàng
   ✓ Nhà hàng đã xác nhận
   ✓ Đang chuẩn bị
   ✓ Món đã sẵn sàng
   ✓ Shipper đã nhận hàng
   ● Đang giao
   ○ Đã hoàn thành
   Hệ thống lưu trạng thái Order để Customer có thể biết Order đang ở bước nào.
   Giới hạn
   Trong phạm vi đồ án:
   • Không hiển thị vị trí Shipper theo GPS realtime.
   • Không yêu cầu bản đồ di chuyển của Shipper theo thời gian thực.
   • Customer chỉ theo dõi trạng thái nghiệp vụ của Order.

---

8. QUẢN LÝ ĐƠN HÀNG PHÍA CUSTOMER
   8.1. Xem đơn hàng hiện tại
   Customer xem các Order đang xử lý.
   8.2. Xem lịch sử đơn hàng
   Customer xem các Order:
   • COMPLETED.
   • CANCELLED.
   • REJECTED.
   8.3. Xem chi tiết Order
   Thông tin gồm:
   • Mã Order.
   • Restaurant.
   • Danh sách món.
   • Số lượng.
   • Địa chỉ giao hàng.
   • Phí giao hàng.
   • Giảm giá.
   • Tổng thanh toán.
   • Phương thức thanh toán.
   • Trạng thái.
   • Thời gian tạo.
   8.4. Hủy Order
   Customer chỉ được hủy Order trong những trạng thái được hệ thống cho phép.
   Khuyến nghị:
   Trạng thái Customer được hủy
   PENDING Có
   CONFIRMED Có thể theo chính sách
   PREPARING Không
   READY_FOR_PICKUP Không
   PICKED_UP Không
   DELIVERING Không
   COMPLETED Không
   REJECTED Không cần hủy
   CANCELLED Không

---

9. ĐÁNH GIÁ ĐƠN HÀNG
   9.1. Điều kiện đánh giá
   Customer chỉ được đánh giá một Order khi Order đã ở trạng thái:
   COMPLETED
   Mỗi Order chỉ được tạo tối đa một Review.
   Customer không thể tạo Review cho Order chưa hoàn thành.
   9.2. Nội dung đánh giá
   Review đánh giá trải nghiệm của Customer đối với toàn bộ Order.
   Thông tin Review gồm:
   • Số sao từ 1 đến 5.
   • Nội dung nhận xét.
   • Thời gian đánh giá.
   • Customer thực hiện đánh giá.
   • Order được đánh giá.
   • Trạng thái Review.
   Review không tách riêng thành đánh giá Restaurant, Food hoặc Shipper.
   9.3. Trạng thái Review
   Trong phạm vi hệ thống, Review có thể có các trạng thái:
   • VISIBLE: Review đang được hiển thị.
   • HIDDEN: Review bị Admin ẩn do vi phạm quy định.
   • PENDING: Review đang chờ xử lý nếu hệ thống triển khai cơ chế kiểm duyệt.
   9.4. Quản lý đánh giá
   Customer có thể xem lại Review của mình.
   Nếu hệ thống triển khai chức năng chỉnh sửa hoặc xóa Review, Customer chỉ được thao tác trên Review của chính mình.
   Admin có quyền:
   • Xem danh sách Review.
   • Xem nội dung Review.
   • Lọc Review.
   • Ẩn Review vi phạm.
   • Xử lý Review theo chính sách của hệ thống.
   Admin không thay đổi nội dung Review của Customer.
   Restaurant có thể xem các Review liên quan đến các Order của Restaurant mình nhưng không được tự ý thay đổi hoặc xóa Review.
10. NGHIỆP VỤ RESTAURANT
    Restaurant sử dụng Restaurant Web để quản lý cửa hàng.
    10.1. Đăng nhập
    Restaurant sử dụng tài khoản được hệ thống cấp/đăng ký theo quy trình của nền tảng để đăng nhập vào Restaurant Web.
    Restaurant không có chức năng tự đăng ký tài khoản trong phạm vi nghiệp vụ hiện tại nếu quy trình duyệt Restaurant do Admin quản lý.
    10.2. Quản lý tài khoản Restaurant
    Restaurant có thể:
    • Đăng xuất.
    • Xem thông tin tài khoản.
    • Cập nhật thông tin được phép.
    • Đổi mật khẩu.
    • Khôi phục mật khẩu nếu triển khai.
    10.3. Quản lý thông tin Restaurant
    Restaurant có thể quản lý:
    • Tên Restaurant.
    • Hình ảnh.
    • Địa chỉ.
    • Số điện thoại.
    • Mô tả.
    • Giờ mở cửa.
    • Giờ đóng cửa.
    Trạng thái hoạt động của Restaurant
    Restaurant có trạng thái kiểm duyệt/hoạt động do hệ thống quản lý:
    • PENDING: Restaurant đang chờ Admin kiểm duyệt.
    • ACTIVE: Restaurant đã được duyệt và được phép hoạt động.
    • REJECTED: Restaurant bị từ chối.
    • SUSPENDED: Restaurant đang bị tạm ngưng hoạt động.
    Ngoài trạng thái kiểm duyệt, giao diện Restaurant có thể thể hiện trạng thái mở cửa dựa trên giờ hoạt động và chính sách của hệ thống:
    • OPEN: đang mở cửa.
    • CLOSED: đang đóng cửa.
    OPEN/CLOSED là trạng thái phục vụ hiển thị và kiểm tra khả năng nhận Order, không thay thế trạng thái kiểm duyệt của Restaurant.
    Business Rule
    Restaurant phải ở trạng thái ACTIVE và đang mở cửa thì mới được nhận Order mới.
11. QUẢN LÝ MÓN ĂN RESTAURANT
    11.1. Thêm món
    Restaurant nhập:
    • Tên món.
    • Giá.
    • Hình ảnh.
    • Mô tả.
    • Danh mục.
    Danh mục được chọn từ danh sách do Admin quản lý, Restaurant không tự tạo danh mục.
    11.2. Sửa món
    Restaurant cập nhật thông tin món ăn.
    11.3. Xóa món
    Restaurant xóa món khỏi menu.
    11.4. Bật/tắt món
    Restaurant thay đổi trạng thái:
    • AVAILABLE.
    • UNAVAILABLE.
    Ví dụ khi món hết nguyên liệu:
    Burger bò
    ↓
    UNAVAILABLE
    ↓
    Customer không thể đặt
    Business Rule
    Restaurant chỉ được quản lý món ăn thuộc Restaurant của mình.
    11.5. Tìm kiếm món ăn
    Cho phép restaurant tìm kiếm món ăn muốn chỉnh sửa hoặc thay đổi

---

12. QUẢN LÝ ĐƠN HÀNG RESTAURANT
    Đây là nghiệp vụ quan trọng nhất của Restaurant.
    12.1. Nhận đơn mới
    Restaurant nhận Order có trạng thái PENDING.
    Ví dụ:
    Order #FD001

Burger x 2
Coke x 1

Tiền món: 150.000đ
Phí giao hàng: 25.000đ
Tổng COD: 175.000đ

Status: PENDING
12.2. Xác nhận Order
Restaurant kiểm tra Order.
Nếu chấp nhận:
PENDING
↓
CONFIRMED
12.3. Từ chối Order
Restaurant có thể từ chối Order và ghi nhận lý do.
PENDING
↓
REJECTED
12.4. Bắt đầu chuẩn bị
CONFIRMED
↓
PREPARING
12.5. Hoàn thành chuẩn bị
Khi món đã sẵn sàng:
PREPARING
↓
READY_FOR_PICKUP
Sau trạng thái này, hệ thống bắt đầu quá trình tìm Shipper phù hợp.

---

13. LỊCH SỬ VÀ DOANH THU RESTAURANT
    Restaurant có thể xem:
    • Danh sách Order.
    • Order đang xử lý.
    • Order hoàn thành.
    • Order bị hủy.
    • Order bị từ chối.
    • Tổng doanh thu.
    Có thể lọc theo:
    • Ngày.
    • Tuần.
    • Tháng.
    13.1. Quy tắc tính doanh thu
    Trong phạm vi đồ án, doanh thu Restaurant được tính trên giá trị món ăn của các Order hoàn thành, không cộng phí giao hàng.
    Ví dụ:
    Tiền món: 100.000đ
    Phí giao hàng: 25.000đ
    Customer trả: 125.000đ

Doanh thu Restaurant: 100.000đ
Phí giao hàng: 25.000đ
Phí giao hàng được ghi nhận riêng cho hoạt động giao hàng.

---

14. NGHIỆP VỤ SHIPPER
    Shipper sử dụng Shipper Mobile App.
    14.1. Đăng nhập
    Shipper đăng nhập bằng tài khoản được hệ thống cấp/duyệt.
    14.2. Quản lý tài khoản Shipper
    Shipper có thể:
    • Đăng xuất.
    • Xem thông tin cá nhân.
    • Cập nhật thông tin được phép.
    • Đổi mật khẩu.
    • Khôi phục mật khẩu nếu triển khai.

---

15. QUẢN LÝ TRẠNG THÁI HOẠT ĐỘNG SHIPPER
    Shipper có thể chuyển trạng thái:
    • OFFLINE.
    • ONLINE.
    • BUSY.
    OFFLINE
    Không nhận yêu cầu giao hàng.
    ONLINE
    Có thể nhận yêu cầu giao hàng mới.
    BUSY
    Đang thực hiện một Order giao hàng.
    Business Rule
    Chỉ Shipper ONLINE mới được hệ thống lựa chọn để gửi yêu cầu giao hàng.

---

16. QUẢN LÝ YÊU CẦU GIAO HÀNG
    Khi Restaurant chuyển Order sang:
    READY_FOR_PICKUP
    hệ thống bắt đầu tìm Shipper phù hợp.
    Trong phạm vi đồ án, có thể áp dụng quy tắc đơn giản:
1. Tìm các Shipper đang ONLINE.
1. Xác định Shipper phù hợp với khu vực.
1. Gửi yêu cầu giao hàng.
1. Shipper xem thông tin yêu cầu.
1. Shipper chấp nhận.
1. Order được gắn với Shipper.
   Không yêu cầu xây dựng thuật toán phân phối Shipper phức tạp.

---

17. THỰC HIỆN GIAO HÀNG
    17.1. Nhận yêu cầu
    Khi Order chuyển sang:
    READY_FOR_PICKUP
    hệ thống tìm Shipper đang ONLINE và tạo yêu cầu giao hàng.
    Shipper xem thông tin yêu cầu và có thể chấp nhận.
    17.2. Đến Restaurant
    Sau khi chấp nhận yêu cầu, Shipper di chuyển đến địa chỉ Restaurant để nhận món.
    17.3. Nhận món
    Sau khi Shipper nhận món:
    READY_FOR_PICKUP → PICKED_UP
    Hệ thống ghi nhận thời điểm Shipper nhận món.
    17.4. Bắt đầu giao
    Sau khi rời Restaurant:
    PICKED_UP → DELIVERING
    Shipper bắt đầu giao Order đến địa chỉ của Customer.
    17.5. Giao thành công
    Khi giao món thành công:
    DELIVERING → COMPLETED
    Shipper xác nhận hoàn thành giao hàng.
    Trong trường hợp COD, Customer thanh toán tiền mặt cho Shipper theo tổng thanh toán của Order.
    Hệ thống ghi nhận thời gian hoàn thành Delivery và trạng thái thanh toán tương ứng.
18. LỊCH SỬ GIAO HÀNG SHIPPER
    Shipper có thể xem:
    • Danh sách Order đã giao.
    • Mã Order.
    • Thời gian nhận hàng.
    • Thời gian hoàn thành.
    • Restaurant.
    • Địa chỉ giao hàng.
    • Phí giao hàng.
    Nếu triển khai quản lý thu nhập cơ bản, Shipper có thể xem tổng phí giao hàng theo:
    • Đơn.
    • Ngày.
    • Tháng.
    Trong phạm vi đồ án, không bắt buộc xây dựng cơ chế tính lương phức tạp cho Shipper.

---

19. NGHIỆP VỤ ADMIN
    Admin sử dụng Admin Web để quản lý và giám sát toàn bộ nền tảng.
    19.1. Đăng nhập Admin
    Admin đăng nhập bằng tài khoản quản trị được hệ thống cấp.
    Không có chức năng tự đăng ký Admin.
    19.2. Quản lý tài khoản Admin
    Admin chỉ quản lý tài khoản của chính mình, bao gồm:
    • Xem thông tin.
    • Cập nhật thông tin.
    • Đổi mật khẩu.
    • Đăng xuất.
    • Khôi phục mật khẩu nếu triển khai.
    Quản lý Customer, Restaurant và Shipper là các nghiệp vụ riêng, không đặt trong “Quản lý tài khoản Admin”.

---

20. QUẢN LÝ DANH MỤC MÓN ĂN
    Đây là chức năng thuộc Admin, không thuộc Restaurant.
    20.1. Mục đích
    Admin quản lý hệ thống danh mục món ăn dùng chung cho toàn nền tảng.
    Việc dùng danh mục chung giúp:
    • Thống nhất cách phân loại.
    • Tránh Restaurant tự đặt tên danh mục khác nhau.
    • Customer dễ tìm kiếm và lọc món ăn.
    • Có thể hiển thị danh mục trên trang khám phá toàn hệ thống.
    20.2. Chức năng
    Admin có thể:
    • Xem danh sách danh mục.
    • Thêm danh mục.
    • Sửa danh mục.
    • Xóa danh mục.
    • Bật/tắt danh mục nếu cần.
    20.3. Ví dụ
    Cơm
    Mì & Phở
    Gà
    Burger
    Pizza
    Bánh mì
    Đồ ăn vặt
    Lẩu
    Sushi
    Đồ chay
    Đồ uống
    Tráng miệng
    Restaurant khi thêm món sẽ chọn:
    Food
    ├── Name
    ├── Price
    ├── Image
    ├── Description
    └── Category ← chọn từ Category của Admin

---

21. DASHBOARD ADMIN
    Dashboard hiển thị thông tin tổng quan:
    • Tổng Customer.
    • Tổng Restaurant.
    • Tổng Shipper.
    • Tổng Order.
    • Tổng doanh thu.
    • Order trong ngày.
    • Restaurant đang hoạt động.
    Ví dụ:
    Customers: 1.250
    Restaurants: 50
    Shippers: 120
    Orders today: 125
    Revenue today: 12.500.000đ
    Các số liệu trong ví dụ chỉ nhằm minh họa giao diện và nghiệp vụ, không phải dữ liệu cố định của hệ thống.

---

22. QUẢN LÝ CUSTOMER
    Admin có thể:
    • Xem danh sách Customer.
    • Tìm kiếm Customer.
    • Xem thông tin Customer.
    • Xem trạng thái tài khoản.
    • Khóa tài khoản.
    • Mở khóa tài khoản.
    Trạng thái
    • ACTIVE.
    • LOCKED.
    Khi Customer bị LOCKED, Customer không thể đăng nhập hoặc sử dụng các chức năng yêu cầu tài khoản hoạt động.

---

23. QUẢN LÝ RESTAURANT
    Admin có thể:
    • Xem danh sách Restaurant.
    • Tìm kiếm Restaurant.
    • Xem thông tin Restaurant.
    • Kiểm duyệt Restaurant.
    • Từ chối Restaurant.
    • Khóa/tạm ngưng Restaurant.
    • Kích hoạt Restaurant.
    Trạng thái đề xuất
    • PENDING.
    • ACTIVE.
    • REJECTED.
    • SUSPENDED.
    Quy trình
    PENDING
    │
    ├── APPROVE → ACTIVE
    │
    └── REJECT → REJECTED

ACTIVE
↓
SUSPENDED

SUSPENDED
↓
ACTIVE
Restaurant chỉ có thể hoạt động và nhận Order khi được hệ thống cho phép.

---

24. QUẢN LÝ SHIPPER
    Admin có thể:
    • Xem danh sách Shipper.
    • Tìm kiếm Shipper.
    • Xem thông tin Shipper.
    • Kiểm duyệt Shipper.
    • Khóa/tạm ngưng tài khoản.
    • Kích hoạt tài khoản.
    Admin không trực tiếp thực hiện giao hàng.

---

25. QUẢN LÝ ORDER ADMIN
    Admin có quyền giám sát toàn bộ Order.
    Có thể:
    • Xem tất cả Order.
    • Tìm kiếm Order.
    • Lọc theo trạng thái.
    • Xem chi tiết Order.
    • Xem Customer.
    • Xem Restaurant.
    • Xem Shipper.
    • Xem tổng tiền.
    • Xem lịch sử trạng thái.
    Ví dụ thông tin:
    Order ID
    Customer
    Restaurant
    Shipper
    Food Amount
    Delivery Fee
    Discount
    Total
    Payment Method
    Status
    Created At
    Admin chủ yếu giám sát và quản lý dữ liệu, không trực tiếp thay thế Customer, Restaurant hoặc Shipper để thực hiện quy trình giao hàng thông thường.

---

26. QUẢN LÝ ĐÁNH GIÁ ADMIN
    Admin có thể:
    • Xem danh sách đánh giá.
    • Xem nội dung đánh giá.
    • Lọc đánh giá.
    • Ẩn/xóa đánh giá vi phạm quy định.
    Admin không thay đổi nội dung đánh giá của Customer.
    Restaurant có thể xem các đánh giá liên quan đến Restaurant của mình nhưng không được tùy ý xóa đánh giá.

---

27. QUẢN LÝ VOUCHER
    27.1. Chức năng Admin
    Admin có thể:
    • Tạo Voucher.
    • Xem Voucher.
    • Sửa Voucher.
    • Xóa Voucher.
    • Bật/tắt Voucher.
    • Thiết lập thời gian hiệu lực.
    • Thiết lập mức giảm.
    • Thiết lập giá trị đơn hàng tối thiểu.
    • Thiết lập giới hạn số lần sử dụng.
    27.2. Ví dụ
    Code: GIAM30K
    Discount: 30.000đ
    Min Order: 150.000đ
    Usage Limit: 100
    Status: ACTIVE
    Start Date: ...
    End Date: ...
    27.3. Quy trình sử dụng
    Customer nhập/chọn Voucher tại Checkout.
    Hệ thống:
1. Kiểm tra Voucher.
1. Kiểm tra trạng thái.
1. Kiểm tra thời gian.
1. Kiểm tra điều kiện đơn hàng.
1. Kiểm tra giới hạn sử dụng.
1. Nếu hợp lệ, áp dụng giảm giá.
1. Cập nhật tổng thanh toán.

---

28. BÁO CÁO VÀ THỐNG KÊ
    28.1. Thống kê Order
    Admin có thể xem:
    • Tổng số Order.
    • Order hoàn thành.
    • Order hủy.
    • Order bị từ chối.
    • Order đang xử lý.
    28.2. Thống kê doanh thu
    Có thể xem:
    • Doanh thu theo ngày.
    • Doanh thu theo tháng.
    28.3. Thống kê Restaurant
    • Tổng số Restaurant.
    • Restaurant đang hoạt động.
    • Restaurant bị tạm ngưng.
    28.4. Thống kê Customer
    • Tổng Customer.
    • Customer đang hoạt động.
    • Customer bị khóa.
    28.5. Thống kê Shipper
    • Tổng Shipper.
    • Shipper đang hoạt động.
    • Shipper online/offline.

---

29. BUSINESS RULE
    BR01 — Đăng nhập
    Các chức năng yêu cầu xác thực chỉ được thực hiện khi người dùng đã đăng nhập.
    BR02 — Tài khoản
    Tài khoản có trạng thái LOCKED không được đăng nhập hoặc sử dụng các chức năng yêu cầu tài khoản hoạt động.
    BR03 — Giỏ hàng
    Một Cart chỉ chứa Food của một Restaurant.
    BR04 — Restaurant
    Restaurant phải ở trạng thái ACTIVE và đang mở cửa theo chính sách hệ thống mới có thể nhận Order.
    BR05 — Món ăn
    Food ở trạng thái UNAVAILABLE không được phép thêm vào Cart hoặc Order.
    BR06 — Đặt hàng
    Order phải có ít nhất một Order Detail.
    BR07 — Địa chỉ
    Order phải có một địa chỉ giao hàng hợp lệ của Customer.
    BR08 — Phí giao hàng
    Phí giao hàng được tính dựa trên khoảng cách giữa vị trí Restaurant và vị trí địa chỉ giao hàng.
    BR09 — Thanh toán
    Trong phạm vi đồ án, phương thức thanh toán chỉ là COD.
    BR10 — Voucher
    Voucher phải tồn tại, đang hoạt động, còn hiệu lực, chưa vượt quá giới hạn sử dụng và phải thỏa mãn điều kiện đơn hàng.
    BR11 — Hủy Order
    Customer chỉ được hủy Order trong những trạng thái mà hệ thống cho phép.
    BR12 — Đánh giá
    Customer chỉ được tạo Review khi Order ở trạng thái COMPLETED.
    Mỗi Order chỉ có tối đa một Review.
    BR13 — Shipper
    Chỉ Shipper có trạng thái ONLINE mới được hệ thống lựa chọn để nhận yêu cầu giao hàng.
    BR14 — Trạng thái giao hàng
    Shipper chỉ có thể chuyển Order sang COMPLETED khi Order đang ở DELIVERING.
    BR15 — Restaurant Data
    Restaurant chỉ được quản lý Food và Order thuộc Restaurant của mình.
    BR16 — Danh mục
    Chỉ Admin được tạo, sửa và xóa Category dùng chung toàn hệ thống.
    BR17 — Phân quyền Customer
    Customer không được truy cập chức năng Restaurant, Shipper hoặc Admin.
    BR18 — Phân quyền Restaurant
    Restaurant không được truy cập dữ liệu của Restaurant khác và không được truy cập chức năng Admin.
    BR19 — Phân quyền Shipper
    Shipper không được truy cập chức năng quản trị hoặc dữ liệu quản lý của Restaurant/Admin.
    BR20 — GPS
    Hệ thống không yêu cầu theo dõi vị trí Shipper theo thời gian thực.
    BR21 — Review
    Review đánh giá toàn bộ Order, không tách thành Review riêng cho Restaurant, Food hoặc Shipper.
    BR22 — Restaurant Status
    Restaurant chỉ được nhận Order khi ở trạng thái ACTIVE.
    Restaurant ở trạng thái PENDING, REJECTED hoặc SUSPENDED không được nhận Order mới.
30. QUY TRÌNH NGHIỆP VỤ TỔNG THỂ
    Quy trình từ Customer đến khi hoàn thành Order:
    CUSTOMER
    │
    ├── Đăng nhập
    │
    ├── Tìm Restaurant
    │
    ▼
    Xem Restaurant
    │
    ▼
    Xem Menu
    │
    ▼
    Chọn Food
    │
    ▼
    CART
    │
    ▼
    CHECKOUT
    │
    ├── Chọn địa chỉ
    │
    ├── Tính phí giao hàng
    │
    ├── Nhập/Chọn Voucher
    │
    ├── Chọn COD
    │
    ▼
    PLACE ORDER
    │
    ▼
    PENDING
    │
    ▼
    RESTAURANT
    │
    ├── Reject ───────→ REJECTED
    │
    └── Accept
    │
    ▼
    CONFIRMED
    │
    ▼
    PREPARING
    │
    ▼
    READY_FOR_PICKUP
    │
    ▼
    SYSTEM
    │
    └── Tìm Shipper ONLINE
    │
    ▼
    SHIPPER
    │
    ├── Accept
    │
    ▼
    PICKED_UP
    │
    ▼
    DELIVERING
    │
    ▼
    COMPLETED
    │
    ▼
    CUSTOMER
    │
    ▼
    REVIEW

---

31. PHÂN TÍCH LUỒNG COD
    Trong mô hình COD, Customer không thanh toán online khi tạo Order.
    Ví dụ:
    Tiền món 100.000đ
    Phí giao hàng 25.000đ
    Voucher 0đ

---

Tổng Customer trả 125.000đ
Khi Shipper giao hàng thành công:
Customer
│
│ 125.000đ tiền mặt
▼
Shipper
Trong phạm vi đồ án đơn giản, phí giao hàng được ghi nhận riêng với giá trị món ăn.
Restaurant value: 100.000đ
Delivery fee: 25.000đ
Customer pays: 125.000đ
Không triển khai cơ chế đối soát hoa hồng nền tảng phức tạp.

---

32. PHÂN QUYỀN THEO ACTOR
    Chức năng Customer Restaurant Shipper Admin
    Đăng ký ✓ - - -
    Đăng nhập ✓ ✓ ✓ ✓
    Quản lý tài khoản cá nhân ✓ ✓ ✓ ✓
    Tìm Restaurant ✓ - - ✓
    Xem món ✓ ✓ - ✓
    Quản lý món của Restaurant - ✓ - -
    Quản lý Category - - - ✓
    Đặt Order ✓ - - -
    Xử lý Order Restaurant - ✓ - Giám sát
    Nhận giao hàng - - ✓ -
    Thực hiện giao hàng - - ✓ -
    Xem lịch sử giao hàng - - ✓ -
    Đánh giá ✓ Xem - Quản lý
    Voucher Sử dụng - - Quản lý
    Quản lý Customer - - - ✓
    Quản lý Restaurant - - - ✓
    Quản lý Shipper - - - ✓
    Báo cáo thống kê - Doanh thu của mình - ✓

---

33. USE CASE TỔNG QUÁT
    33.1. Customer Use Case
    UC-C01 — Đăng ký
    Cho phép người dùng tạo tài khoản Customer.
    UC-C02 — Đăng nhập
    Cho phép Customer xác thực để sử dụng hệ thống.
    UC-C03 — Quản lý tài khoản
    Cho phép Customer quản lý thông tin cá nhân, mật khẩu và đăng xuất.
    UC-C04 — Tìm kiếm và khám phá nhà hàng
    Cho phép Customer xem, tìm kiếm và lọc Restaurant.
    UC-C05 — Xem và lựa chọn món ăn
    Cho phép Customer xem menu, danh mục và chi tiết món.
    UC-C06 — Quản lý giỏ hàng
    Cho phép Customer thêm, sửa, xóa món và xem tổng tiền.
    UC-C07 — Quản lý địa chỉ giao hàng
    Cho phép Customer thêm, sửa, xóa và lựa chọn địa chỉ.
    UC-C08 — Đặt hàng
    Cho phép Customer Checkout, chọn địa chỉ, áp dụng Voucher, tính phí giao hàng, chọn COD và tạo Order.
    UC-C09 — Theo dõi đơn hàng
    Cho phép Customer xem trạng thái Order.
    UC-C10 — Quản lý đơn hàng
    Cho phép Customer xem Order hiện tại, lịch sử, chi tiết và hủy Order khi được phép.
    UC-C11 — Đánh giá đơn hàng
    Cho phép Customer đánh giá sau khi Order COMPLETED.

---

34. RESTAURANT USE CASE
    UC-R01 — Đăng nhập
    Restaurant đăng nhập Restaurant Web.
    UC-R02 — Quản lý tài khoản Restaurant
    Restaurant xem/cập nhật tài khoản, đổi mật khẩu và đăng xuất.
    UC-R03 — Quản lý thông tin Restaurant
    Restaurant cập nhật thông tin cửa hàng và trạng thái OPEN/CLOSED.
    UC-R04 — Quản lý món ăn
    Restaurant thêm, sửa, xóa, bật/tắt món và chọn Category do Admin cung cấp.
    UC-R05 — Quản lý Order
    Restaurant nhận, xác nhận, từ chối, chuẩn bị và chuyển Order sang READY_FOR_PICKUP.
    UC-R06 — Quản lý lịch sử và doanh thu
    Restaurant xem lịch sử Order, Order hoàn thành và doanh thu theo thời gian.

---

35. SHIPPER USE CASE
    UC-S01 — Đăng nhập
    Shipper đăng nhập Shipper Mobile App.
    UC-S02 — Quản lý tài khoản Shipper
    Shipper xem/cập nhật thông tin cá nhân, đổi mật khẩu và đăng xuất.
    UC-S03 — Quản lý trạng thái hoạt động
    Shipper chuyển OFFLINE/ONLINE/BUSY.
    UC-S04 — Quản lý yêu cầu giao hàng
    Shipper xem và chấp nhận yêu cầu giao hàng.
    UC-S05 — Thực hiện giao hàng
    Shipper nhận món, bắt đầu giao và xác nhận giao thành công.
    UC-S06 — Quản lý lịch sử giao hàng
    Shipper xem các Order đã giao và phí giao hàng liên quan.

---

36. ADMIN USE CASE
    UC-A01 — Đăng nhập
    Admin đăng nhập Admin Web.
    UC-A02 — Quản lý tài khoản Admin
    Admin quản lý tài khoản cá nhân của mình.
    UC-A03 — Quản lý danh mục món ăn
    Admin tạo và quản lý Category dùng chung toàn hệ thống.
    UC-A04 — Quản lý Customer
    Admin xem, tìm kiếm, khóa và mở khóa Customer.
    UC-A05 — Quản lý Restaurant
    Admin xem, duyệt, từ chối, khóa và kích hoạt Restaurant.
    UC-A06 — Quản lý Shipper
    Admin xem, duyệt, khóa và kích hoạt Shipper.
    UC-A07 — Quản lý Order
    Admin giám sát và tra cứu toàn bộ Order.
    UC-A08 — Quản lý đánh giá
    Admin xem và xử lý các Review vi phạm.
    UC-A09 — Quản lý Voucher
    Admin tạo, sửa, xóa và cấu hình Voucher.
    UC-A10 — Báo cáo và thống kê
    Admin xem các số liệu tổng quan của hệ thống.

---

37. QUAN HỆ USE CASE VÀ ĐIỀU KIỆN TIÊN QUYẾT
    Để sơ đồ Use Case không bị quá lớn, các chức năng chi tiết nên được mô tả trong Use Case Specification.
    Ví dụ đối với Đặt hàng:
    Đặt hàng
    │
    ├── Checkout
    ├── Chọn địa chỉ
    ├── Tính phí giao hàng
    ├── Kiểm tra Voucher
    ├── Chọn COD
    └── Xác nhận Order
    Đăng nhập là precondition:
    Customer
    │
    ├── Đăng nhập
    │
    └── Đặt hàng
    [Precondition: Customer đã đăng nhập]
    Không cần tạo <<include>> Đăng nhập cho tất cả các chức năng như thêm giỏ hàng, đặt hàng, xem lịch sử, đánh giá.

---

38. ĐỊNH HƯỚNG ACTIVITY DIAGRAM
    Các Activity Diagram quan trọng nên được xây dựng cho:
1. Đăng ký.
1. Đăng nhập.
1. Đặt hàng.
1. Restaurant xử lý Order.
1. Shipper nhận và giao hàng.
1. Đánh giá Order.
1. Admin duyệt Restaurant.
1. Admin quản lý Voucher.
   Activity Diagram quan trọng nhất là Đặt hàng và giao hàng vì đây là Core Business Flow.

---

39. ĐỊNH HƯỚNG SEQUENCE DIAGRAM
    Các Sequence Diagram đề xuất:
    SD01 — Customer đặt hàng
    Customer
    ↓
    Mobile App
    ↓
    Backend API
    ↓
    Database
    ↓
    Restaurant
    SD02 — Restaurant xác nhận Order
    Restaurant
    ↓
    Restaurant Web
    ↓
    Backend API
    ↓
    Database
    ↓
    Customer
    SD03 — Shipper nhận giao hàng
    Backend
    ↓
    Shipper App
    ↓
    Shipper
    ↓
    Backend
    ↓
    Database
    SD04 — Hoàn thành giao hàng
    Shipper
    ↓
    Shipper App
    ↓
    Backend
    ↓
    Database
    ↓
    Customer

---

40. CÁC ĐỐI TƯỢNG NGHIỆP VỤ CHÍNH
    Từ phân tích nghiệp vụ có thể xác định các đối tượng dữ liệu chính:
    • User.
    • Customer.
    • Customer Profile.
    • Admin.
    • Restaurant.
    • Shipper.
    • Category.
    • Food.
    • Cart.
    • Cart Item.
    • Address.
    • Order.
    • Order Detail.
    • Order Status History.
    • Delivery.
    • Payment.
    • Voucher.
    • Review.
    40.1. User
    Lưu thông tin xác thực, vai trò và trạng thái tài khoản.
    40.2. Customer
    Đại diện cho tài khoản Customer sử dụng hệ thống để tìm Restaurant, đặt Order và đánh giá Order.
    40.3. Customer Profile
    Lưu thông tin cá nhân của Customer như họ tên, số điện thoại và ngày sinh.
    40.4. Admin
    Đại diện cho tài khoản quản trị hệ thống.
    40.5. Restaurant
    Lưu thông tin cửa hàng, vị trí, thời gian hoạt động và trạng thái Restaurant.
    40.6. Shipper
    Lưu thông tin người giao hàng và trạng thái hoạt động OFFLINE, ONLINE, BUSY.
    40.7. Category
    Lưu danh mục món ăn dùng chung toàn hệ thống và do Admin quản lý.
    40.8. Food
    Lưu món ăn thuộc một Restaurant và liên kết với một Category.
    40.9. Address
    Lưu địa chỉ giao hàng của Customer, bao gồm thông tin người nhận và vị trí Latitude/Longitude.
    40.10. Cart
    Lưu Cart hiện tại của Customer.
    Một Cart chỉ chứa Food thuộc một Restaurant.
    40.11. Cart Item
    Lưu Food, số lượng, đơn giá và thành tiền trong Cart.
    40.12. Order
    Lưu thông tin tổng quát của đơn hàng, bao gồm Restaurant, Customer, Address, Voucher, phí giao hàng, giảm giá, tổng tiền và trạng thái.
    40.13. Order Detail
    Lưu các Food, số lượng, đơn giá và thành tiền thuộc Order.
    40.14. Order Status History
    Lưu lịch sử thay đổi trạng thái của Order.
    40.15. Delivery
    Lưu thông tin Shipper thực hiện giao hàng, thời gian nhận món, thời gian hoàn thành và trạng thái giao hàng.
    40.16. Payment
    Lưu thông tin phương thức và trạng thái thanh toán của Order.
    Trong phạm vi hiện tại, Payment chủ yếu phục vụ phương thức COD.
    40.17. Voucher
    Lưu mã giảm giá, giá trị giảm, điều kiện sử dụng, thời gian hiệu lực và giới hạn sử dụng.
    40.18. Review
    Lưu đánh giá của Customer đối với một Order đã COMPLETED.
    Một Order chỉ có tối đa một Review.
    Review không tách thành các đối tượng đánh giá riêng cho Restaurant, Food hoặc Shipper.
41. YÊU CẦU CHỨC NĂNG TỔNG QUÁT
    FR01 — Authentication
    Hệ thống phải hỗ trợ đăng ký Customer và đăng nhập cho các Actor có tài khoản.
    FR02 — Authorization
    Hệ thống phải phân quyền theo Actor.
    FR03 — Restaurant Discovery
    Hệ thống phải cho phép Customer xem, tìm kiếm và lọc Restaurant.
    FR04 — Food
    Hệ thống phải cho phép Customer xem món và Restaurant quản lý món của mình.
    FR05 — Category
    Hệ thống phải cho phép Admin quản lý danh mục dùng chung.
    FR06 — Cart
    Hệ thống phải cho phép Customer quản lý Cart một Restaurant.
    FR07 — Address
    Hệ thống phải cho phép Customer quản lý và lựa chọn địa chỉ giao hàng.
    FR08 — Delivery Fee
    Hệ thống phải tính phí giao hàng dựa trên khoảng cách Restaurant và địa chỉ giao hàng.
    FR09 — Order
    Hệ thống phải cho phép Customer tạo Order.
    FR10 — COD
    Hệ thống phải ghi nhận phương thức thanh toán COD.
    FR11 — Restaurant Order Processing
    Hệ thống phải cho phép Restaurant xử lý Order theo trạng thái.
    FR12 — Delivery
    Hệ thống phải cho phép Shipper nhận và thực hiện giao hàng.
    FR13 — Order Tracking
    Hệ thống phải cho phép Customer xem trạng thái Order.
    FR14 — Order History
    Hệ thống phải lưu lịch sử Order.
    FR15 — Review
    Hệ thống phải cho phép Customer tạo Review cho Order đã COMPLETED.
    Mỗi Order chỉ được tạo tối đa một Review.
    Review bao gồm số sao, nội dung nhận xét, thời gian tạo và trạng thái Review.
    FR16 — Voucher
    Hệ thống phải cho phép Admin quản lý Voucher và Customer sử dụng Voucher hợp lệ.
    FR17 — Administration
    Hệ thống phải cho phép Admin quản lý các đối tượng chính.
    FR18 — Reporting
    Hệ thống phải cung cấp các thống kê cơ bản.

---

42. YÊU CẦU PHI CHỨC NĂNG
    NFR01 — Bảo mật
    • Mật khẩu phải được lưu trữ dưới dạng mã hóa/băm an toàn.
    • API phải kiểm tra xác thực.
    • API phải kiểm tra quyền truy cập.
    • Người dùng chỉ được truy cập dữ liệu thuộc quyền của mình.
    NFR02 — Hiệu năng
    Các thao tác phổ biến như xem Restaurant, xem menu, xem Cart và tạo Order cần phản hồi trong thời gian hợp lý đối với quy mô đồ án.
    NFR03 — Khả năng sử dụng
    Giao diện Mobile và Web phải rõ ràng, dễ sử dụng và phù hợp với từng Actor.
    NFR04 — Tính nhất quán
    Trạng thái Order phải được cập nhật nhất quán giữa Customer, Restaurant, Shipper và Admin.
    NFR05 — Khả năng bảo trì
    Backend nên được tổ chức theo các module nghiệp vụ rõ ràng.
    NFR06 — Phân quyền
    Mỗi Actor chỉ được phép thực hiện các chức năng thuộc vai trò của mình.
    NFR07 — Tính mở rộng
    Kiến trúc nên cho phép bổ sung thanh toán online, GPS realtime hoặc các chức năng nâng cao trong tương lai mà không phải thay đổi toàn bộ hệ thống.

---

43. MVP CUỐI CÙNG
    Do đồ án được thực hiện bởi nhóm 2 người, MVP nên tập trung vào một Core Business Flow hoàn chỉnh thay vì triển khai quá nhiều chức năng nâng cao.
    Core Business Flow
    Customer
    ↓
    Đăng nhập
    ↓
    Tìm Restaurant
    ↓
    Xem Food
    ↓
    Thêm vào Cart
    ↓
    Checkout
    ↓
    Chọn Address
    ↓
    Tính Delivery Fee
    ↓
    Chọn/nhập Voucher nếu có
    ↓
    COD
    ↓
    Place Order
    ↓
    Restaurant
    ↓
    Accept
    ↓
    Prepare
    ↓
    Ready For Pickup
    ↓
    System tìm Shipper ONLINE
    ↓
    Shipper Accept
    ↓
    Pickup
    ↓
    Deliver
    ↓
    Complete
    ↓
    Customer tạo Review cho Order
44. PHÂN CHIA PHẠM VI PHÁT TRIỂN ĐỀ XUẤT
    44.1. Nhóm Customer Mobile
    Ưu tiên:
    • Đăng ký.
    • Đăng nhập.
    • Xem Restaurant.
    • Xem Food.
    • Cart.
    • Address.
    • Checkout.
    • COD.
    • Delivery Fee.
    • Order.
    • Theo dõi trạng thái.
    • Lịch sử.
    • Review.
    44.2. Nhóm Restaurant Web
    Ưu tiên:
    • Đăng nhập.
    • Quản lý thông tin Restaurant.
    • Quản lý Food.
    • Nhận Order.
    • Accept/Reject.
    • Preparing.
    • Ready For Pickup.
    • Lịch sử.
    • Doanh thu.
    44.3. Nhóm Shipper Mobile
    Ưu tiên:
    • Đăng nhập.
    • Online/Offline.
    • Nhận Delivery Request.
    • Accept.
    • Pickup.
    • Delivering.
    • Completed.
    • Lịch sử.
    44.4. Nhóm Admin Web
    Ưu tiên:
    • Đăng nhập.
    • Dashboard.
    • Category.
    • Customer.
    • Restaurant.
    • Shipper.
    • Order.
    • Review.
    • Voucher.

---

45. ĐỊNH HƯỚNG TRIỂN KHAI SCRUM
    Hệ thống phù hợp với Agile Scrum vì có thể chia nghiệp vụ thành các Epic và User Story.
    Epic đề xuất
    EPIC 01 — Authentication & Account
    • Đăng ký Customer.
    • Đăng nhập.
    • Quản lý tài khoản.
    EPIC 02 — Restaurant Discovery
    • Xem Restaurant.
    • Tìm kiếm.
    • Lọc.
    • Xem Restaurant Detail.
    EPIC 03 — Food & Cart
    • Xem Food.
    • Category.
    • Cart.
    EPIC 04 — Address & Checkout
    • Address.
    • Tính phí giao hàng.
    • Voucher.
    • COD.
    • Checkout.
    EPIC 05 — Order Management
    • Customer Order.
    • Restaurant Order.
    • Order Status.
    EPIC 06 — Delivery
    • Shipper Online/Offline.
    • Delivery Request.
    • Pickup.
    • Delivering.
    • Complete.
    EPIC 07 — Review
    • Customer Review.
    • Admin Review Management.
    EPIC 08 — Administration
    • Category.
    • Customer.
    • Restaurant.
    • Shipper.
    • Order.
    • Voucher.
    • Dashboard.

---

46. KẾ HOẠCH PHÂN TÍCH NGHIỆP VỤ
    Trước khi triển khai code, nhóm nên hoàn thiện:
1. Xác định Actor.
1. Xác định phạm vi.
1. Xác định Functional Requirements.
1. Xác định Business Rules.
1. Xây dựng Use Case Diagram.
1. Viết Use Case Specification cho các nghiệp vụ quan trọng.
1. Xây dựng Activity Diagram.
1. Xây dựng Sequence Diagram.
1. Xây dựng ERD.
1. Thiết kế Database.
1. Chia User Story trên Jira.
1. Xác định Acceptance Criteria.
1. Triển khai theo Sprint.
1. Kiểm thử theo từng User Story.

---

47. KẾT LUẬN
    Hệ thống Food Delivery App trong phạm vi đồ án gồm 4 nhóm Actor chính:
    • Customer sử dụng Mobile App.
    • Restaurant sử dụng Web.
    • Shipper sử dụng Mobile App.
    • Admin sử dụng Web.
    Hệ thống tập trung vào một quy trình nghiệp vụ trung tâm:
    Đặt món → Nhà hàng xử lý → Shipper nhận món → Giao hàng → Hoàn thành → Customer đánh giá Order.
    Các quyết định nghiệp vụ quan trọng của phiên bản hiện tại gồm:
1. Đăng ký và Đăng nhập là hai Use Case độc lập, không gộp vào “Quản lý tài khoản”.
1. Danh mục món ăn do Admin quản lý tập trung, Restaurant chỉ chọn danh mục khi thêm món.
1. Một Cart chỉ chứa món của một Restaurant.
1. Phí giao hàng được tính theo khoảng cách giữa Restaurant và địa chỉ giao hàng của Customer.
1. Phí giao hàng được lưu trong Order và không cần tạo một đối tượng nghiệp vụ riêng cho Delivery Fee.
1. Thanh toán chỉ hỗ trợ COD.
1. Không triển khai GPS Shipper realtime.
1. Restaurant chỉ quản lý dữ liệu của chính mình.
1. Customer chỉ được tạo Review sau khi Order ở trạng thái COMPLETED.
1. Mỗi Order chỉ có tối đa một Review.
1. Review đánh giá toàn bộ Order, không tách riêng Review cho Restaurant, Food hoặc Shipper.
1. Admin đóng vai trò quản trị và giám sát, không trực tiếp thực hiện giao hàng.
1. Restaurant phải ở trạng thái ACTIVE và đang mở cửa mới có thể nhận Order.
1. MVP ưu tiên hoàn thiện toàn bộ vòng đời một Order.
   Với phạm vi này, hệ thống đủ thể hiện một mô hình Food Delivery thực tế ở mức đồ án đại học nhưng vẫn kiểm soát được độ phức tạp đối với nhóm 2 người.
   Báo cáo nghiệp vụ này là cơ sở để nhóm tiếp tục xây dựng:
   • Use Case Diagram.
   • Use Case Specification.
   • Activity Diagram.
   • Sequence Diagram.
   • Class Diagram.
   • ERD.
   • Database Design.
   • Functional Requirements.
   • Non-functional Requirements.
   • SRS.
   • Jira Epic → User Story → Task → Acceptance Criteria.
   • Thiết kế API.
   • Thiết kế giao diện Mobile/Web.
   • Kế hoạch kiểm thử.
