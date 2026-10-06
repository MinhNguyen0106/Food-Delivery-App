const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger");
const AppError = require("./services/AppError");
const errorHandler = require("./middleware/errorHandler");
const authenticate = require("./middleware/authenticate");
const authorizeResource = require("./middleware/authorizeResource");
const { uploadsRoot } = require("./config/uploads");
const app = express();
const cors = require("cors");
const allowedOrigins = new Set(
  (
    process.env.CORS_ORIGINS ||
    "http://localhost:8081,http://localhost:8091,http://localhost:8092,http://localhost:8082"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.has(origin));
    },
  }),
);
app.use(express.json());
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(
  "/uploads",
  express.static(uploadsRoot, {
    dotfiles: "deny",
    index: false,
    redirect: false,
    setHeaders(res) {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
      res.setHeader("Content-Disposition", "inline");
    },
  }),
);

app.use("/api/auth", require("./router/authRouter"));
app.use("/api", require("./router/catalogRouter"));
app.use("/api/addresses", require("./router/addressRouter"));
app.use("/api/carts", require("./router/cartsRouter"));
app.use("/api/cart_items", require("./router/cart_itemsRouter"));
app.use("/api/orders", require("./router/ordersRouter"));
app.use("/api/deliveries", require("./router/deliveriesRouter"));
app.use("/api/reviews", require("./router/reviewsRouter"));
app.use("/api/vouchers", require("./router/vouchersRouter"));
app.use("/api/admin", require("./router/adminRouter"));
app.use("/api/reports", require("./router/reportRouter"));

function mountResource(resource) {
  app.use(
    `/api/${resource}`,
    authenticate,
    authorizeResource(resource),
    require(`./router/${resource}Router`),
  );
}

[
  "admins",
  "customer_profiles",
  "customers",
  "food_statuses",
  "order_details",
  "order_status_history",
  "order_statuses",
  "payment_methods",
  "payment_statuses",
  "payments",
  "restaurant_statuses",
  "restaurants",
  "review_statuses",
  "shipper_statuses",
  "shippers",
  "user_roles",
  "user_statuses",
  "users",
  "voucher_statuses",
].forEach(mountResource);

app.use((req, res, next) => {
  next(new AppError("Route not found", 404, "NOT_FOUND"));
});
app.use(errorHandler);

module.exports = app;
