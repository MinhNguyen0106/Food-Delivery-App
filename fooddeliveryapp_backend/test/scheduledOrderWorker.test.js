const test = require('node:test');
const assert = require('node:assert/strict');
const { processBatch } = require('../src/services/scheduledOrderWorker');

test('early-ready scheduled orders wait for dispatch time and then create delivery requests', async () => {
  const statements = [];
  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async execute(sql) {
      statements.push(sql);
      if (sql.includes('SELECT order_record.order_id')) {
        assert.match(sql, /status\.status_name IN \('PROCESSING', 'PREPARING', 'READY_FOR_PICKUP'\)/);
        return [[{
          order_id: 95,
          order_status: 'READY_FOR_PICKUP',
          dispatch_due: 1,
          delivery_id: null,
          delivery_status: null,
          shipper_id: null,
        }]];
      }
      if (sql.includes('SELECT status_name, status_id FROM order_statuses')) {
        return [[
          { status_name: 'SCHEDULED', status_id: 1 },
          { status_name: 'PROCESSING', status_id: 2 },
          { status_name: 'CANCELLED', status_id: 3 },
        ]];
      }
      if (sql.includes('SELECT status_name, status_id FROM shipper_statuses')) {
        return [[
          { status_name: 'ONLINE', status_id: 1 },
          { status_name: 'BUSY', status_id: 2 },
        ]];
      }
      if (sql.includes('INSERT INTO deliveries')) return [{ affectedRows: 1 }];
      if (sql.includes('SELECT shipper.shipper_id')) return [[]];
      throw new Error(`Unexpected worker query: ${sql}`);
    },
  };

  const result = await processBatch({ getConnection: async () => connection });
  assert.equal(result.dispatched, 1);
  assert.ok(statements.some((sql) => sql.includes('INSERT INTO deliveries')));
});
