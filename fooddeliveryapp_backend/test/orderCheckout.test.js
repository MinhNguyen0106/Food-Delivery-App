const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../src/models/orderingModel');
const orderService = require('../src/services/orderService');

test('checkout clears the cart from the validated checkout context after creating the order', async () => {
  const methodNames = [
    'lockCart',
    'getAddress',
    'getCheckoutItems',
    'getRestaurantForCheckout',
    'getLookupId',
    'createOrder',
    'createOrderDetail',
    'createPayment',
    'createDelivery',
    'createOrderHistory',
    'clearCart',
  ];
  const originals = Object.fromEntries(methodNames.map((name) => [name, model[name]]));
  const originalGetConnection = model.pool.getConnection;
  const calls = [];
  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
  };
  model.pool.getConnection = async () => connection;
  model.lockCart = async () => ({ cart_id: 73, restaurant_id: 12 });
  model.getAddress = async () => ({
    address_id: 8,
    latitude: 21,
    longitude: 105,
    note: null,
  });
  model.getCheckoutItems = async () => [{
    food_id: 5,
    restaurant_id: 12,
    quantity: 2,
    price: '100.00',
    food_status: 'AVAILABLE',
    restaurant_status: 'ACTIVE',
    category_active: 1,
  }];
  model.getRestaurantForCheckout = async () => ({
    restaurant_id: 12,
    latitude: 21,
    longitude: 105,
    status: 'ACTIVE',
    is_open: 1,
  });
  model.getLookupId = async () => 1;
  model.createOrder = async (_connection, order) => {
    calls.push(['createOrder', order]);
    return 91;
  };
  model.createOrderDetail = async () => {};
  model.createPayment = async () => {};
  model.createDelivery = async () => {};
  model.createOrderHistory = async () => {};
  model.clearCart = async (_connection, cartId) => calls.push(['clearCart', cartId]);

  try {
    const result = await orderService.checkout(
      { address_id: 8 },
      { role: 'CUSTOMER', customerId: 4, userId: 14 }
    );
    assert.equal(result.orderId, 91);
    assert.deepEqual(calls.find(([name]) => name === 'clearCart'), ['clearCart', 73]);
  } finally {
    model.pool.getConnection = originalGetConnection;
    for (const name of methodNames) model[name] = originals[name];
  }
});
