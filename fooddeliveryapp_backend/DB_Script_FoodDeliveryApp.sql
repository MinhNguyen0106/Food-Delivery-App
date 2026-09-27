-- ============================================================
-- FOOD DELIVERY APP - DATABASE SCRIPT
-- MySQL 8.0+
-- Based on PTNT-FoodDeliveryApp-V2.docx + analyzed Class Diagram
-- Review: one Review belongs to one completed Order (max 1/order)
-- Cart: one active Cart contains Food from one Restaurant only
-- Payment: COD only in current MVP
-- ============================================================

DROP DATABASE IF EXISTS food_delivery_app;
CREATE DATABASE food_delivery_app
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE food_delivery_app;

-- ============================================================
-- 1. LOOKUP / STATUS TABLES
-- ============================================================

CREATE TABLE user_roles (
    role_id INT PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE user_statuses (
    status_id INT PRIMARY KEY AUTO_INCREMENT,
    status_name VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE restaurant_statuses (
    status_id INT PRIMARY KEY AUTO_INCREMENT,
    status_name VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE food_statuses (
    status_id INT PRIMARY KEY AUTO_INCREMENT,
    status_name VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE shipper_statuses (
    status_id INT PRIMARY KEY AUTO_INCREMENT,
    status_name VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE order_statuses (
    status_id INT PRIMARY KEY AUTO_INCREMENT,
    status_name VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE payment_methods (
    method_id INT PRIMARY KEY AUTO_INCREMENT,
    method_name VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE payment_statuses (
    status_id INT PRIMARY KEY AUTO_INCREMENT,
    status_name VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE voucher_statuses (
    status_id INT PRIMARY KEY AUTO_INCREMENT,
    status_name VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE review_statuses (
    status_id INT PRIMARY KEY AUTO_INCREMENT,
    status_name VARCHAR(20) NOT NULL UNIQUE
);

-- ============================================================
-- 2. USER / ACTOR TABLES
-- ============================================================

CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    role_id INT NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES user_roles(role_id),
    CONSTRAINT fk_users_status
        FOREIGN KEY (status_id) REFERENCES user_statuses(status_id)
);

CREATE TABLE customers (
    customer_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    CONSTRAINT fk_customers_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE customer_profiles (
    profile_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    date_of_birth DATE NULL,
    CONSTRAINT fk_customer_profiles_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON DELETE CASCADE
);

CREATE TABLE admins (
    admin_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    CONSTRAINT fk_admins_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE restaurants (
    restaurant_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    description TEXT,
    status_id INT NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    image VARCHAR(255),
    opening_time TIME NULL,
    closing_time TIME NULL,
    CONSTRAINT fk_restaurants_user
        FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_restaurants_status
        FOREIGN KEY (status_id) REFERENCES restaurant_statuses(status_id)
);

CREATE TABLE shippers (
    shipper_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    status_id INT NOT NULL,
    CONSTRAINT fk_shippers_user
        FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_shippers_status
        FOREIGN KEY (status_id) REFERENCES shipper_statuses(status_id)
);

-- ============================================================
-- 3. RESTAURANT / FOOD
-- ============================================================

CREATE TABLE categories (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE foods (
    food_id INT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id INT NOT NULL,
    category_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    image VARCHAR(255),
    status_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_food_price CHECK (price >= 0),
    CONSTRAINT fk_foods_restaurant
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id),
    CONSTRAINT fk_foods_category
        FOREIGN KEY (category_id) REFERENCES categories(category_id),
    CONSTRAINT fk_foods_status
        FOREIGN KEY (status_id) REFERENCES food_statuses(status_id)
);

-- ============================================================
-- 4. ADDRESS / CART
-- ============================================================

CREATE TABLE addresses (
    address_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    address_name VARCHAR(100) NOT NULL,
    receiver_name VARCHAR(100) NOT NULL,
    receiver_phone VARCHAR(20) NOT NULL,
    full_address VARCHAR(255) NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    note VARCHAR(255),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_addresses_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON DELETE CASCADE
);

CREATE TABLE carts (
    cart_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL UNIQUE,
    restaurant_id INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_carts_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_carts_restaurant
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id)
);

CREATE TABLE cart_items (
    cart_item_id INT PRIMARY KEY AUTO_INCREMENT,
    cart_id INT NOT NULL,
    food_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    CONSTRAINT uq_cart_food UNIQUE (cart_id, food_id),
    CONSTRAINT chk_cart_quantity CHECK (quantity > 0),
    CONSTRAINT chk_cart_unit_price CHECK (unit_price >= 0),
    CONSTRAINT chk_cart_subtotal CHECK (subtotal >= 0),
    CONSTRAINT fk_cart_items_cart
        FOREIGN KEY (cart_id) REFERENCES carts(cart_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_food
        FOREIGN KEY (food_id) REFERENCES foods(food_id)
);

-- ============================================================
-- 5. VOUCHER
-- ============================================================

CREATE TABLE vouchers (
    voucher_id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_value DECIMAL(12,2) NOT NULL,
    min_order_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    usage_limit INT NOT NULL,
    used_count INT NOT NULL DEFAULT 0,
    status_id INT NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    CONSTRAINT chk_voucher_discount CHECK (discount_value >= 0),
    CONSTRAINT chk_voucher_min_order CHECK (min_order_value >= 0),
    CONSTRAINT chk_voucher_usage CHECK (usage_limit > 0 AND used_count >= 0
        AND used_count <= usage_limit),
    CONSTRAINT chk_voucher_dates CHECK (end_date > start_date),
    CONSTRAINT fk_vouchers_status
        FOREIGN KEY (status_id) REFERENCES voucher_statuses(status_id)
);

-- ============================================================
-- 6. ORDER
-- ============================================================

CREATE TABLE orders (
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    order_code VARCHAR(30) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    restaurant_id INT NOT NULL,
    address_id INT NOT NULL,
    voucher_id INT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    delivery_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    status_id INT NOT NULL,
    note VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_order_subtotal CHECK (subtotal >= 0),
    CONSTRAINT chk_order_delivery_fee CHECK (delivery_fee >= 0),
    CONSTRAINT chk_order_discount CHECK (discount >= 0),
    CONSTRAINT chk_order_total CHECK (total_amount >= 0),
    CONSTRAINT fk_orders_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    CONSTRAINT fk_orders_restaurant
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id),
    CONSTRAINT fk_orders_address
        FOREIGN KEY (address_id) REFERENCES addresses(address_id),
    CONSTRAINT fk_orders_voucher
        FOREIGN KEY (voucher_id) REFERENCES vouchers(voucher_id),
    CONSTRAINT fk_orders_status
        FOREIGN KEY (status_id) REFERENCES order_statuses(status_id)
);

CREATE TABLE order_details (
    order_detail_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    food_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    CONSTRAINT chk_order_detail_quantity CHECK (quantity > 0),
    CONSTRAINT chk_order_detail_price CHECK (unit_price >= 0),
    CONSTRAINT chk_order_detail_subtotal CHECK (subtotal >= 0),
    CONSTRAINT fk_order_details_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_order_details_food
        FOREIGN KEY (food_id) REFERENCES foods(food_id)
);

CREATE TABLE order_status_history (
    history_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    status_id INT NOT NULL,
    changed_by_user_id INT NULL,
    note VARCHAR(255),
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_history_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_order_history_status
        FOREIGN KEY (status_id) REFERENCES order_statuses(status_id),
    CONSTRAINT fk_order_history_user
        FOREIGN KEY (changed_by_user_id) REFERENCES users(user_id)
);

-- ============================================================
-- 7. PAYMENT / DELIVERY
-- ============================================================

CREATE TABLE payments (
    payment_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL UNIQUE,
    method_id INT NOT NULL,
    status_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    paid_at DATETIME NULL,
    CONSTRAINT chk_payment_amount CHECK (amount >= 0),
    CONSTRAINT fk_payments_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_payments_method
        FOREIGN KEY (method_id) REFERENCES payment_methods(method_id),
    CONSTRAINT fk_payments_status
        FOREIGN KEY (status_id) REFERENCES payment_statuses(status_id)
);

CREATE TABLE deliveries (
    delivery_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL UNIQUE,
    shipper_id INT NULL,
    pickup_time DATETIME NULL,
    delivery_time DATETIME NULL,
    status VARCHAR(30) NOT NULL,
    note VARCHAR(255),
    CONSTRAINT fk_deliveries_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_deliveries_shipper
        FOREIGN KEY (shipper_id) REFERENCES shippers(shipper_id),
    CONSTRAINT chk_delivery_status CHECK (
        status IN ('REQUESTED','ACCEPTED','PICKED_UP','DELIVERING','COMPLETED','CANCELLED')
    )
);

-- ============================================================
-- 8. REVIEW
-- One Customer -> many Reviews, but one Order -> max one Review
-- ============================================================

CREATE TABLE reviews (
    review_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    order_id INT NOT NULL UNIQUE,
    rating TINYINT NOT NULL,
    comment VARCHAR(1000),
    status_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT fk_reviews_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    CONSTRAINT fk_reviews_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id),
    CONSTRAINT fk_reviews_status
        FOREIGN KEY (status_id) REFERENCES review_statuses(status_id)
);

-- ============================================================
-- 9. TRIGGERS
-- Enforce BR03: one Cart can contain food from one Restaurant.
-- ============================================================

DELIMITER $$

CREATE TRIGGER trg_cart_items_same_restaurant_insert
BEFORE INSERT ON cart_items
FOR EACH ROW
BEGIN
    DECLARE cart_restaurant INT;
    DECLARE food_restaurant INT;

    SELECT restaurant_id INTO cart_restaurant
    FROM carts
    WHERE cart_id = NEW.cart_id;

    SELECT restaurant_id INTO food_restaurant
    FROM foods
    WHERE food_id = NEW.food_id;

    IF cart_restaurant IS NULL THEN
        UPDATE carts
        SET restaurant_id = food_restaurant
        WHERE cart_id = NEW.cart_id;
    ELSEIF cart_restaurant <> food_restaurant THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'A Cart can contain Food from only one Restaurant';
    END IF;
END$$

CREATE TRIGGER trg_cart_items_same_restaurant_update
BEFORE UPDATE ON cart_items
FOR EACH ROW
BEGIN
    DECLARE cart_restaurant INT;
    DECLARE food_restaurant INT;

    SELECT restaurant_id INTO cart_restaurant
    FROM carts
    WHERE cart_id = NEW.cart_id;

    SELECT restaurant_id INTO food_restaurant
    FROM foods
    WHERE food_id = NEW.food_id;

    IF cart_restaurant <> food_restaurant THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'A Cart can contain Food from only one Restaurant';
    END IF;
END$$

DELIMITER ;

-- ============================================================
-- SAMPLE DATA
-- ============================================================

-- 1. UserRole
INSERT INTO user_roles (role_id, role_name) VALUES
(1, 'CUSTOMER'),
(2, 'RESTAURANT'),
(3, 'SHIPPER'),
(4, 'ADMIN');

-- 2. UserStatus
INSERT INTO user_statuses (status_id, status_name) VALUES
(1, 'ACTIVE'),
(2, 'LOCKED');

-- 3. RestaurantStatus
INSERT INTO restaurant_statuses (status_id, status_name) VALUES
(1, 'PENDING'),
(2, 'ACTIVE'),
(3, 'REJECTED'),
(4, 'SUSPENDED');

-- 4. FoodStatus
INSERT INTO food_statuses (status_id, status_name) VALUES
(1, 'AVAILABLE'),
(2, 'UNAVAILABLE');

-- 5. ShipperStatus
INSERT INTO shipper_statuses (status_id, status_name) VALUES
(1, 'OFFLINE'),
(2, 'ONLINE'),
(3, 'BUSY');

-- 6. OrderStatus - values exactly follow the document
INSERT INTO order_statuses (status_id, status_name) VALUES
(1, 'PENDING'),
(2, 'CONFIRMED'),
(3, 'PREPARING'),
(4, 'READY_FOR_PICKUP'),
(5, 'PICKED_UP'),
(6, 'DELIVERING'),
(7, 'COMPLETED'),
(8, 'CANCELLED'),
(9, 'REJECTED');

-- 7. PaymentMethod - current MVP supports COD only
INSERT INTO payment_methods (method_id, method_name) VALUES
(1, 'COD');

-- 8. PaymentStatus - proposed because document does not enumerate payment statuses
INSERT INTO payment_statuses (status_id, status_name) VALUES
(1, 'PENDING'),
(2, 'PAID'),
(3, 'FAILED'),
(4, 'CANCELLED');

-- 9. VoucherStatus - document explicitly uses ACTIVE; other values proposed
INSERT INTO voucher_statuses (status_id, status_name) VALUES
(1, 'ACTIVE'),
(2, 'INACTIVE'),
(3, 'EXPIRED');

-- 10. ReviewStatus - proposed for Admin moderation
INSERT INTO review_statuses (status_id, status_name) VALUES
(1, 'VISIBLE'),
(2, 'HIDDEN'),
(3, 'PENDING');

-- 11. Users
-- password_hash values are sample placeholders, not real production hashes.
INSERT INTO users (user_id, role_id, email, password_hash, status_id) VALUES
(1, 1, 'customer1@example.com', 'HASH_CUSTOMER_1', 1),
(2, 1, 'customer2@example.com', 'HASH_CUSTOMER_2', 1),
(3, 1, 'customer3@example.com', 'HASH_CUSTOMER_3', 2),
(4, 2, 'restaurant1@example.com', 'HASH_RESTAURANT_1', 1),
(5, 2, 'restaurant2@example.com', 'HASH_RESTAURANT_2', 1),
(6, 2, 'restaurant3@example.com', 'HASH_RESTAURANT_3', 1),
(7, 3, 'shipper1@example.com', 'HASH_SHIPPER_1', 1),
(8, 3, 'shipper2@example.com', 'HASH_SHIPPER_2', 1),
(9, 3, 'shipper3@example.com', 'HASH_SHIPPER_3', 1),
(10, 4, 'admin1@example.com', 'HASH_ADMIN_1', 1);

-- 12. Customers
INSERT INTO customers (customer_id, user_id) VALUES
(1, 1),
(2, 2),
(3, 3);

-- 13. CustomerProfiles
INSERT INTO customer_profiles
(profile_id, customer_id, full_name, phone, date_of_birth) VALUES
(1, 1, 'Nguyen Van An', '0901000001', '2003-05-10'),
(2, 2, 'Tran Thi Binh', '0901000002', '2002-09-21'),
(3, 3, 'Le Van Cuong', '0901000003', '2004-01-15');

-- 14. Admins
INSERT INTO admins (admin_id, user_id, full_name) VALUES
(1, 10, 'System Administrator');

-- 15. Restaurants
INSERT INTO restaurants
(restaurant_id, user_id, name, address, phone, description, status_id,
 latitude, longitude, image, opening_time, closing_time) VALUES
(1, 4, 'Chicken House', '12 Nguyen Trai, Hanoi',
 '02430000001', 'Chicken and fast food restaurant', 2,
 20.9950000, 105.8110000, 'chicken-house.jpg', '09:00:00', '22:00:00'),
(2, 5, 'Pho Viet', '25 Tran Duy Hung, Hanoi',
 '02430000002', 'Traditional Vietnamese noodles', 2,
 21.0080000, 105.8030000, 'pho-viet.jpg', '06:00:00', '21:30:00'),
(3, 6, 'Pizza Corner', '88 Cau Giay, Hanoi',
 '02430000003', 'Pizza and Italian food', 4,
 21.0360000, 105.7930000, 'pizza-corner.jpg', '10:00:00', '22:00:00');

-- 16. Shippers
INSERT INTO shippers (shipper_id, user_id, full_name, phone, status_id) VALUES
(1, 7, 'Pham Duc Long', '0912000001', 2),
(2, 8, 'Do Minh Khang', '0912000002', 3),
(3, 9, 'Vu Quang Huy', '0912000003', 1);

-- 17. Categories
INSERT INTO categories (category_id, name, description, is_active) VALUES
(1, 'Com', 'Rice dishes', TRUE),
(2, 'Ga', 'Chicken dishes', TRUE),
(3, 'Burger', 'Burger dishes', TRUE),
(4, 'Mi & Pho', 'Noodles and pho', TRUE),
(5, 'Pizza', 'Pizza dishes', TRUE);

-- 18. Foods
INSERT INTO foods
(food_id, restaurant_id, category_id, name, description, price, image, status_id) VALUES
(1, 1, 2, 'Ga Ran Truyen Thong', 'Crispy fried chicken', 55000, 'ga-ran.jpg', 1),
(2, 1, 3, 'Chicken Burger', 'Burger with crispy chicken', 65000, 'chicken-burger.jpg', 1),
(3, 1, 1, 'Com Ga', 'Rice with fried chicken', 60000, 'com-ga.jpg', 2),
(4, 2, 4, 'Pho Bo', 'Traditional beef pho', 50000, 'pho-bo.jpg', 1),
(5, 2, 4, 'Pho Ga', 'Traditional chicken pho', 48000, 'pho-ga.jpg', 1),
(6, 3, 5, 'Pepperoni Pizza', 'Pepperoni pizza', 120000, 'pepperoni.jpg', 1);

-- 19. Addresses
INSERT INTO addresses
(address_id, customer_id, address_name, receiver_name, receiver_phone,
 full_address, latitude, longitude, note, is_default) VALUES
(1, 1, 'Nha', 'Nguyen Van An', '0901000001',
 '15 Nguyen Trai, Thanh Xuan, Hanoi', 20.9940000, 105.8120000,
 'Giao gio hanh chinh', TRUE),
(2, 1, 'Cong ty', 'Nguyen Van An', '0901000001',
 '100 Lang Ha, Dong Da, Hanoi', 21.0120000, 105.8150000,
 'Goi truoc khi giao', FALSE),
(3, 2, 'Nha', 'Tran Thi Binh', '0901000002',
 '20 Tran Duy Hung, Cau Giay, Hanoi', 21.0070000, 105.8040000,
 'Tang 3', TRUE),
(4, 3, 'Nha', 'Le Van Cuong', '0901000003',
 '50 Cau Giay, Hanoi', 21.0340000, 105.7950000,
 'Khong can goi', TRUE);

-- 20. Carts
INSERT INTO carts (cart_id, customer_id, restaurant_id) VALUES
(1, 1, 1),
(2, 2, 2),
(3, 3, 3);

-- 21. CartItems
INSERT INTO cart_items
(cart_item_id, cart_id, food_id, quantity, unit_price, subtotal) VALUES
(1, 1, 1, 2, 55000, 110000),
(2, 1, 2, 1, 65000, 65000),
(3, 2, 4, 2, 50000, 100000),
(4, 2, 5, 1, 48000, 48000),
(5, 3, 6, 1, 120000, 120000);

-- 22. Vouchers
INSERT INTO vouchers
(voucher_id, code, discount_value, min_order_value, usage_limit, used_count,
 status_id, start_date, end_date) VALUES
(1, 'GIAM30K', 30000, 150000, 100, 2, 1,
 '2026-09-01 00:00:00', '2026-12-31 23:59:59'),
(2, 'GIAM20K', 20000, 100000, 50, 0, 1,
 '2026-09-01 00:00:00', '2026-10-31 23:59:59'),
(3, 'OLD10K', 10000, 80000, 20, 20, 3,
 '2026-01-01 00:00:00', '2026-02-28 23:59:59');

-- 23. Orders
INSERT INTO orders
(order_id, order_code, customer_id, restaurant_id, address_id, voucher_id,
 subtotal, delivery_fee, discount, total_amount, status_id, note) VALUES
(1, 'FD202609210001', 1, 1, 1, 1,
 175000, 25000, 30000, 170000, 7, 'Giao hang thanh cong'),
(2, 'FD202609210002', 2, 2, 3, 2,
 148000, 18000, 20000, 146000, 6, 'Dang giao'),
(3, 'FD202609210003', 3, 1, 4, NULL,
 110000, 22000, 0, 132000, 1, 'Cho Restaurant xac nhan'),
(4, 'FD202609210004', 1, 2, 2, NULL,
 98000, 20000, 0, 118000, 9, 'Restaurant tu choi'),
(5, 'FD202609210005', 2, 1, 3, NULL,
 55000, 15000, 0, 70000, 8, 'Customer huy don');

-- 24. OrderDetails
INSERT INTO order_details
(order_detail_id, order_id, food_id, quantity, unit_price, subtotal) VALUES
(1, 1, 1, 2, 55000, 110000),
(2, 1, 2, 1, 65000, 65000),
(3, 2, 4, 2, 50000, 100000),
(4, 2, 5, 1, 48000, 48000),
(5, 3, 1, 2, 55000, 110000),
(6, 4, 5, 2, 49000, 98000),
(7, 5, 1, 1, 55000, 55000);

-- 25. OrderStatusHistory
INSERT INTO order_status_history
(history_id, order_id, status_id, changed_by_user_id, note, changed_at) VALUES
(1, 1, 1, 1, 'Customer created order', '2026-09-21 09:00:00'),
(2, 1, 2, 4, 'Restaurant accepted order', '2026-09-21 09:05:00'),
(3, 1, 3, 4, 'Restaurant started preparing', '2026-09-21 09:10:00'),
(4, 1, 4, 4, 'Food ready for pickup', '2026-09-21 09:35:00'),
(5, 1, 5, 7, 'Shipper picked up food', '2026-09-21 09:45:00'),
(6, 1, 6, 7, 'Shipper started delivery', '2026-09-21 09:50:00'),
(7, 1, 7, 7, 'Delivery completed', '2026-09-21 10:15:00'),
(8, 2, 1, 2, 'Customer created order', '2026-09-21 10:00:00'),
(9, 2, 2, 5, 'Restaurant accepted order', '2026-09-21 10:05:00'),
(10, 2, 3, 5, 'Preparing food', '2026-09-21 10:10:00'),
(11, 2, 4, 5, 'Ready for pickup', '2026-09-21 10:35:00'),
(12, 2, 5, 8, 'Shipper picked up food', '2026-09-21 10:45:00'),
(13, 2, 6, 8, 'Shipper delivering', '2026-09-21 10:50:00'),
(14, 3, 1, 3, 'Customer created order', '2026-09-21 11:00:00'),
(15, 4, 1, 1, 'Customer created order', '2026-09-21 11:20:00'),
(16, 4, 9, 5, 'Restaurant rejected order', '2026-09-21 11:25:00'),
(17, 5, 1, 2, 'Customer created order', '2026-09-21 11:40:00'),
(18, 5, 8, 2, 'Customer cancelled order', '2026-09-21 11:45:00');

-- 26. Payments
INSERT INTO payments
(payment_id, order_id, method_id, status_id, amount, paid_at) VALUES
(1, 1, 1, 2, 170000, '2026-09-21 10:15:00'),
(2, 2, 1, 1, 146000, NULL),
(3, 3, 1, 1, 142000, NULL),
(4, 4, 1, 4, 118000, NULL),
(5, 5, 1, 4, 70000, NULL);

-- 27. Deliveries
INSERT INTO deliveries
(delivery_id, order_id, shipper_id, pickup_time, delivery_time, status, note) VALUES
(1, 1, 1, '2026-09-21 09:45:00', '2026-09-21 10:15:00',
 'COMPLETED', 'COD collected successfully'),
(2, 2, 2, '2026-09-21 10:45:00', NULL,
 'DELIVERING', 'Customer will pay COD on delivery'),
(3, 3, NULL, NULL, NULL,
 'REQUESTED', 'Waiting for Shipper'),
(4, 4, NULL, NULL, NULL,
 'CANCELLED', 'Order rejected by Restaurant');

-- 28. Reviews
-- Review is inserted after the completed orders 6 and 7 are created below.
INSERT INTO orders
(order_id, order_code, customer_id, restaurant_id, address_id, voucher_id,
 subtotal, delivery_fee, discount, total_amount, status_id, note) VALUES
(6, 'FD202609210006', 2, 1, 3, NULL,
 55000, 15000, 0, 70000, 7, 'Completed order for review sample'),
(7, 'FD202609210007', 3, 2, 4, NULL,
 98000, 18000, 0, 116000, 7, 'Completed order for review sample');

INSERT INTO order_details
(order_detail_id, order_id, food_id, quantity, unit_price, subtotal) VALUES
(8, 6, 1, 1, 55000, 55000),
(9, 7, 5, 2, 49000, 98000);

INSERT INTO reviews
(review_id, customer_id, order_id, rating, comment, status_id) VALUES
(1, 1, 1, 5, 'Mon an ngon, giao hang dung gio.', 1),
(2, 2, 6, 4, 'Chat luong mon tot.', 1),
(3, 3, 7, 2, 'Noi dung review minh hoa du lieu moderation.', 2);

-- Add payment/delivery/history for the two completed review orders
INSERT INTO payments
(payment_id, order_id, method_id, status_id, amount, paid_at) VALUES
(6, 6, 1, 2, 70000, '2026-09-21 12:20:00'),
(7, 7, 1, 2, 116000, '2026-09-21 13:10:00');

INSERT INTO deliveries
(delivery_id, order_id, shipper_id, pickup_time, delivery_time, status, note) VALUES
(5, 6, 1, '2026-09-21 12:00:00', '2026-09-21 12:20:00',
 'COMPLETED', 'COD collected'),
(6, 7, 3, '2026-09-21 12:45:00', '2026-09-21 13:10:00',
 'COMPLETED', 'COD collected');

INSERT INTO order_status_history
(history_id, order_id, status_id, changed_by_user_id, note, changed_at) VALUES
(19, 6, 1, 2, 'Customer created order', '2026-09-21 11:50:00'),
(20, 6, 7, 7, 'Completed', '2026-09-21 12:20:00'),
(21, 7, 1, 3, 'Customer created order', '2026-09-21 12:30:00'),
(22, 7, 7, 9, 'Completed', '2026-09-21 13:10:00');

-- ============================================================
-- END
-- ============================================================

Show Tables;