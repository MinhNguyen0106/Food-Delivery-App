const test = require('node:test');
const assert = require('node:assert/strict');
const validation = require('../src/validators/scheduledDeliveryValidator');

function validate(middleware, { query = {}, body = {} } = {}) {
  let error;
  middleware({ query, body }, {}, (nextError) => {
    error = nextError;
  });
  return error;
}

test('available slot query accepts valid address and calendar date', () => {
  assert.equal(validate(validation.availableSlots, {
    query: { address_id: '12', date: '2026-10-12' },
  }), undefined);
});

test('available slot query rejects invalid dates and unsupported parameters', () => {
  assert.equal(validate(validation.availableSlots, {
    query: { address_id: '12', date: '2026-02-30' },
  }).code, 'VALIDATION_ERROR');
  assert.equal(validate(validation.availableSlots, {
    query: { address_id: '12', date: '2026-10-12', restaurant_id: '9' },
  }).code, 'VALIDATION_ERROR');
});

test('scheduled order body validates required fields and rejects unexpected input', () => {
  assert.equal(validate(validation.scheduleOrder, {
    body: { address_id: 12, date: '2026-10-12', slot_id: 42, note: 'Doorbell' },
  }), undefined);
  assert.equal(validate(validation.scheduleOrder, {
    body: { address_id: 12, date: '2026-02-30', slot_id: 42 },
  }).code, 'VALIDATION_ERROR');
  assert.equal(validate(validation.scheduleOrder, {
    body: { address_id: 12, date: '2026-10-12', slot_id: 42, status: 'PENDING' },
  }).code, 'VALIDATION_ERROR');
  assert.equal(validate(validation.scheduleOrder, {
    body: { address_id: 12, date: '2026-10-12' },
  }).code, 'VALIDATION_ERROR');
});
