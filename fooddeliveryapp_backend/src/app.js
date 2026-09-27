const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger');
const AppError = require('./services/AppError');
const errorHandler = require('./middleware/errorHandler');
const authenticate = require('./middleware/authenticate');
const authorizeResource = require('./middleware/authorizeResource');
const app = express();
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api/auth', require('./router/authRouter'));
app.use('/api', require('./router/catalogRouter'));
app.use('/api/addresses', require('./router/addressRouter'));

function mountResource(resource) {
    app.use(
        `/api/${resource}`,
        authenticate,
        authorizeResource(resource),
        require(`./router/${resource}Router`)
    );
}

[
    'admins',
    'cart_items',
    'carts',
    'customer_profiles',
    'customers',
    'deliveries',
    'food_statuses',
    'order_details',
    'order_status_history',
    'order_statuses',
    'orders',
    'payment_methods',
    'payment_statuses',
    'payments',
    'restaurant_statuses',
    'restaurants',
    'review_statuses',
    'reviews',
    'shipper_statuses',
    'shippers',
    'user_roles',
    'user_statuses',
    'users',
    'voucher_statuses',
    'vouchers',
].forEach(mountResource);

app.use((req, res, next) => {
    next(new AppError('Route not found', 404, 'NOT_FOUND'));
});
app.use(errorHandler);

module.exports = app;
