const db = require('../common/db').promise();

const POLL_INTERVAL_MS = 5000;
const BATCH_SIZE = 50;

async function processBatch(database = db) {
  const connection = await database.getConnection();
  try {
    await connection.beginTransaction();
    const [orders] = await connection.execute(
      `SELECT order_record.order_id, order_record.restaurant_id,
          order_record.voucher_id, status.status_name AS order_status,
          restaurant_status.status_name AS restaurant_status,
          restaurant.opening_time, restaurant.closing_time,
          order_record.scheduled_dispatch_at,
          (order_record.scheduled_dispatch_at <= CURRENT_TIMESTAMP) AS dispatch_due,
          delivery.delivery_id,
          delivery.status AS delivery_status,
          delivery.shipper_id,
          CASE
            WHEN restaurant.opening_time <= restaurant.closing_time
              THEN CURRENT_TIME BETWEEN restaurant.opening_time AND restaurant.closing_time
            ELSE CURRENT_TIME >= restaurant.opening_time
              OR CURRENT_TIME <= restaurant.closing_time
          END AS restaurant_is_open
       FROM orders order_record
       JOIN order_statuses status ON status.status_id = order_record.status_id
       JOIN restaurants restaurant ON restaurant.restaurant_id = order_record.restaurant_id
       JOIN restaurant_statuses restaurant_status
         ON restaurant_status.status_id = restaurant.status_id
       LEFT JOIN deliveries delivery ON delivery.order_id = order_record.order_id
       WHERE (
           status.status_name = 'SCHEDULED'
           AND (
             order_record.scheduled_trigger_at <= CURRENT_TIMESTAMP
             OR restaurant_status.status_name <> 'ACTIVE'
             OR (
               order_record.scheduled_trigger_at <= CURRENT_TIMESTAMP
               AND (
                 restaurant.opening_time IS NULL
                 OR restaurant.closing_time IS NULL
                 OR CASE
                   WHEN restaurant.opening_time <= restaurant.closing_time
                     THEN CURRENT_TIME NOT BETWEEN restaurant.opening_time AND restaurant.closing_time
                   ELSE CURRENT_TIME < restaurant.opening_time
                     AND CURRENT_TIME > restaurant.closing_time
                   END
               )
             )
           )
         )
         OR (
           status.status_name IN ('PROCESSING', 'PREPARING', 'READY_FOR_PICKUP')
           AND order_record.scheduled_dispatch_at <= CURRENT_TIMESTAMP
           AND (
             delivery.delivery_id IS NULL
             OR (delivery.status = 'REQUESTED' AND delivery.shipper_id IS NULL)
           )
         )
       ORDER BY COALESCE(order_record.scheduled_trigger_at, order_record.scheduled_dispatch_at),
         order_record.order_id
       LIMIT ?
       FOR UPDATE SKIP LOCKED`,
      [BATCH_SIZE]
    );
    if (orders.length === 0) {
      await connection.commit();
      return { activated: 0, cancelled: 0, dispatched: 0 };
    }

    const [statuses] = await connection.execute(
      `SELECT status_name, status_id FROM order_statuses
       WHERE status_name IN ('SCHEDULED', 'PROCESSING', 'CANCELLED')`
    );
    const [shipperStatuses] = await connection.execute(
      `SELECT status_name, status_id FROM shipper_statuses
       WHERE status_name IN ('ONLINE', 'BUSY')`
    );
    const statusIds = new Map(statuses.map((row) => [row.status_name, row.status_id]));
    const shipperStatusIds = new Map(shipperStatuses.map((row) => [row.status_name, row.status_id]));
    if (!statusIds.has('PROCESSING') || !statusIds.has('CANCELLED')) {
      throw new Error('Scheduled order status configuration is missing; apply migration 004');
    }

    const totals = { activated: 0, cancelled: 0, dispatched: 0, assigned: 0 };
    for (const order of orders) {
      let status = order.order_status;
      if (status === 'SCHEDULED') {
        const unavailable =
          order.restaurant_status !== 'ACTIVE' ||
          Number(order.restaurant_is_open) !== 1;
        if (unavailable) {
          await connection.execute(
            'UPDATE orders SET status_id = ? WHERE order_id = ? AND status_id = ?',
            [statusIds.get('CANCELLED'), order.order_id,
              statuses.find((item) => item.status_name === 'SCHEDULED')?.status_id]
          );
          await connection.execute(
            `INSERT INTO order_status_history
              (order_id, status_id, changed_by_user_id, note)
             VALUES (?, ?, NULL, ?)`,
            [order.order_id, statusIds.get('CANCELLED'),
              'Scheduled order cancelled because the restaurant is unavailable']
          );
          if (order.voucher_id !== null) {
            const [restored] = await connection.execute(
              'UPDATE vouchers SET used_count = used_count - 1 WHERE voucher_id = ? AND used_count > 0',
              [order.voucher_id]
            );
            if (restored.affectedRows !== 1) {
              throw new Error(`Could not restore voucher usage for order ${order.order_id}`);
            }
          }
          totals.cancelled += 1;
          continue;
        }

        await connection.execute(
          'UPDATE orders SET status_id = ? WHERE order_id = ?',
          [statusIds.get('PROCESSING'), order.order_id]
        );
        await connection.execute(
          `INSERT INTO order_status_history
            (order_id, status_id, changed_by_user_id, note)
           VALUES (?, ?, NULL, 'Scheduled order activated for restaurant preparation')`,
          [order.order_id, statusIds.get('PROCESSING')]
        );
        status = 'PROCESSING';
        totals.activated += 1;
      }

      if (
        ['PROCESSING', 'PREPARING', 'READY_FOR_PICKUP'].includes(status) &&
        Number(order.dispatch_due) === 1
      ) {
        if (!order.delivery_id) {
          await connection.execute(
            `INSERT INTO deliveries (order_id, status) VALUES (?, 'REQUESTED')`,
            [order.order_id]
          );
          totals.dispatched += 1;
        }
        if (
          order.delivery_status !== 'ACCEPTED' &&
          order.delivery_status !== 'PICKED_UP' &&
          order.delivery_status !== 'DELIVERING'
        ) {
          if (!shipperStatusIds.has('ONLINE') || !shipperStatusIds.has('BUSY')) {
            throw new Error('Required Shipper status configuration is missing');
          }
          const [availableShippers] = await connection.execute(
            `SELECT shipper.shipper_id
             FROM shippers shipper
             WHERE shipper.status_id = ?
             ORDER BY shipper.last_assigned_at IS NOT NULL,
               shipper.last_assigned_at, shipper.shipper_id
             LIMIT 1
             FOR UPDATE SKIP LOCKED`,
            [shipperStatusIds.get('ONLINE')]
          );
          if (availableShippers[0]) {
            const shipperId = availableShippers[0].shipper_id;
            const [assigned] = await connection.execute(
              `UPDATE deliveries
               SET shipper_id = ?, status = 'ACCEPTED'
               WHERE order_id = ? AND status = 'REQUESTED' AND shipper_id IS NULL`,
              [shipperId, order.order_id]
            );
            if (assigned.affectedRows === 1) {
              const [updatedShipper] = await connection.execute(
                `UPDATE shippers
                 SET status_id = ?, last_assigned_at = CURRENT_TIMESTAMP
                 WHERE shipper_id = ? AND status_id = ?`,
                [shipperStatusIds.get('BUSY'), shipperId, shipperStatusIds.get('ONLINE')]
              );
              if (updatedShipper.affectedRows !== 1) {
                throw new Error(`Could not reserve Shipper ${shipperId}`);
              }
              totals.assigned += 1;
            }
          }
        }
      }
    }

    await connection.commit();
    return totals;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Scheduled order worker rollback failed', rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function run() {
  console.log('Scheduled order worker started');
  for (;;) {
    try {
      const result = await processBatch();
      if (result.activated || result.cancelled || result.dispatched || result.assigned) {
        console.log('Scheduled order worker processed orders', result);
      }
    } catch (error) {
      console.error('Scheduled order worker batch failed', error);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error('Scheduled order worker stopped unexpectedly', error);
    process.exitCode = 1;
  });
}

module.exports = { processBatch };
