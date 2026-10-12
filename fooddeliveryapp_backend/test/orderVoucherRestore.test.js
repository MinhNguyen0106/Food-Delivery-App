const test = require('node:test');
const assert = require('node:assert/strict');
const orderingModel = require('../src/models/orderingModel');
const voucherModel = require('../src/models/voucherModel');
const orderService = require('../src/services/orderService');

for (const [action, actor] of [
  ['cancel', { role: 'CUSTOMER', customerId: 7, userId: 17 }],
  ['reject', { role: 'RESTAURANT', restaurantId: 11, userId: 18 }],
]) {
  test(`${action} restores voucher usage in the order status transaction`, async () => {
    const originalPoolGetConnection = orderingModel.pool.getConnection;
    const originalLockOrder = orderingModel.lockOrderForTransition;
    const originalGetStatus = orderingModel.getOrderStatusId;
    const originalUpdateStatus = orderingModel.updateOrderStatus;
    const originalCancelDelivery = orderingModel.cancelPendingDelivery;
    const originalCreateHistory = orderingModel.createOrderHistory;
    const originalRestoreUsage = voucherModel.restoreUsage;
    const calls = [];

    orderingModel.pool.getConnection = async () => ({
      async beginTransaction() {},
      async commit() {},
      async rollback() {},
      release() {},
    });
    orderingModel.lockOrderForTransition = async (_connection, orderId) => ({
      order_id: orderId,
      customer_id: 7,
      restaurant_id: 11,
      voucher_id: 29,
      status: 'PENDING',
    });
    orderingModel.getOrderStatusId = async (_connection, status) => {
      assert.equal(status, action === 'cancel' ? 'CANCELLED' : 'REJECTED');
      return 4;
    };
    orderingModel.updateOrderStatus = async () => calls.push('update-status');
    orderingModel.cancelPendingDelivery = async () => calls.push('cancel-delivery');
    orderingModel.createOrderHistory = async () => calls.push('history');
    voucherModel.restoreUsage = async (_connection, voucherId) => {
      calls.push(['restore-voucher', voucherId]);
      return true;
    };

    try {
      const result = await orderService.transitionOrder(81, action, '', actor);
      assert.equal(result.status, action === 'cancel' ? 'CANCELLED' : 'REJECTED');
      assert.ok(calls.findIndex((call) => Array.isArray(call) && call[0] === 'restore-voucher') > -1);
      assert.ok(calls.includes('history'));
      assert.equal(calls.find((call) => Array.isArray(call))?.[1], 29);
    } finally {
      orderingModel.pool.getConnection = originalPoolGetConnection;
      orderingModel.lockOrderForTransition = originalLockOrder;
      orderingModel.getOrderStatusId = originalGetStatus;
      orderingModel.updateOrderStatus = originalUpdateStatus;
      orderingModel.cancelPendingDelivery = originalCancelDelivery;
      orderingModel.createOrderHistory = originalCreateHistory;
      voucherModel.restoreUsage = originalRestoreUsage;
    }
  });
}

test('a Customer can cancel a scheduled order before worker activation', async () => {
  const originalPoolGetConnection = orderingModel.pool.getConnection;
  const originalLockOrder = orderingModel.lockOrderForTransition;
  const originalGetStatus = orderingModel.getOrderStatusId;
  const originalUpdateStatus = orderingModel.updateOrderStatus;
  const originalCancelDelivery = orderingModel.cancelPendingDelivery;
  const originalCreateHistory = orderingModel.createOrderHistory;
  const originalRestoreUsage = voucherModel.restoreUsage;
  const calls = [];

  orderingModel.pool.getConnection = async () => ({
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
  });
  orderingModel.lockOrderForTransition = async () => ({
    order_id: 82,
    customer_id: 7,
    restaurant_id: 11,
    voucher_id: 29,
    status: 'SCHEDULED',
  });
  orderingModel.getOrderStatusId = async (_connection, status) => {
    assert.equal(status, 'CANCELLED');
    return 8;
  };
  orderingModel.updateOrderStatus = async () => calls.push('status');
  orderingModel.cancelPendingDelivery = async () => calls.push('delivery');
  orderingModel.createOrderHistory = async () => calls.push('history');
  voucherModel.restoreUsage = async (_connection, voucherId) => {
    calls.push(['voucher', voucherId]);
    return true;
  };

  try {
    const result = await orderService.transitionOrder(
      82,
      'cancel',
      '',
      { role: 'CUSTOMER', customerId: 7, userId: 17 }
    );
    assert.equal(result.previousStatus, 'SCHEDULED');
    assert.equal(result.status, 'CANCELLED');
    assert.ok(calls.includes('history'));
    assert.deepEqual(calls.find((call) => Array.isArray(call)), ['voucher', 29]);
  } finally {
    orderingModel.pool.getConnection = originalPoolGetConnection;
    orderingModel.lockOrderForTransition = originalLockOrder;
    orderingModel.getOrderStatusId = originalGetStatus;
    orderingModel.updateOrderStatus = originalUpdateStatus;
    orderingModel.cancelPendingDelivery = originalCancelDelivery;
    orderingModel.createOrderHistory = originalCreateHistory;
    voucherModel.restoreUsage = originalRestoreUsage;
  }
});

test('a Restaurant can reject a scheduled order with a reason before worker activation', async () => {
  const originalPoolGetConnection = orderingModel.pool.getConnection;
  const originalLockOrder = orderingModel.lockOrderForTransition;
  const originalGetStatus = orderingModel.getOrderStatusId;
  const originalUpdateStatus = orderingModel.updateOrderStatus;
  const originalCancelDelivery = orderingModel.cancelPendingDelivery;
  const originalCreateHistory = orderingModel.createOrderHistory;
  const calls = [];

  orderingModel.pool.getConnection = async () => ({
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
  });
  orderingModel.lockOrderForTransition = async () => ({
    order_id: 83,
    customer_id: 7,
    restaurant_id: 11,
    voucher_id: null,
    status: 'SCHEDULED',
  });
  orderingModel.getOrderStatusId = async (_connection, status) => {
    assert.equal(status, 'REJECTED');
    return 9;
  };
  orderingModel.updateOrderStatus = async () => calls.push('status');
  orderingModel.cancelPendingDelivery = async () => calls.push('delivery');
  orderingModel.createOrderHistory = async (_connection, _orderId, _statusId, _userId, note) => {
    calls.push(['history', note]);
  };

  try {
    const result = await orderService.transitionOrder(
      83,
      'reject',
      'Bếp đang gặp sự cố',
      { role: 'RESTAURANT', restaurantId: 11, userId: 18 }
    );
    assert.equal(result.previousStatus, 'SCHEDULED');
    assert.equal(result.status, 'REJECTED');
    assert.ok(calls.includes('status'));
    assert.ok(calls.includes('delivery'));
    assert.deepEqual(calls.find((call) => Array.isArray(call)), [
      'history',
      'Bếp đang gặp sự cố',
    ]);
  } finally {
    orderingModel.pool.getConnection = originalPoolGetConnection;
    orderingModel.lockOrderForTransition = originalLockOrder;
    orderingModel.getOrderStatusId = originalGetStatus;
    orderingModel.updateOrderStatus = originalUpdateStatus;
    orderingModel.cancelPendingDelivery = originalCancelDelivery;
    orderingModel.createOrderHistory = originalCreateHistory;
  }
});

test('a Restaurant must provide a reason to reject a scheduled order', async () => {
  const originalPoolGetConnection = orderingModel.pool.getConnection;
  const originalLockOrder = orderingModel.lockOrderForTransition;

  orderingModel.pool.getConnection = async () => ({
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
  });
  orderingModel.lockOrderForTransition = async () => ({
    order_id: 84,
    customer_id: 7,
    restaurant_id: 11,
    voucher_id: null,
    status: 'SCHEDULED',
  });

  try {
    await assert.rejects(
      orderService.transitionOrder(
        84,
        'reject',
        '  ',
        { role: 'RESTAURANT', restaurantId: 11, userId: 18 }
      ),
      { code: 'REJECTION_REASON_REQUIRED' }
    );
  } finally {
    orderingModel.pool.getConnection = originalPoolGetConnection;
    orderingModel.lockOrderForTransition = originalLockOrder;
  }
});

test('a Restaurant can start preparing a scheduled order early', async () => {
  const originalPoolGetConnection = orderingModel.pool.getConnection;
  const originalLockOrder = orderingModel.lockOrderForTransition;
  const originalGetStatus = orderingModel.getOrderStatusId;
  const originalUpdateStatus = orderingModel.updateOrderStatus;
  const originalCreateHistory = orderingModel.createOrderHistory;
  const calls = [];

  orderingModel.pool.getConnection = async () => ({
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
  });
  orderingModel.lockOrderForTransition = async () => ({
    order_id: 85,
    customer_id: 7,
    restaurant_id: 11,
    voucher_id: null,
    status: 'SCHEDULED',
  });
  orderingModel.getOrderStatusId = async (_connection, status) => {
    assert.equal(status, 'PREPARING');
    return 10;
  };
  orderingModel.updateOrderStatus = async (_connection, orderId, statusId) => {
    calls.push(['status', orderId, statusId]);
  };
  orderingModel.createOrderHistory = async (_connection, orderId, statusId, userId, note) => {
    calls.push(['history', orderId, statusId, userId, note]);
  };

  try {
    const result = await orderService.transitionOrder(
      85,
      'prepare',
      undefined,
      { role: 'RESTAURANT', restaurantId: 11, userId: 18 }
    );
    assert.equal(result.previousStatus, 'SCHEDULED');
    assert.equal(result.status, 'PREPARING');
    assert.ok(calls.some(([name]) => name === 'status'));
    assert.ok(calls.some(([name]) => name === 'history'));
  } finally {
    orderingModel.pool.getConnection = originalPoolGetConnection;
    orderingModel.lockOrderForTransition = originalLockOrder;
    orderingModel.getOrderStatusId = originalGetStatus;
    orderingModel.updateOrderStatus = originalUpdateStatus;
    orderingModel.createOrderHistory = originalCreateHistory;
  }
});
