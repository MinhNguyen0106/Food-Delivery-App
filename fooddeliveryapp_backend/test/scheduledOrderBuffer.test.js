const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../src/models/orderingModel');
const orderService = require('../src/services/orderService');
const routingService = require('../src/services/routingService');

test('scheduled orders persist the slot buffer returned by availability checks', async () => {
  const methodNames = [
    'lockCart',
    'getAddress',
    'getCheckoutItems',
    'getRestaurantForCheckout',
    'getLookupId',
    'createScheduledOrder',
    'createOrderDetail',
    'createPayment',
    'createOrderHistory',
    'clearCart',
  ];
  const originals = Object.fromEntries(methodNames.map((name) => [name, model[name]]));
  const originalGetConnection = model.pool.getConnection;
  const originalGetDrivingEstimate = routingService.getDrivingEstimate;
  let scheduledInput;
  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    async query() {},
    release() {},
    async execute(sql) {
      if (sql.includes('SELECT slot.slot_id')) {
        return [[{
          slot_id: 42,
          start_time: '12:00:00',
          end_time: '12:15:00',
          capacity: 4,
          prep_minutes: 20,
          buffer_minutes: 5,
          booked: 0,
          lead_seconds: 60000,
          trigger_after_open_seconds: 60000,
        }]];
      }
      return [[{
        lead_seconds: 60000,
        trigger_at: '2026-10-14 11:15:00',
        dispatch_at: '2026-10-14 11:50:00',
      }]];
    },
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
    quantity: 1,
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
  model.createScheduledOrder = async (_connection, input) => {
    scheduledInput = input;
    return 91;
  };
  model.createOrderDetail = async () => {};
  model.createPayment = async () => {};
  model.createOrderHistory = async () => {};
  model.clearCart = async () => {};
  routingService.getDrivingEstimate = async () => ({
    distanceMeters: 1000,
    travelSeconds: 180,
  });

  try {
    const result = await orderService.scheduleOrder(
      { address_id: 8, date: '2026-10-14', slot_id: 42 },
      { role: 'CUSTOMER', customerId: 4, userId: 14 }
    );
    assert.equal(result.status, 'SCHEDULED');
    assert.equal(scheduledInput.bufferMinutes, 5);
  } finally {
    model.pool.getConnection = originalGetConnection;
    routingService.getDrivingEstimate = originalGetDrivingEstimate;
    for (const name of methodNames) model[name] = originals[name];
  }
});
