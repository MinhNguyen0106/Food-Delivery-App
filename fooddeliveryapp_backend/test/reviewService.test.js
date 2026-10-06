const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../src/models/reviewModel');
const reviewService = require('../src/services/reviewService');

test('new reviews are immediately visible and public review lists require customers', async (t) => {
  const createReviewModel = model.create;
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
  t.after(() => {
    for (const [name, value] of originals) model[name] = value;
  });

  replace('pool', { getConnection: async () => connection });
  replace('lockCustomerOrder', async () => ({ status: 'COMPLETED' }));
  replace('create', async () => 123);

  const customer = { role: 'CUSTOMER', customerId: 7 };
  assert.deepEqual(
    await reviewService.create({ order_id: 42, rating: 5 }, customer),
    { reviewId: 123, orderId: 42, status: 'VISIBLE' }
  );

  let insertSql = '';
  await createReviewModel(
    {
      execute: async (sql) => {
        insertSql = sql;
        return [{ insertId: 123 }];
      },
    },
    { customerId: 7, orderId: 42, rating: 5, comment: null }
  );
  assert.match(insertSql, /status_name = 'VISIBLE'/);

  let requestedRestaurantId;
  replace('listPublicRestaurant', async (restaurantId) => {
    requestedRestaurantId = restaurantId;
    return [];
  });
  assert.deepEqual(await reviewService.listPublicRestaurant('9', customer), []);
  assert.equal(requestedRestaurantId, 9);
  await assert.rejects(
    reviewService.listPublicRestaurant(9, { role: 'RESTAURANT', restaurantId: 9 }),
    (error) => error.statusCode === 403
  );
});
