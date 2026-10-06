const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const fs = require('node:fs/promises');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const { db: dbConfig, jwtSecret } = require('../src/config/env');
const imageStorage = require('../src/services/imageStorageService');

const safeDatabaseName = /^food_delivery_app_it_\d{8}(?:_\d+)?$/;
const integrationEnabled = process.env.RUN_DB_INTEGRATION === '1';
if (integrationEnabled && !safeDatabaseName.test(dbConfig.database)) {
  throw new Error('Database integration tests require a dedicated food_delivery_app_it_* database');
}

function httpRequest(port, method, route, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  return fetch(`http://127.0.0.1:${port}${route}`, {
    method,
    headers,
    body: form || (body === undefined ? undefined : JSON.stringify(body)),
  }).then(async (response) => ({
    status: response.status,
    body: response.headers.get('content-type')?.includes('application/json')
      ? await response.json()
      : Buffer.from(await response.arrayBuffer()),
  }));
}

test('isolated MySQL API integration workflows', {
  skip: !integrationEnabled,
}, async (t) => {
  assert.match(dbConfig.database, safeDatabaseName);
  const authModel = require('../src/models/authModel');
  const pool = authModel.pool;
  const password = 'Integration-Password-2026!';
  const passwordHash = await bcrypt.hash(password, 4);
  await pool.execute(
    'UPDATE users SET password_hash = ? WHERE user_id BETWEEN 1 AND 10',
    [passwordHash]
  );
  await pool.execute(
    `UPDATE restaurants
     SET opening_time = '00:00:00', closing_time = '23:59:59'
     WHERE restaurant_id IN (1, 2)`
  );
  await pool.execute(
    `UPDATE shippers
     SET status_id = (SELECT status_id FROM shipper_statuses WHERE status_name = 'ONLINE')
     WHERE shipper_id IN (1, 3)`
  );
  await pool.execute(
    `UPDATE vouchers
     SET status_id = (SELECT status_id FROM voucher_statuses WHERE status_name = 'ACTIVE'),
         start_date = '2020-01-01 00:00:00', end_date = '2020-01-02 00:00:00'
     WHERE voucher_id = 3`
  );

  const app = require('../src/app');
  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const port = server.address().port;
  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    await pool.end();
  });
  const api = (method, route, options) => httpRequest(port, method, route, options);
  const login = async (email, loginPassword = password) => {
    const result = await api('POST', '/api/auth/login', {
      body: { email, password: loginPassword },
    });
    assert.equal(result.status, 200, `login failed for ${email}: ${JSON.stringify(result.body)}`);
    assert.equal(typeof result.body.data.token, 'string');
    return result.body.data.token;
  };
  const customer = await login('customer1@example.com');
  const customerB = await login('customer2@example.com');
  const restaurant = await login('restaurant1@example.com');
  const restaurantB = await login('restaurant2@example.com');
  const suspendedRestaurant = await login('restaurant3@example.com');
  const shipperA = await login('shipper1@example.com');
  const shipperB = await login('shipper3@example.com');
  const admin = await login('admin1@example.com');
  let orderId;

  await t.test('registration, stateless JWT, multiple login, and password fields', async () => {
    const email = `integration-${Date.now()}@example.test`;
    const registration = await api('POST', '/api/auth/register', {
      body: {
        email,
        password,
        fullName: 'Integration Customer',
        phone: `098${String(Date.now()).slice(-8)}`,
      },
    });
    assert.equal(registration.status, 201);
    assert.equal(registration.body.data.user.role, 'CUSTOMER');
    assert.doesNotMatch(JSON.stringify(registration.body), /password_hash/i);

    const duplicate = await api('POST', '/api/auth/register', {
      body: {
        email,
        password,
        fullName: 'Duplicate Customer',
        phone: `097${String(Date.now()).slice(-8)}`,
      },
    });
    assert.equal(duplicate.status, 409);

    const roleSpoof = await api('POST', '/api/auth/register', {
      body: {
        email: `restaurant-signup-${Date.now()}@example.test`,
        password,
        fullName: 'Cannot Self Register Restaurant',
        phone: `096${String(Date.now()).slice(-8)}`,
        role: 'RESTAURANT',
      },
    });
    assert.equal(roleSpoof.status, 400);

    const registeredUser = registration.body.data.user;
    const newCustomerToken = await login(email);
    const profile = await api('GET', '/api/auth/me', { token: newCustomerToken });
    assert.equal(profile.status, 200);
    assert.doesNotMatch(JSON.stringify(profile.body), /password_hash/i);

    const wrongPassword = await api('POST', '/api/auth/login', {
      body: { email: 'customer1@example.com', password: 'Wrong-Password-2026!' },
    });
    assert.equal(wrongPassword.status, 401);

    const locked = await api('POST', '/api/auth/login', {
      body: { email: 'customer3@example.com', password },
    });
    assert.equal(locked.status, 403);
    assert.equal(locked.body.error, 'ACCOUNT_LOCKED');

    const suspended = await api('GET', '/api/auth/me', { token: suspendedRestaurant });
    assert.equal(suspended.status, 403);
    assert.equal(suspended.body.error, 'ACCOUNT_SUSPENDED');

    const invalidJwt = await api('GET', '/api/auth/me', { token: 'not-a-jwt' });
    assert.equal(invalidJwt.status, 401);
    const badSignatureJwt = jwt.sign(
      { role: 'CUSTOMER' },
      'incorrect-test-secret-that-is-not-the-configured-secret',
      {
        subject: '1',
        issuer: 'food-delivery-backend',
        audience: 'food-delivery-api',
        expiresIn: '1h',
      }
    );
    assert.equal((await api('GET', '/api/auth/me', { token: badSignatureJwt })).status, 401);
    const expiredJwt = jwt.sign(
      { role: 'IGNORED' },
      jwtSecret,
      {
        subject: '1',
        issuer: 'food-delivery-backend',
        audience: 'food-delivery-api',
        expiresIn: -1,
      }
    );
    assert.equal((await api('GET', '/api/auth/me', { token: expiredJwt })).status, 401    );
    assert.equal((await api('GET', '/api/auth/me')).status, 401);

    const secondLogin = await login('customer1@example.com');
    assert.notEqual(secondLogin, customer);
    const decodedToken = jwt.decode(customer);
    assert.equal(decodedToken.sub, '1');
    assert.equal(decodedToken.role, 'CUSTOMER');
    assert.equal(Object.hasOwn(decodedToken, 'password'), false);
    assert.equal(Object.hasOwn(decodedToken, 'password_hash'), false);
    assert.equal((await api('GET', '/api/auth/me', { token: customer })).status, 200);
    assert.equal((await api('GET', '/api/auth/me', { token: secondLogin })).status, 200);

    const passwordChange = await api('POST', '/api/auth/change-password', {
      token: customer,
      body: { currentPassword: password, newPassword: 'New-Integration-Password-2026!' },
    });
    assert.equal(passwordChange.status, 200);
    assert.equal((await api('GET', '/api/auth/me', { token: customer })).status, 200);
    const changedPasswordToken = await login(
      'customer1@example.com',
      'New-Integration-Password-2026!'
    );
    assert.equal((await api('GET', '/api/auth/me', { token: changedPasswordToken })).status, 200);

    const logout = await api('POST', '/api/auth/logout', { token: customer });
    assert.equal(logout.status, 200);
    assert.equal((await api('GET', '/api/auth/me', { token: customer })).status, 200);

    const badCurrentPassword = await api('POST', '/api/auth/change-password', {
      token: customer,
      body: { currentPassword: password, newPassword: 'Another-Password-2026!' },
    });
    assert.equal(badCurrentPassword.status, 401);

    const maliciousRoleToken = jwt.sign(
      { role: 'ADMIN' },
      jwtSecret,
      {
        subject: '1',
        issuer: 'food-delivery-backend',
        audience: 'food-delivery-api',
        expiresIn: '1h',
      }
    );
    assert.equal((await api('GET', '/api/admin/customers', {
      token: maliciousRoleToken,
    })).status, 403);

    const restaurantProfile = await api('GET', '/api/auth/me', { token: restaurant });
    assert.equal(restaurantProfile.status, 200);
    assert.equal(restaurantProfile.body.data.role, 'RESTAURANT');
  });

  await t.test('role authorization and cross-owner access', async () => {
    for (const token of [customer, restaurant, shipperA]) {
      assert.equal((await api('GET', '/api/admin/customers', { token })).status, 403);
    }
    assert.equal((await api('GET', '/api/admin/customers', { token: admin })).status, 200);
    assert.equal(
      (await api('PUT', '/api/foods/4', {
        token: restaurant,
        body: { price: 1 },
      })).status,
      403
    );
    assert.equal((await api('GET', '/api/orders/2', { token: customer })).status, 404);
    assert.equal((await api('GET', '/api/addresses/3', { token: customer })).status, 404);
    assert.equal((await api('GET', '/api/deliveries/2', { token: shipperA })).status, 404);
    assert.equal((await api('GET', '/api/deliveries/orders/2', { token: customer })).status, 404);
    assert.equal((await api('GET', '/api/deliveries/orders/2', { token: restaurant })).status, 404);
    assert.equal((await api('GET', '/api/vouchers', { token: customer })).status, 403);
    for (const [method, route] of [
      ['GET', '/api/carts/1'],
      ['PUT', '/api/carts/1'],
      ['DELETE', '/api/carts/1'],
    ]) {
      const result = await api(method, route, {
        token: customer,
        ...(method === 'GET' ? {} : { body: {} }),
      });
      assert.equal(result.status, 404, `${method} ${route} should not be mounted`);
    }
  });

  await t.test('catalog availability and address ownership CRUD', async () => {
    const restaurants = await api('GET', '/api/restaurants', { token: customer });
    assert.equal(restaurants.status, 200);
    assert.ok(restaurants.body.data.some((row) => Number(row.restaurant_id) === 1));
    assert.ok(!restaurants.body.data.some((row) => Number(row.restaurant_id) === 3));
    assert.equal((await api('GET', '/api/foods/3', { token: customer })).status, 404);
    assert.equal((await api('GET', '/api/foods/999999', { token: customer })).status, 404);

    const categoryName = `Integration-${Date.now()}`;
    const category = await api('POST', '/api/categories', {
      token: admin,
      body: { name: categoryName, description: 'Isolated test category', is_active: true },
    });
    assert.equal(category.status, 201);
    const categoryId = category.body.id;
    const food = await api('POST', '/api/foods', {
      token: restaurant,
      body: { category_id: categoryId, name: 'Integration Food', price: 12500 },
    });
    assert.equal(food.status, 201);
    const foodId = food.body.id;
    assert.equal(
      (await api('PUT', `/api/foods/${foodId}`, {
        token: restaurant,
        body: { price: 13000 },
      })).status,
      200
    );
    const createdFood = await api('GET', `/api/foods/${foodId}`, { token: restaurant });
    assert.equal(Number(createdFood.body.data.price), 13000);
    assert.equal((await api('DELETE', `/api/foods/${foodId}`, { token: restaurant })).status, 200);
    assert.equal((await api('DELETE', `/api/categories/${categoryId}`, { token: admin })).status, 200);

    const created = await api('POST', '/api/addresses', {
      token: customer,
      body: {
        address_name: 'Integration temporary',
        receiver_name: 'Integration Customer',
        receiver_phone: '098 765 43210',
        full_address: 'Integration-only address',
        latitude: 20.994,
        longitude: 105.812,
        note: '',
        is_default: false,
      },
    });
    assert.equal(created.status, 201);
    const overLimit = await api('POST', '/api/addresses', {
      token: customer,
      body: {
        address_name: 'Integration fourth',
        receiver_name: 'Integration Customer',
        receiver_phone: '0981234567',
        full_address: 'This address should not be created',
        latitude: 21,
        longitude: 105,
      },
    });
    assert.equal(overLimit.status, 409);
    assert.equal(overLimit.body.error, 'ADDRESS_LIMIT_REACHED');
    const addressId = created.body.data.address_id;
    assert.equal((await api('GET', `/api/addresses/${addressId}`, { token: customer })).status, 200);
    assert.equal(
      (await api('PUT', `/api/addresses/${addressId}`, {
        token: customerB,
        body: { address_name: 'Unauthorized edit' },
      })).status,
      404
    );
    assert.equal(
      (await api('PUT', `/api/addresses/${addressId}`, {
        token: customer,
        body: { address_name: 'Integration updated' },
      })).status,
      200
    );
    assert.equal((await api('DELETE', `/api/addresses/${addressId}`, { token: customer })).status, 200);
    assert.equal((await api('GET', `/api/addresses/${addressId}`, { token: customer })).status, 404);
  });

  await t.test('cart price authority and checkout transaction/rollback', async () => {
    assert.equal((await api('DELETE', '/api/carts', { token: customer })).status, 200);
    const rejectedClientPrice = await api('POST', '/api/cart_items', {
      token: customer,
      body: { food_id: 1, quantity: 2, unit_price: 1, subtotal: 2 },
    });
    assert.equal(rejectedClientPrice.status, 400);
    assert.equal(
      (await api('POST', '/api/cart_items', {
        token: customer,
        body: { food_id: 1, quantity: 0 },
      })).status,
      400
    );
    assert.equal(
      (await api('POST', '/api/cart_items', {
        token: customer,
        body: { food_id: 3, quantity: 1 },
      })).status,
      409
    );
    const addedFood = await api('POST', '/api/cart_items', {
      token: customer,
      body: { food_id: 1, quantity: 2 },
    });
    assert.equal(addedFood.status, 200);
    const cartItemId = addedFood.body.data.items[0].cart_item_id;
    assert.equal(Number(addedFood.body.data.subtotal), 110000);
    assert.equal(
      (await api('DELETE', `/api/cart_items/${cartItemId}`, { token: customerB })).status,
      404
    );
    assert.equal(
      (await api('POST', '/api/cart_items', {
        token: customer,
        body: { food_id: 4, quantity: 1 },
      })).status,
      409
    );
    assert.equal(
      (await api('POST', '/api/cart_items', {
        token: customer,
        body: { food_id: 2, quantity: 1 },
      })).status,
      200
    );
    assert.equal(
      (await api('POST', '/api/orders/checkout', {
        token: customer,
        body: {
          address_id: 3,
          subtotal: 1,
          delivery_fee: 0,
          discount: 999999,
          total_amount: 1,
          payment_amount: 1,
        },
      })).status,
      400
    );
    assert.equal(
      (await api('POST', '/api/orders/checkout', {
        token: customer,
        body: { address_id: 3 },
      })).status,
      404
    );

    const invalidVoucher = await api('POST', '/api/orders/checkout', {
      token: customer,
      body: { address_id: 1, voucher_code: 'NOT-REAL' },
    });
    assert.equal(invalidVoucher.status, 400);
    const expiredVoucher = await api('POST', '/api/orders/checkout', {
      token: customer,
      body: { address_id: 1, voucher_code: 'OLD10K' },
    });
    assert.equal(expiredVoucher.status, 409);
    await pool.execute('UPDATE vouchers SET min_order_value = 200000 WHERE voucher_id = 1');
    const minimumVoucher = await api('POST', '/api/orders/checkout', {
      token: customer,
      body: { address_id: 1, voucher_code: 'GIAM30K' },
    });
    assert.equal(minimumVoucher.status, 409);
    await pool.execute('UPDATE vouchers SET min_order_value = 150000 WHERE voucher_id = 1');

    const [beforeOrders] = await pool.query('SELECT COUNT(*) AS count FROM orders');
    const [beforeVoucher] = await pool.execute(
      'SELECT used_count FROM vouchers WHERE voucher_id = 1'
    );
    await pool.query(
      `CREATE TRIGGER integration_fail_payment
       BEFORE INSERT ON payments
       FOR EACH ROW SIGNAL SQLSTATE '45000'
       SET MESSAGE_TEXT = 'test rollback'`
    );
    let rollbackResponse;
    try {
      rollbackResponse = await api('POST', '/api/orders/checkout', {
        token: customer,
        body: { address_id: 1, voucher_code: 'GIAM30K' },
      });
    } finally {
      await pool.query('DROP TRIGGER integration_fail_payment');
    }
    assert.equal(rollbackResponse.status, 500);
    const [afterOrders] = await pool.query('SELECT COUNT(*) AS count FROM orders');
    const [afterVoucher] = await pool.execute(
      'SELECT used_count FROM vouchers WHERE voucher_id = 1'
    );
    const cartAfterRollback = await api('GET', '/api/carts', { token: customer });
    assert.equal(Number(afterOrders[0].count), Number(beforeOrders[0].count));
    assert.equal(Number(afterVoucher[0].used_count), Number(beforeVoucher[0].used_count));
    assert.equal(cartAfterRollback.body.data.items.length, 2);

    const checkout = await api('POST', '/api/orders/checkout', {
      token: customer,
      body: { address_id: 1, voucher_code: 'GIAM30K' },
    });
    assert.equal(checkout.status, 201);
    assert.equal(checkout.body.data.paymentMethod, 'COD');
    assert.equal(Number(checkout.body.data.subtotal), 175000);
    assert.equal(
      Number(checkout.body.data.totalAmount),
      Number(checkout.body.data.subtotal) +
        Number(checkout.body.data.deliveryFee) -
        Number(checkout.body.data.discount)
    );
    assert.equal(Number(checkout.body.data.discount), 30000);
    orderId = checkout.body.data.orderId;
    const [createdOrder] = await pool.execute(
      `SELECT order_record.total_amount, payment.amount, payment_status.status_name AS payment_status
       FROM orders order_record
       JOIN payments payment ON payment.order_id = order_record.order_id
       JOIN payment_statuses payment_status ON payment_status.status_id = payment.status_id
       WHERE order_record.order_id = ?`,
      [orderId]
    );
    assert.equal(Number(createdOrder[0].total_amount), Number(createdOrder[0].amount));
    assert.equal(createdOrder[0].payment_status, 'PENDING');
    const clearedCart = await api('GET', '/api/carts', { token: customer });
    assert.equal(clearedCart.body.data.items.length, 0);
    t.diagnostic(`Created isolated test order ${orderId} for workflow checks.`);
  });

  assert.ok(orderId, 'checkout workflow must create a test order');

  await t.test('order transitions, concurrent delivery claim, and COD completion', async () => {
    assert.equal(
      (await api('POST', `/api/orders/${orderId}/prepare`, {
        token: restaurant,
        body: {},
      })).status,
      409
    );
    assert.equal(
      (await api('POST', `/api/orders/${orderId}/confirm`, {
        token: restaurantB,
        body: {},
      })).status,
      404
    );
    for (const action of ['confirm', 'prepare', 'ready-for-pickup']) {
      const transition = await api('POST', `/api/orders/${orderId}/${action}`, {
        token: restaurant,
        body: {},
      });
      assert.equal(transition.status, 200, `${action}: ${JSON.stringify(transition.body)}`);
    }

    const [deliveryRows] = await pool.execute(
      'SELECT delivery_id FROM deliveries WHERE order_id = ?',
      [orderId]
    );
    const deliveryId = deliveryRows[0].delivery_id;
    const availableBeforeAccept = await api('GET', '/api/deliveries/available', {
      token: shipperA,
    });
    assert.equal(availableBeforeAccept.status, 200);
    assert.ok(
      availableBeforeAccept.body.data.some(
        (delivery) => Number(delivery.delivery_id) === Number(deliveryId)
      ),
      'ready and unassigned delivery should be available to a shipper',
    );
    const claims = await Promise.all([
      api('POST', `/api/deliveries/${deliveryId}/accept`, { token: shipperA, body: {} }),
      api('POST', `/api/deliveries/${deliveryId}/accept`, { token: shipperB, body: {} }),
    ]);
    assert.deepEqual(claims.map((result) => result.status).sort(), [200, 409]);
    const availableAfterAccept = await api('GET', '/api/deliveries/available', {
      token: shipperA,
    });
    assert.equal(availableAfterAccept.status, 200);
    assert.equal(
      availableAfterAccept.body.data.some(
        (delivery) => Number(delivery.delivery_id) === Number(deliveryId)
      ),
      false,
      'assigned delivery should no longer be available',
    );
    const [assignedRows] = await pool.execute(
      `SELECT delivery.shipper_id, shipper.user_id
       FROM deliveries delivery JOIN shippers shipper ON shipper.shipper_id = delivery.shipper_id
       WHERE delivery.delivery_id = ?`,
      [deliveryId]
    );
    const winningShipper = Number(assignedRows[0].shipper_id) === 1 ? shipperA : shipperB;
    const otherShipper = winningShipper === shipperA ? shipperB : shipperA;
    assert.equal(
      (await api('POST', `/api/deliveries/${deliveryId}/complete`, {
        token: otherShipper,
        body: {},
      })).status,
      404
    );
    assert.equal(
      (await api('POST', `/api/deliveries/${deliveryId}/start`, {
        token: winningShipper,
        body: {},
      })).status,
      409
    );
    await pool.execute(
      `UPDATE payments
       SET amount = amount + 1000
       WHERE order_id = ?`,
      [orderId]
    );
    for (const action of ['pickup', 'start', 'complete']) {
      const result = await api('POST', `/api/deliveries/${deliveryId}/${action}`, {
        token: winningShipper,
        body: {},
      });
      assert.equal(result.status, 200, `${action}: ${JSON.stringify(result.body)}`);
    }
    const [completion] = await pool.execute(
      `SELECT order_status.status_name AS order_status,
         delivery.status AS delivery_status,
         payment_status.status_name AS payment_status,
         order_record.total_amount, payment.amount
       FROM orders order_record
       JOIN order_statuses order_status ON order_status.status_id = order_record.status_id
       JOIN deliveries delivery ON delivery.order_id = order_record.order_id
       JOIN payments payment ON payment.order_id = order_record.order_id
       JOIN payment_statuses payment_status ON payment_status.status_id = payment.status_id
       WHERE order_record.order_id = ?`,
      [orderId]
    );
    const [history] = await pool.execute(
      'SELECT COUNT(*) AS count FROM order_status_history WHERE order_id = ?',
      [orderId]
    );
    assert.equal(completion[0].order_status, 'COMPLETED');
    assert.equal(completion[0].delivery_status, 'COMPLETED');
    assert.equal(completion[0].payment_status, 'PAID');
    assert.equal(Number(completion[0].amount), Number(completion[0].total_amount));
    assert.ok(Number(history[0].count) >= 5);
    const shipperHistory = await api('GET', '/api/deliveries/history', {
      token: winningShipper,
    });
    assert.equal(shipperHistory.status, 200);
    assert.ok(
      shipperHistory.body.data.some(
        (delivery) =>
          Number(delivery.delivery_id) === Number(deliveryId) &&
          delivery.delivery_status === 'COMPLETED'
      ),
      'completed delivery should appear in its shipper history',
    );
    const otherShipperHistory = await api('GET', '/api/deliveries/history', {
      token: otherShipper,
    });
    assert.equal(otherShipperHistory.status, 200);
    assert.equal(
      otherShipperHistory.body.data.some(
        (delivery) => Number(delivery.delivery_id) === Number(deliveryId)
      ),
      false,
      'delivery history must be scoped to its shipper',
    );
    assert.equal((await api('GET', `/api/deliveries/orders/${orderId}`, { token: customer })).status, 200);
    assert.equal((await api('GET', `/api/orders/${orderId}`, { token: customerB })).status, 404);
  });

  await t.test('review eligibility, duplicate prevention, and moderation', async () => {
    const invalidRating = await api('POST', '/api/reviews', {
      token: customer,
      body: { order_id: orderId, rating: 6 },
    });
    assert.equal(invalidRating.status, 400);
    const otherCustomer = await api('POST', '/api/reviews', {
      token: customerB,
      body: { order_id: orderId, rating: 5 },
    });
    assert.equal(otherCustomer.status, 404);
    const review = await api('POST', '/api/reviews', {
      token: customer,
      body: { order_id: orderId, rating: 5, comment: 'Integration review' },
    });
    assert.equal(review.status, 201);
    const reviewId = review.body.data.reviewId;
    assert.equal(review.body.data.status, 'VISIBLE');
    const restaurantList = await api('GET', '/api/restaurants', { token: customer });
    const restaurantIds = restaurantList.body.data.map((row) => row.restaurant_id);
    assert.equal(new Set(restaurantIds).size, restaurantIds.length);
    assert.equal(
      (await api('POST', '/api/reviews', {
        token: customer,
        body: { order_id: orderId, rating: 4 },
      })).status,
      409
    );
    assert.equal((await api('GET', '/api/reviews/restaurant/mine', { token: restaurant })).body.data
      .some((row) => Number(row.review_id) === reviewId), true);
    const customerReviews = await api(
      'GET',
      '/api/reviews/restaurant/1',
      { token: customer }
    );
    const publicReview = customerReviews.body.data.find(
      (row) => Number(row.review_id) === reviewId
    );
    assert.ok(publicReview);
    assert.equal(Object.hasOwn(publicReview, 'customer_id'), false);
    assert.equal(
      (await api('PATCH', `/api/reviews/${reviewId}/status`, {
        token: customer,
        body: { status: 'VISIBLE' },
      })).status,
      403
    );
    assert.equal(
      (await api('PATCH', `/api/reviews/${reviewId}/status`, {
        token: admin,
        body: { status: 'HIDDEN' },
      })).status,
      200
    );
    assert.equal(
      (await api('GET', '/api/reviews/restaurant/1', {
        token: customer,
      })).body.data.some((row) => Number(row.review_id) === reviewId),
      false
    );
    assert.equal(
      (await api('PATCH', `/api/reviews/${reviewId}/status`, {
        token: admin,
        body: { status: 'VISIBLE' },
      })).status,
      200
    );
    const visibleReviews = await api('GET', '/api/reviews/restaurant/mine', { token: restaurant });
    const visibleReview = visibleReviews.body.data.find((row) => Number(row.review_id) === reviewId);
    assert.ok(visibleReview);
    assert.equal(Object.hasOwn(visibleReview, 'customer_id'), false);
    assert.equal((await api('GET', '/api/reviews', { token: admin })).status, 200);
  });

  await t.test('image upload ownership, replacement, static file, and deletion', async () => {
    const makeForm = (name) => {
      const form = new FormData();
      form.append('image', new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], {
        type: 'image/png',
      }), name);
      return form;
    };
    const managedPaths = [];
    try {
      const first = await api('PUT', '/api/foods/1/image', {
        token: restaurant,
        form: makeForm('first.png'),
      });
      assert.equal(first.status, 200);
      const firstPath = first.body.data.image;
      managedPaths.push(firstPath);
      assert.match(firstPath, /^\/uploads\/foods\//);
      const [firstDb] = await pool.execute('SELECT image FROM foods WHERE food_id = 1');
      assert.equal(firstDb[0].image, firstPath);
      await fs.access(storedImagePath(firstPath));
      assert.equal((await api('GET', firstPath)).status, 200);

      assert.equal(
        (await api('PUT', '/api/foods/1/image', {
          token: restaurantB,
          form: makeForm('wrong-owner.png'),
        })).status,
        404
      );
      const second = await api('PUT', '/api/foods/1/image', {
        token: restaurant,
        form: makeForm('second.png'),
      });
      assert.equal(second.status, 200);
      const secondPath = second.body.data.image;
      managedPaths.push(secondPath);
      assert.notEqual(secondPath, firstPath);
      await assert.rejects(fs.access(storedImagePath(firstPath)));
      const deleted = await api('DELETE', '/api/foods/1/image', { token: restaurant });
      assert.equal(deleted.status, 200);
      assert.equal(deleted.body.data.image, null);
      const [cleared] = await pool.execute('SELECT image FROM foods WHERE food_id = 1');
      assert.equal(cleared[0].image, null);
      await assert.rejects(fs.access(storedImagePath(secondPath)));
      assert.equal(
        (await api('PUT', '/api/foods/1/image', { token: restaurant, form: new FormData() })).status,
        400
      );
    } finally {
      const [current] = await pool.execute('SELECT image FROM foods WHERE food_id = 1');
      if (current[0].image) await imageStorage.deleteImage(current[0].image, 'foods');
      for (const imagePath of managedPaths) await imageStorage.deleteImage(imagePath, 'foods');
      await pool.execute("UPDATE foods SET image = 'ga-ran.jpg' WHERE food_id = 1");
    }
  });

  await t.test('voucher usage is serialized across simultaneous checkouts; Admin reports run', async () => {
    await pool.execute(
      `UPDATE vouchers SET used_count = 0, usage_limit = 1,
         status_id = (SELECT status_id FROM voucher_statuses WHERE status_name = 'ACTIVE'),
         start_date = '2020-01-01 00:00:00', end_date = '2035-12-31 23:59:59'
       WHERE voucher_id = 2`
    );
    await api('DELETE', '/api/carts', { token: customer });
    const [customerBCart] = await pool.execute('SELECT cart_id FROM carts WHERE customer_id = 2');
    await pool.execute('DELETE FROM cart_items WHERE cart_id = ?', [customerBCart[0].cart_id]);
    await pool.execute('UPDATE carts SET restaurant_id = NULL WHERE cart_id = ?', [customerBCart[0].cart_id]);
    assert.equal(
      (await api('POST', '/api/cart_items', {
        token: customer,
        body: { food_id: 1, quantity: 2 },
      })).status,
      200
    );
    assert.equal(
      (await api('POST', '/api/cart_items', {
        token: customerB,
        body: { food_id: 4, quantity: 3 },
      })).status,
      200
    );
    const quote = await api('POST', '/api/orders/quote', {
      token: customer,
      body: { address_id: 1, voucher_code: 'GIAM20K' },
    });
    assert.equal(quote.status, 200);
    assert.equal(quote.body.data.paymentMethod, 'COD');
    assert.equal(quote.body.data.voucherCode, 'GIAM20K');
    assert.equal(
      quote.body.data.totalAmount,
      quote.body.data.subtotal + quote.body.data.deliveryFee - quote.body.data.discount
    );
    const invalidQuote = await api('POST', '/api/orders/quote', {
      token: customer,
      body: { address_id: 1, voucher_code: 'NOT-A-REAL-CODE' },
    });
    assert.equal(invalidQuote.status, 400);
    const [unconsumedVoucher] = await pool.execute(
      'SELECT used_count FROM vouchers WHERE voucher_id = 2'
    );
    assert.equal(Number(unconsumedVoucher[0].used_count), 0);
    const quotedCart = await api('GET', '/api/carts', { token: customer });
    assert.equal(quotedCart.status, 200);
    assert.equal(quotedCart.body.data.items.length, 1);

    const concurrent = await Promise.all([
      api('POST', '/api/orders/checkout', {
        token: customer,
        body: { address_id: 1, voucher_code: 'GIAM20K' },
      }),
      api('POST', '/api/orders/checkout', {
        token: customerB,
        body: { address_id: 3, voucher_code: 'GIAM20K' },
      }),
    ]);
    assert.deepEqual(concurrent.map((result) => result.status).sort(), [201, 409]);
    const [usage] = await pool.execute('SELECT used_count, usage_limit FROM vouchers WHERE voucher_id = 2');
    assert.equal(Number(usage[0].used_count), 1);
    assert.equal(Number(usage[0].used_count) <= Number(usage[0].usage_limit), true);

    const oneTimeCode = `ONETIME${Date.now()}`;
    const [voucherStatus] = await pool.execute(
      "SELECT status_id FROM voucher_statuses WHERE status_name = 'ACTIVE'"
    );
    await pool.execute(
      `INSERT INTO vouchers
        (code, discount_value, min_order_value, usage_limit, used_count,
         status_id, start_date, end_date)
       VALUES (?, 1, 0, 5, 0, ?, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY),
         DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 YEAR))`,
      [oneTimeCode, voucherStatus[0].status_id]
    );
    await api('DELETE', '/api/carts', { token: customer });
    assert.equal(
      (await api('POST', '/api/cart_items', {
        token: customer,
        body: { food_id: 1, quantity: 2 },
      })).status,
      200
    );
    const unusedVoucher = await api('GET', '/api/vouchers/available', { token: customer });
    const voucherBeforeUse = unusedVoucher.body.data.find((item) => item.code === oneTimeCode);
    assert.equal(Number(voucherBeforeUse.used_count), 0);
    assert.equal(Number(voucherBeforeUse.usage_limit), 5);
    assert.equal(Number(voucherBeforeUse.used_by_customer), 0);
    const firstVoucherOrder = await api('POST', '/api/orders/checkout', {
      token: customer,
      body: { address_id: 1, voucher_code: oneTimeCode },
    });
    assert.equal(firstVoucherOrder.status, 201);
    const usedVouchers = await api('GET', '/api/vouchers/available', { token: customer });
    const voucherAfterUse = usedVouchers.body.data.find((item) => item.code === oneTimeCode);
    assert.equal(Number(voucherAfterUse.used_count), 1);
    assert.equal(Number(voucherAfterUse.used_by_customer), 1);
    assert.equal(Number(voucherAfterUse.unique_customer_count), 1);
    assert.equal(
      (await api('POST', '/api/cart_items', {
        token: customer,
        body: { food_id: 1, quantity: 2 },
      })).status,
      200
    );
    const duplicateUse = await api('POST', '/api/orders/checkout', {
      token: customer,
      body: { address_id: 1, voucher_code: oneTimeCode },
    });
    assert.equal(duplicateUse.status, 409);
    assert.match(duplicateUse.body.message, /only once/i);
    assert.equal(
      (await api('POST', `/api/orders/${firstVoucherOrder.body.data.orderId}/cancel`, {
        token: customer,
        body: {},
      })).status,
      200
    );
    const restoredVouchers = await api('GET', '/api/vouchers/available', { token: customer });
    const voucherAfterCancel = restoredVouchers.body.data.find((item) => item.code === oneTimeCode);
    assert.equal(Number(voucherAfterCancel.used_count), 0);
    assert.equal(Number(voucherAfterCancel.used_by_customer), 0);
    assert.equal(Number(voucherAfterCancel.unique_customer_count), 0);
    await api('DELETE', '/api/carts', { token: customer });
    assert.equal(
      (await api('POST', '/api/cart_items', {
        token: customer,
        body: { food_id: 1, quantity: 2 },
      })).status,
      200
    );
    assert.equal(
      (await api('POST', '/api/orders/checkout', {
        token: customer,
        body: { address_id: 1, voucher_code: oneTimeCode },
      })).status,
      201
    );
    await api('DELETE', '/api/carts', { token: customerB });
    assert.equal(
      (await api('POST', '/api/cart_items', {
        token: customerB,
        body: { food_id: 4, quantity: 1 },
      })).status,
      200
    );
    assert.equal(
      (await api('POST', '/api/orders/checkout', {
        token: customerB,
        body: { address_id: 3, voucher_code: oneTimeCode },
      })).status,
      201
    );

    assert.equal((await api('GET', '/api/vouchers', { token: admin })).status, 200);
    assert.equal((await api('GET', '/api/reports/admin/summary', { token: admin })).status, 200);
    assert.equal((await api('GET', '/api/reports/admin/revenue?groupBy=day', { token: admin })).status, 200);
    assert.equal(
      (await api('GET', '/api/reports/admin/revenue?from=2026-09-01&to=2026-09-30&groupBy=month', {
        token: admin,
      })).status,
      200
    );
    assert.equal(
      (await api('GET', '/api/reports/admin/revenue?from=2026-09-30&to=2026-09-01', {
        token: admin,
      })).status,
      400
    );
    assert.equal((await api('GET', '/api/reports/restaurant/revenue', { token: restaurant })).status, 200);
    assert.equal((await api('GET', '/api/reports/admin/summary', { token: customer })).status, 403);
  });

  await t.test('account status changes are enforced without revoking JWT records', async () => {
    assert.equal(
      (await api('PATCH', '/api/admin/customers/2/status', {
        token: admin,
        body: { status: 'LOCKED' },
      })).status,
      200
    );
    assert.equal((await api('GET', '/api/auth/me', { token: customerB })).status, 403);
    assert.equal(
      (await api('PATCH', '/api/admin/customers/2/status', {
        token: admin,
        body: { status: 'ACTIVE' },
      })).status,
      200
    );
    assert.equal((await api('GET', '/api/auth/me', { token: customerB })).status, 200);

    assert.equal(
      (await api('PATCH', '/api/admin/restaurants/1/status', {
        token: admin,
        body: { status: 'SUSPENDED' },
      })).status,
      200
    );
    assert.equal((await api('GET', '/api/auth/me', { token: restaurant })).status, 403);
    assert.equal(
      (await api('PATCH', '/api/admin/restaurants/1/status', {
        token: admin,
        body: { status: 'ACTIVE' },
      })).status,
      200
    );
    assert.equal((await api('GET', '/api/auth/me', { token: restaurant })).status, 200);
  });
});

function storedImagePath(imagePath) {
  return path.resolve(
    require('../src/config/uploads').uploadsRoot,
    imagePath.slice('/uploads/'.length)
  );
}
