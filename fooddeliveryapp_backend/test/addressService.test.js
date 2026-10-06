const test = require('node:test');
const assert = require('node:assert/strict');
const addressModel = require('../src/models/addressModel');
const pool = require('../src/common/db');
const db = pool.promise();
const originalPromise = pool.promise;
pool.promise = () => db;
const addressService = require('../src/services/addressService');
pool.promise = originalPromise;

test('address creation enforces the three-address limit inside the customer transaction', async (t) => {
  const originals = {
    getConnection: db.getConnection,
    countForCustomer: addressModel.countForCustomer,
    create: addressModel.create,
    getForCustomer: addressModel.getForCustomer,
  };
  t.after(() => {
    db.getConnection = originals.getConnection;
    addressModel.countForCustomer = originals.countForCustomer;
    addressModel.create = originals.create;
    addressModel.getForCustomer = originals.getForCustomer;
  });

  let transactionState = '';
  const connection = {
    beginTransaction: async () => { transactionState = 'started'; },
    execute: async () => [[{ customer_id: 7 }]],
    commit: async () => { transactionState = 'committed'; },
    rollback: async () => { transactionState = 'rolled back'; },
    release: () => {},
  };
  db.getConnection = async () => connection;

  const actor = { role: 'CUSTOMER', customerId: 7 };
  addressModel.countForCustomer = async () => 3;
  addressModel.create = async () => assert.fail('must not create a fourth address');
  await assert.rejects(
    addressService.create({}, actor),
    (error) => error.code === 'ADDRESS_LIMIT_REACHED' && error.statusCode === 409
  );
  assert.equal(transactionState, 'rolled back');

  addressModel.countForCustomer = async () => 2;
  addressModel.create = async () => 31;
  addressModel.getForCustomer = async (id) => ({ address_id: id });
  assert.deepEqual(await addressService.create({}, actor), { address_id: 31 });
  assert.equal(transactionState, 'committed');
});
