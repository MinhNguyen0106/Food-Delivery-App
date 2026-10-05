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
