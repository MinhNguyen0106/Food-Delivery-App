const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../src/models/voucherModel');
const voucherService = require('../src/services/voucherService');

const validVoucher = {
  voucher_id: 19,
  code: 'ONETIME',
  discount_value: '10.00',
  min_order_value: '0.00',
  usage_limit: 5,
  used_count: 1,
  status: 'ACTIVE',
  is_in_period: 1,
};

test('checkout rejects a voucher already redeemed by the customer before incrementing usage', async () => {
  const originals = {
    lockByCode: model.lockByCode,
    hasCustomerUsedVoucher: model.hasCustomerUsedVoucher,
    incrementUsage: model.incrementUsage,
  };
  let lookup;
  let incremented = false;
  model.lockByCode = async (_connection, code) => {
    assert.equal(code, 'ONETIME');
    return validVoucher;
  };
  model.hasCustomerUsedVoucher = async (...args) => {
    lookup = args;
    return true;
  };
  model.incrementUsage = async () => {
    incremented = true;
    return true;
  };

  try {
    await assert.rejects(
      voucherService.applyForCheckout({}, 'ONETIME', 1000, 1500, 42),
      (error) => error.code === 'VOUCHER_ALREADY_USED' && error.statusCode === 409
    );
    assert.equal(lookup[1], 42);
    assert.equal(lookup[2], validVoucher.voucher_id);
    assert.equal(lookup.length, 3);
    assert.equal(incremented, false);
  } finally {
    model.lockByCode = originals.lockByCode;
    model.hasCustomerUsedVoucher = originals.hasCustomerUsedVoucher;
    model.incrementUsage = originals.incrementUsage;
  }
});

test('available voucher query includes usage totals and per-customer redemption state', async () => {
  const calls = [];
  const connection = {
    async execute(query, parameters) {
      calls.push({ query, parameters });
      return [[{
        code: 'ONETIME',
        used_count: 2,
        usage_limit: 5,
        used_by_customer: 1,
        unique_customer_count: 2,
      }]];
    },
  };

  const rows = await model.listAvailable(42, connection);
  assert.equal(rows[0].used_count, 2);
  assert.equal(rows[0].usage_limit, 5);
  assert.equal(rows[0].used_by_customer, 1);
  assert.equal(rows[0].unique_customer_count, 2);
  assert.deepEqual(calls[0].parameters, [42]);
  assert.match(calls[0].query, /used_by_customer/);
  assert.match(calls[0].query, /COUNT\(DISTINCT redeemed_customer\.customer_id\)/);
  assert.match(calls[0].query, /redeemed_customer_status\.status_name NOT IN \('CANCELLED', 'REJECTED'\)/);
  assert.match(calls[0].query, /redeemed_status\.status_name NOT IN \('CANCELLED', 'REJECTED'\)/);
  assert.match(calls[0].query, /used_count/);
  assert.match(calls[0].query, /usage_limit/);
});

test('cancelled and rejected orders do not block voucher reuse by the same customer', async () => {
  let query;
  const connection = {
    async execute(sql, parameters) {
      query = { sql, parameters };
      return [[], []];
    },
  };

  assert.equal(await model.hasCustomerUsedVoucher(connection, 42, 19), false);
  assert.deepEqual(query.parameters, [42, 19]);
  assert.match(query.sql, /status_name NOT IN \('CANCELLED', 'REJECTED'\)/);
  assert.doesNotMatch(query.sql, /FOR UPDATE/);
});

test('restoring a redeemed voucher decrements usage without going below zero', async () => {
  let query;
  const connection = {
    async execute(sql, parameters) {
      query = { sql, parameters };
      return [{ affectedRows: 1 }, []];
    },
  };

  assert.equal(await model.restoreUsage(connection, 19), true);
  assert.deepEqual(query.parameters, [19]);
  assert.match(query.sql, /used_count = used_count - 1/);
  assert.match(query.sql, /used_count > 0/);
});
