const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const AppError = require('../src/services/AppError');
const adminValidation = require('../src/validators/adminValidator');
const authorizeRoles = require('../src/middleware/authorizeRoles');
const errorHandler = require('../src/middleware/errorHandler');
const swagger = require('../src/swagger');

function validate(middleware, { query = {}, params = {}, body = {} } = {}) {
  let called = false;
  let error;
  middleware({ query, params, body }, {}, (nextError) => {
    called = true;
    error = nextError;
  });
  return { called, error };
}

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('Admin query validators accept valid filters and reject malformed input', () => {
  assert.equal(
    validate(adminValidation.orderList, {
      query: { status: 'COMPLETED', from: '2024-02-29', to: '2024-03-01' },
    }).error,
    undefined
  );
  assert.equal(
    validate(adminValidation.orderList, {
      query: { status: 'UNKNOWN' },
    }).error.code,
    'VALIDATION_ERROR'
  );
  assert.match(
    validate(adminValidation.revenueQuery, {
      query: { from: '2025-02-30' },
    }).error.message,
    /valid calendar date/
  );
  assert.equal(
    validate(adminValidation.customerList, {
      query: { unexpected: '1' },
    }).error.code,
    'VALIDATION_ERROR'
  );
});

test('Admin status validation rejects client-controlled extra fields', () => {
  const valid = validate(adminValidation.restaurantStatus, {
    body: { status: 'ACTIVE' },
  });
  assert.equal(valid.error, undefined);
  assert.equal(
    validate(adminValidation.restaurantStatus, {
      body: { status: 'ACTIVE', user_id: 7 },
    }).error.code,
    'VALIDATION_ERROR'
  );
});

test('role middleware permits Admin and consistently forbids other roles', () => {
  const middleware = authorizeRoles('ADMIN');
  let allowed = false;
  middleware({ user: { role: 'ADMIN' } }, {}, (error) => {
    assert.equal(error, undefined);
    allowed = true;
  });
  assert.equal(allowed, true);

  let forbidden;
  middleware({ user: { role: 'CUSTOMER' } }, {}, (error) => {
    forbidden = error;
  });
  assert.equal(forbidden.statusCode, 403);
  assert.equal(forbidden.code, 'FORBIDDEN');
});

test('central error handler preserves validation messages without exposing SQL errors', () => {
  const validationResponse = responseRecorder();
  errorHandler(
    new AppError('status is invalid', 400, 'VALIDATION_ERROR'),
    { method: 'PATCH', path: '/api/admin/restaurants/1/status' },
    validationResponse,
    assert.fail
  );
  assert.equal(validationResponse.statusCode, 400);
  assert.equal(validationResponse.body.message, 'status is invalid');

  const conflictResponse = responseRecorder();
  errorHandler(
    Object.assign(new Error('Duplicate entry SECRET'), { code: 'ER_DUP_ENTRY' }),
    { method: 'POST', path: '/api/admin/customers' },
    conflictResponse,
    assert.fail
  );
  assert.equal(conflictResponse.statusCode, 409);
  assert.equal(conflictResponse.body.message, 'A record with the same unique value already exists');

  const internalResponse = responseRecorder();
  const originalError = console.error;
  console.error = () => {};
  try {
    errorHandler(
      Object.assign(new Error('SQL details SECRET'), { code: 'ER_PARSE_ERROR' }),
      { method: 'GET', path: '/api/admin/orders' },
      internalResponse,
      assert.fail
    );
  } finally {
    console.error = originalError;
  }
  assert.equal(internalResponse.statusCode, 500);
  assert.equal(internalResponse.body.message, 'Internal server error');
  assert.doesNotMatch(JSON.stringify(internalResponse.body), /SECRET|SQL/);
});

test('OpenAPI documents Phase 8 endpoints and has no fictitious Admin report routes', () => {
  for (const path of [
    '/api/admin/customers',
    '/api/admin/restaurants/{id}/status',
    '/api/admin/shippers/{id}/account-status',
    '/api/admin/orders/{id}',
    '/api/deliveries/history',
    '/api/reports/admin/summary',
    '/api/reports/admin/revenue',
    '/api/reports/restaurant/revenue',
  ]) {
    assert.ok(swagger.paths[path], `missing OpenAPI path ${path}`);
  }
  assert.equal(swagger.paths['/api/admin/summary'], undefined);
  assert.equal(swagger.paths['/api/carts/{id}'], undefined);
  assert.ok(swagger.paths['/api/carts'].get);
  assert.ok(swagger.paths['/api/carts'].delete);
  assert.deepEqual(swagger.paths['/api/auth/register'].post.security, []);
});

test('HTTP smoke: application starts, serves Swagger, and protects Admin routes', async (t) => {
  process.env.PORT ||= '3000';
  process.env.DB_HOST ||= '127.0.0.1';
  process.env.DB_PORT ||= '3306';
  process.env.DB_USER ||= 'phase8-test';
  process.env.DB_PASSWORD ||= 'phase8-test';
  process.env.DB_NAME ||= 'phase8_test';
  process.env.JWT_SECRET ||= 'phase8-test-secret-with-at-least-32-bytes';

  const authModel = require('../src/models/authModel');
  const originalGetAuthorizationIdentityById = authModel.getAuthorizationIdentityById;
  authModel.getAuthorizationIdentityById = async (userId) => Number(userId) === 12
    ? {
      user_id: 12,
      user_status: 'ACTIVE',
      role: 'RESTAURANT',
      restaurant_id: 12,
      restaurant_status: 'SUSPENDED',
    }
    : Number(userId) === 13
      ? {
        user_id: 13,
        user_status: 'ACTIVE',
        role: 'RESTAURANT',
        restaurant_id: 13,
        restaurant_status: 'PENDING',
      }
    : {
      user_id: 11,
      user_status: 'ACTIVE',
      role: 'CUSTOMER',
      customer_id: 11,
    };
  t.after(() => {
    authModel.getAuthorizationIdentityById = originalGetAuthorizationIdentityById;
  });

  const app = require('../src/app');
  const jwt = require('jsonwebtoken');
  const server = app.listen(0);
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address();
  const fetch = (path, token) => new Promise((resolve, reject) => {
    http.get({
      host: '127.0.0.1',
      port: address.port,
      path,
      headers: token ? { authorization: `Bearer ${token}` } : {},
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body }));
    }).on('error', reject);
  });

  const docs = await fetch('/api-docs/');
  assert.equal(docs.status, 200);
  assert.match(docs.body, /swagger/i);

  const adminApi = await fetch('/api/admin/customers');
  assert.equal(adminApi.status, 401);
  const unauthorized = JSON.parse(adminApi.body);
  assert.equal(unauthorized.success, false);
  assert.match(unauthorized.message, /required/i);
  assert.equal(unauthorized.error, 'UNAUTHENTICATED');

  const customerToken = jwt.sign(
    { role: 'CUSTOMER' },
    process.env.JWT_SECRET,
    {
      subject: '11',
      issuer: 'food-delivery-backend',
      audience: 'food-delivery-api',
      expiresIn: '1h',
    }
  );
  const forbiddenAdmin = await fetch('/api/admin/customers', customerToken);
  assert.equal(forbiddenAdmin.status, 403);
  assert.equal(JSON.parse(forbiddenAdmin.body).error, 'FORBIDDEN');

  const suspendedRestaurantToken = jwt.sign(
    { role: 'RESTAURANT' },
    process.env.JWT_SECRET,
    {
      subject: '12',
      issuer: 'food-delivery-backend',
      audience: 'food-delivery-api',
      expiresIn: '1h',
    }
  );
  const suspendedRestaurant = await fetch(
    '/api/reports/restaurant/revenue',
    suspendedRestaurantToken
  );
  assert.equal(suspendedRestaurant.status, 403);
  assert.equal(JSON.parse(suspendedRestaurant.body).error, 'ACCOUNT_SUSPENDED');

  const pendingRestaurantToken = jwt.sign(
    { role: 'RESTAURANT' },
    process.env.JWT_SECRET,
    {
      subject: '13',
      issuer: 'food-delivery-backend',
      audience: 'food-delivery-api',
      expiresIn: '1h',
    }
  );
  const pendingRestaurant = await fetch('/api/restaurants', pendingRestaurantToken);
  assert.equal(pendingRestaurant.status, 403);
  assert.equal(JSON.parse(pendingRestaurant.body).error, 'RESTAURANT_NOT_ACTIVE');
});
