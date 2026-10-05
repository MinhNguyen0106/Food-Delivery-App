const test = require('node:test');
const assert = require('node:assert/strict');
const validateAddress = require('../src/validators/addressValidator');

function validate(body, method = 'POST') {
  let error;
  validateAddress({ body, method, params: {} }, {}, (nextError) => {
    error = nextError;
  });
  return error;
}

const validAddress = {
  address_name: 'Home',
  receiver_name: 'Test Customer',
  receiver_phone: '090 123 4567',
  full_address: 'Test address',
  latitude: 21,
  longitude: 105,
};

test('address validation accepts an omitted or blank optional note and formatted phone', () => {
  assert.equal(validate(validAddress), undefined);
  assert.equal(validate({ ...validAddress, note: '' }), undefined);
  assert.equal(validate({ ...validAddress, note: '   ' }), undefined);
});

test('address validation still rejects malformed phone numbers and oversized notes', () => {
  assert.equal(
    validate({ ...validAddress, receiver_phone: '123-abc' }).code,
    'VALIDATION_ERROR'
  );
  assert.equal(
    validate({ ...validAddress, note: 'x'.repeat(256) }).code,
    'VALIDATION_ERROR'
  );
});
