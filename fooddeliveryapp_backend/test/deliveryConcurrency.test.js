const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../src/models/deliveryModel');
const deliveryService = require('../src/services/deliveryService');

function replaceModel(t, replacements) {
  const originals = new Map();
  for (const [name, value] of Object.entries(replacements)) {
    originals.set(name, model[name]);
    model[name] = value;
  }
  t.after(() => {
    for (const [name, value] of originals) model[name] = value;
  });
}

function transactionConnection() {
  return {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
  };
}

test('a BUSY shipper can list and accept another ready delivery', async (t) => {
  const connection = transactionConnection();
  let assignedDeliveryId;
  replaceModel(t, {
    pool: { getConnection: async () => connection },
    getShipper: async () => ({ user_id: 7, status: 'BUSY' }),
    listAvailableDeliveries: async () => [{ delivery_id: 21 }],
    lockDelivery: async () => ({
      delivery_id: 21,
      order_id: 31,
      shipper_id: null,
      status: 'REQUESTED',
    }),
    lockOrder: async () => ({ order_id: 31, status: 'READY_FOR_PICKUP' }),
    updateDeliveryAssignment: async (_connection, deliveryId) => {
      assignedDeliveryId = deliveryId;
      return 1;
    },
    getLookupId: async () => 3,
    updateShipperStatus: async () => 1,
  });

  const actor = { role: 'SHIPPER', shipperId: 3 };
  assert.deepEqual(await deliveryService.listAvailable(actor), [{ delivery_id: 21 }]);
  assert.deepEqual(await deliveryService.accept(21, actor), {
    deliveryId: 21,
    orderId: 31,
    deliveryStatus: 'ACCEPTED',
    shipperStatus: 'BUSY',
  });
  assert.equal(assignedDeliveryId, 21);
});

test('completing one delivery keeps a shipper BUSY while another remains active', async (t) => {
  const connection = transactionConnection();
  let availabilityChanged = false;
  replaceModel(t, {
    pool: { getConnection: async () => connection },
    getShipper: async () => ({ user_id: 7, status: 'BUSY' }),
    lockDelivery: async () => ({
      delivery_id: 21,
      order_id: 31,
      shipper_id: 3,
      status: 'DELIVERING',
    }),
    lockOrder: async () => ({
      order_id: 31,
      total_amount: '1000.00',
      status: 'DELIVERING',
    }),
    updateDeliveryStatus: async () => 1,
    updateOrderStatus: async () => 1,
    addOrderHistory: async () => 1,
    lockCodPayment: async () => ({
      amount: '1000.00',
      method: 'COD',
      status: 'PENDING',
    }),
    markCodPaid: async () => 1,
    hasActiveDelivery: async () => true,
    getLookupId: async () => {
      availabilityChanged = true;
      return 2;
    },
    updateShipperStatus: async () => {
      availabilityChanged = true;
      return 1;
    },
  });

  const result = await deliveryService.advance(
    21,
    'complete',
    { role: 'SHIPPER', shipperId: 3 },
  );

  assert.equal(result.shipperStatus, 'BUSY');
  assert.equal(availabilityChanged, false);
});

test('completing the final active delivery returns the shipper to ONLINE', async (t) => {
  const connection = transactionConnection();
  let updatedStatusId;
  replaceModel(t, {
    pool: { getConnection: async () => connection },
    getShipper: async () => ({ user_id: 7, status: 'BUSY' }),
    lockDelivery: async () => ({
      delivery_id: 21,
      order_id: 31,
      shipper_id: 3,
      status: 'DELIVERING',
    }),
    lockOrder: async () => ({
      order_id: 31,
      total_amount: '1000.00',
      status: 'DELIVERING',
    }),
    updateDeliveryStatus: async () => 1,
    updateOrderStatus: async () => 1,
    addOrderHistory: async () => 1,
    lockCodPayment: async () => ({
      amount: '1000.00',
      method: 'COD',
      status: 'PENDING',
    }),
    markCodPaid: async () => 1,
    hasActiveDelivery: async () => false,
    getLookupId: async () => 2,
    updateShipperStatus: async (_connection, _shipperId, statusId) => {
      updatedStatusId = statusId;
      return 1;
    },
  });

  const result = await deliveryService.advance(
    21,
    'complete',
    { role: 'SHIPPER', shipperId: 3 },
  );

  assert.equal(result.shipperStatus, 'ONLINE');
  assert.equal(updatedStatusId, 2);
});
