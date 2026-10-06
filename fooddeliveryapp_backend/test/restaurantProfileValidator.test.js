const test = require('node:test');
const assert = require('node:assert/strict');
const validation = require('../src/validators/catalogValidator');

function validate(body) {
  let error;
  let called = false;
  validation.validateMyRestaurantProfile({ body }, {}, (nextError) => {
    called = true;
    error = nextError;
  });
  return { called, error, body };
}

test('restaurant profile validation accepts valid editable profile fields', () => {
  const result = validate({
    name: '  Sample Restaurant ',
    address: '  10 Main Street ',
    phone: '+84901234567',
    description: ' Local food ',
    latitude: '21.028511',
    longitude: '105.804817',
    opening_time: '08:30',
    closing_time: '22:00:00',
  });

  assert.equal(result.called, true);
  assert.equal(result.error, undefined);
  assert.equal(result.body.latitude, 21.028511);
  assert.equal(result.body.longitude, 105.804817);
  assert.equal(result.body.opening_time, '08:30:00');
  assert.equal(result.body.name, '  Sample Restaurant ');
});

test('restaurant profile validation rejects empty, unsupported, or malformed fields', () => {
  assert.equal(validate({}).error.code, 'VALIDATION_ERROR');
  assert.equal(validate({ status_id: 1 }).error.code, 'VALIDATION_ERROR');
  assert.equal(validate({ phone: 'not-a-phone' }).error.code, 'VALIDATION_ERROR');
  assert.equal(validate({ latitude: 21 }).error.code, 'VALIDATION_ERROR');
  assert.equal(validate({ opening_time: '08:00' }).error.code, 'VALIDATION_ERROR');
  assert.equal(validate({ closing_time: '24:00', opening_time: '08:00' }).error.code, 'VALIDATION_ERROR');
});
