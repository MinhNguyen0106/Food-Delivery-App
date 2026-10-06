const test = require('node:test');
const assert = require('node:assert/strict');
const validation = require('../src/validators/adminValidator');

function validate(middleware, body) {
  let error;
  middleware({ body }, {}, (nextError) => {
    error = nextError;
  });
  return error;
}

const shipperInput = {
  email: 'shipper@example.com',
  password: 'secure-pass',
  fullName: 'Test Shipper',
  phone: '+84901234567',
};

const restaurantInput = {
  email: 'restaurant@example.com',
  password: 'secure-pass',
  name: 'Test Restaurant',
  address: '123 Main Street',
  phone: '+84901234567',
  latitude: 10.762622,
  longitude: 106.660172,
};

test('Admin create-account validators accept complete Shipper and Restaurant payloads', () => {
  assert.equal(validate(validation.createShipper, shipperInput), undefined);
  assert.equal(validate(validation.createRestaurant, restaurantInput), undefined);
});

test('Shipper account validation rejects invalid credentials and unsupported fields', () => {
  assert.equal(
    validate(validation.createShipper, { ...shipperInput, password: 'short' }).code,
    'VALIDATION_ERROR'
  );
  assert.equal(
    validate(validation.createShipper, { ...shipperInput, userId: 42 }).code,
    'VALIDATION_ERROR'
  );
});

test('Restaurant account validation rejects missing coordinates and out-of-range locations', () => {
  assert.equal(
    validate(validation.createRestaurant, { ...restaurantInput, latitude: undefined }).code,
    'VALIDATION_ERROR'
  );
  assert.equal(
    validate(validation.createRestaurant, { ...restaurantInput, longitude: 181 }).code,
    'VALIDATION_ERROR'
  );
});
