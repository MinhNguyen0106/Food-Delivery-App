const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../src/models/deliveryModel');
const deliveryService = require('../src/services/deliveryService');

test('completing COD delivery reconciles a stale payment amount to the order total', async (t) => {
  const originals = new Map();
  const replace = (name, value) => {
    originals.set(name, model[name]);
    model[name] = value;
  };
  const connection = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
  };
  const warnings = [];
  const originalWarn = console.warn;
  t.after(() => {
    for (const [name, value] of originals) model[name] = value;
    console.warn = originalWarn;
  });

  replace('pool', { getConnection: async () => connection });
  replace('getShipper', async () => ({ user_id: 7, status: 'BUSY' }));
  replace('lockDelivery', async () => ({
    delivery_id: 10,
    order_id: 20,
    shipper_id: 3,
    status: 'DELIVERING',
  }));
  replace('lockOrder', async () => ({
    order_id: 20,
    total_amount: '132000.00',
    status: 'DELIVERING',
  }));
  replace('updateDeliveryStatus', async () => 1);
  replace('updateOrderStatus', async () => 1);
  replace('addOrderHistory', async () => 1);
  replace('lockCodPayment', async () => ({
    amount: '142000.00',
    method: 'COD',
    status: 'PENDING',
  }));
  let paidAmount;
  replace('markCodPaid', async (_connection, _orderId, amount) => {
    paidAmount = amount;
    return 1;
  });
  replace('getLookupId', async () => 2);
  replace('updateShipperStatus', async () => 1);
  console.warn = (message) => warnings.push(message);

  const result = await deliveryService.advance(
    10,
    'complete',
    { role: 'SHIPPER', shipperId: 3 }
  );

  assert.equal(paidAmount, '132000.00');
  assert.deepEqual(result.payment, {
    method: 'COD',
    status: 'PAID',
    amount: '132000.00',
  });
  assert.equal(
    warnings.some((message) => message.includes('order 20')),
    true
  );

  replace('lockCodPayment', async () => null);
  let createdPayment;
  replace('createPaidCodPayment', async (_connection, orderId, amount) => {
    createdPayment = { orderId, amount };
    return 1;
  });
  const recoveredResult = await deliveryService.advance(
    10,
    'complete',
    { role: 'SHIPPER', shipperId: 3 }
  );
  assert.deepEqual(createdPayment, { orderId: 20, amount: '132000.00' });
  assert.deepEqual(recoveredResult.payment, {
    method: 'COD',
    status: 'PAID',
    amount: '132000.00',
  });
  assert.equal(
    warnings.some((message) => message.includes('Creating missing COD payment')),
    true
  );

  replace('lockCodPayment', async () => ({
    amount: '132000.00',
    method: 'COD',
    status: 'PAID',
  }));
  await assert.rejects(
    deliveryService.advance(10, 'complete', { role: 'SHIPPER', shipperId: 3 }),
    { message: 'COD payment status is PAID, not PENDING', code: 'COD_PAYMENT_INVALID' }
  );
});
