const express = require("express");
const cors = require("cors"); // 1. Require gói cors
const app = express();

// 2. Kích hoạt Middleware CORS cho tất cả các request
app.use(cors());

app.use(express.json());

app.use("/api/addresses", require("./router/addressesRouter"));
app.use("/api/admins", require("./router/adminsRouter"));
app.use("/api/cart_items", require("./router/cart_itemsRouter"));
app.use("/api/carts", require("./router/cartsRouter"));
app.use("/api/categories", require("./router/categoriesRouter"));
app.use("/api/customer_profiles", require("./router/customer_profilesRouter"));
app.use("/api/customers", require("./router/customersRouter"));
app.use("/api/deliveries", require("./router/deliveriesRouter"));
app.use("/api/food_statuses", require("./router/food_statusesRouter"));
app.use("/api/foods", require("./router/foodsRouter"));
app.use("/api/order_details", require("./router/order_detailsRouter"));
app.use(
  "/api/order_status_history",
  require("./router/order_status_historyRouter"),
);
app.use("/api/order_statuses", require("./router/order_statusesRouter"));
app.use("/api/orders", require("./router/ordersRouter"));
app.use("/api/payment_methods", require("./router/payment_methodsRouter"));
app.use("/api/payment_statuses", require("./router/payment_statusesRouter"));
app.use("/api/payments", require("./router/paymentsRouter"));
app.use(
  "/api/restaurant_statuses",
  require("./router/restaurant_statusesRouter"),
);
app.use("/api/restaurants", require("./router/restaurantsRouter"));
app.use("/api/review_statuses", require("./router/review_statusesRouter"));
app.use("/api/reviews", require("./router/reviewsRouter"));
app.use("/api/shipper_statuses", require("./router/shipper_statusesRouter"));
app.use("/api/shippers", require("./router/shippersRouter"));
app.use("/api/user_roles", require("./router/user_rolesRouter"));
app.use("/api/user_statuses", require("./router/user_statusesRouter"));
app.use("/api/users", require("./router/usersRouter"));
app.use("/api/voucher_statuses", require("./router/voucher_statusesRouter"));
app.use("/api/vouchers", require("./router/vouchersRouter"));

module.exports = app;
