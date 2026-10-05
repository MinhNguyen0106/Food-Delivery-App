const db = require('../common/db').promise();

module.exports = {
  pool: db,

  async getShipper(connection, shipperId, lock = false) {
    const [rows] = await connection.execute(
      `SELECT shipper.shipper_id, shipper.user_id, shipper.status_id,
        status.status_name AS status
       FROM shippers shipper
       JOIN shipper_statuses status ON status.status_id = shipper.status_id
       WHERE shipper.shipper_id = ?
       LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
      [shipperId]
    );
    return rows[0] || null;
  },

  async getLookupId(connection, table, column, value) {
    const allowed = {
      shipper_statuses: { key: 'status_id', name: 'status_name' },
      order_statuses: { key: 'status_id', name: 'status_name' },
      payment_statuses: { key: 'status_id', name: 'status_name' },
    };
    if (!allowed[table] || allowed[table].name !== column) {
      throw new Error('Unsupported lookup table');
    }
    const [rows] = await connection.execute(
      `SELECT ${allowed[table].key} AS lookup_id FROM ${table} WHERE ${column} = ? LIMIT 1`,
      [value]
    );
    return rows[0]?.lookup_id ?? null;
  },

  async updateShipperStatus(connection, shipperId, statusId) {
    const [result] = await connection.execute(
      'UPDATE shippers SET status_id = ? WHERE shipper_id = ?',
      [statusId, shipperId]
    );
    return result.affectedRows;
  },

  async hasActiveDelivery(connection, shipperId) {
    const [rows] = await connection.execute(
      `SELECT delivery_id
       FROM deliveries
       WHERE shipper_id = ? AND status IN ('ACCEPTED', 'PICKED_UP', 'DELIVERING')
       LIMIT 1
       FOR UPDATE`,
      [shipperId]
    );
    return Boolean(rows[0]);
  },

  async listAvailableDeliveries(connection) {
    const [rows] = await connection.execute(
      `SELECT delivery.delivery_id, order_record.order_id, order_record.order_code,
        order_record.subtotal, order_record.delivery_fee, order_record.discount,
        order_record.total_amount, order_record.note, order_record.created_at,
        order_status.status_id AS status_id,
        delivery.status AS delivery_status,
        restaurant.name AS restaurant_name, restaurant.address AS restaurant_address,
        restaurant.phone AS restaurant_phone,
        address.receiver_name, address.receiver_phone,
        address.full_address AS delivery_address
       FROM deliveries delivery
       JOIN orders order_record ON order_record.order_id = delivery.order_id
       JOIN order_statuses order_status ON order_status.status_id = order_record.status_id
       JOIN restaurants restaurant ON restaurant.restaurant_id = order_record.restaurant_id
       JOIN addresses address ON address.address_id = order_record.address_id
       WHERE delivery.status = 'REQUESTED'
         AND delivery.shipper_id IS NULL
         AND order_status.status_name = 'READY_FOR_PICKUP'
       ORDER BY order_record.created_at, order_record.order_id`
    );
    return rows;
  },

  async listShipperDeliveries(connection, shipperId) {
    const [rows] = await connection.execute(
      `SELECT delivery.delivery_id, delivery.order_id, delivery.status AS delivery_status,
        delivery.pickup_time, delivery.delivery_time, delivery.note,
        order_record.order_code, order_record.total_amount,
        order_status.status_name AS order_status,
        restaurant.name AS restaurant_name, restaurant.address AS restaurant_address,
        restaurant.phone AS restaurant_phone,
        address.receiver_name, address.receiver_phone, address.full_address,
        address.latitude, address.longitude
       FROM deliveries delivery
       JOIN orders order_record ON order_record.order_id = delivery.order_id
       JOIN order_statuses order_status ON order_status.status_id = order_record.status_id
       JOIN restaurants restaurant ON restaurant.restaurant_id = order_record.restaurant_id
       JOIN addresses address ON address.address_id = order_record.address_id
       WHERE delivery.shipper_id = ?
         AND delivery.status IN ('ACCEPTED', 'PICKED_UP', 'DELIVERING')
       ORDER BY delivery.delivery_id`,
      [shipperId]
    );
    return rows;
  },

  async listShipperDeliveryHistory(connection, shipperId) {
    const [rows] = await connection.execute(
      `SELECT delivery.delivery_id, delivery.order_id,
        delivery.status AS delivery_status,
        delivery.pickup_time, delivery.delivery_time,
        COALESCE(delivery.note, order_record.note) AS note,
        order_record.order_code, order_record.subtotal, order_record.delivery_fee,
        order_record.discount, order_record.total_amount,
        order_record.created_at, order_record.updated_at,
        order_status.status_name AS order_status,
        restaurant.name AS restaurant_name, restaurant.address AS restaurant_address,
        restaurant.phone AS restaurant_phone,
        address.receiver_name, address.receiver_phone, address.full_address,
        address.latitude, address.longitude
       FROM deliveries delivery
       JOIN orders order_record ON order_record.order_id = delivery.order_id
       JOIN order_statuses order_status ON order_status.status_id = order_record.status_id
       JOIN restaurants restaurant ON restaurant.restaurant_id = order_record.restaurant_id
       JOIN addresses address ON address.address_id = order_record.address_id
       WHERE delivery.shipper_id = ?
         AND delivery.status IN ('COMPLETED', 'CANCELLED')
       ORDER BY COALESCE(delivery.delivery_time, delivery.pickup_time,
         order_record.updated_at, order_record.created_at) DESC,
         delivery.delivery_id DESC`,
      [shipperId]
    );
    return rows;
  },

  async getShipperDelivery(connection, shipperId, deliveryId) {
    const [rows] = await connection.execute(
      `SELECT delivery.delivery_id, delivery.order_id, delivery.status AS delivery_status,
        delivery.pickup_time, delivery.delivery_time, delivery.note,
        order_record.order_code, order_record.total_amount,
        order_status.status_name AS order_status,
        restaurant.name AS restaurant_name, restaurant.address AS restaurant_address,
        restaurant.phone AS restaurant_phone,
        address.receiver_name, address.receiver_phone, address.full_address,
        address.latitude, address.longitude
       FROM deliveries delivery
       JOIN orders order_record ON order_record.order_id = delivery.order_id
       JOIN order_statuses order_status ON order_status.status_id = order_record.status_id
       JOIN restaurants restaurant ON restaurant.restaurant_id = order_record.restaurant_id
       JOIN addresses address ON address.address_id = order_record.address_id
       WHERE delivery.shipper_id = ? AND delivery.delivery_id = ?
       LIMIT 1`,
      [shipperId, deliveryId]
    );
    return rows[0] || null;
  },

  async lockDelivery(connection, deliveryId) {
    const [rows] = await connection.execute(
      `SELECT delivery.delivery_id, delivery.order_id, delivery.shipper_id, delivery.status
       FROM deliveries delivery
       WHERE delivery.delivery_id = ?
       LIMIT 1
       FOR UPDATE`,
      [deliveryId]
    );
    return rows[0] || null;
  },

  async lockOrder(connection, orderId) {
    const [rows] = await connection.execute(
      `SELECT order_record.order_id, order_record.customer_id,
        order_record.restaurant_id, order_record.total_amount,
        order_status.status_name AS status
       FROM orders order_record
       JOIN order_statuses order_status ON order_status.status_id = order_record.status_id
       WHERE order_record.order_id = ?
       LIMIT 1
       FOR UPDATE`,
      [orderId]
    );
    return rows[0] || null;
  },

  async lockCodPayment(connection, orderId) {
    const [rows] = await connection.execute(
      `SELECT payment.payment_id, payment.amount, payment_status.status_name AS status,
        payment_method.method_name AS method
       FROM payments payment
       JOIN payment_statuses payment_status ON payment_status.status_id = payment.status_id
       JOIN payment_methods payment_method ON payment_method.method_id = payment.method_id
       WHERE payment.order_id = ?
       LIMIT 1
       FOR UPDATE`,
      [orderId]
    );
    return rows[0] || null;
  },

  async updateDeliveryAssignment(connection, deliveryId, shipperId) {
    const [result] = await connection.execute(
      `UPDATE deliveries
       SET shipper_id = ?, status = 'ACCEPTED'
       WHERE delivery_id = ? AND shipper_id IS NULL AND status = 'REQUESTED'`,
      [shipperId, deliveryId]
    );
    return result.affectedRows;
  },

  async updateDeliveryStatus(connection, deliveryId, from, to, timestampColumn) {
    const allowedTimestampColumns = {
      pickup_time: 'pickup_time',
      delivery_time: 'delivery_time',
    };
    const timestampUpdate = allowedTimestampColumns[timestampColumn]
      ? `, ${allowedTimestampColumns[timestampColumn]} = CURRENT_TIMESTAMP`
      : '';
    const [result] = await connection.execute(
      `UPDATE deliveries SET status = ?${timestampUpdate}
       WHERE delivery_id = ? AND status = ?`,
      [to, deliveryId, from]
    );
    return result.affectedRows;
  },

  async updateOrderStatus(connection, orderId, from, to) {
    const [result] = await connection.execute(
      `UPDATE orders
       SET status_id = (
         SELECT status_id FROM order_statuses WHERE status_name = ? LIMIT 1
       )
       WHERE order_id = ?
         AND status_id = (
           SELECT status_id FROM order_statuses WHERE status_name = ? LIMIT 1
         )`,
      [to, orderId, from]
    );
    return result.affectedRows;
  },

  async addOrderHistory(connection, orderId, statusName, userId, note) {
    const [result] = await connection.execute(
      `INSERT INTO order_status_history (order_id, status_id, changed_by_user_id, note)
       SELECT ?, status_id, ?, ? FROM order_statuses WHERE status_name = ?`,
      [orderId, userId, note, statusName]
    );
    return result.affectedRows;
  },

  async markCodPaid(connection, orderId, amount) {
    const [result] = await connection.execute(
      `UPDATE payments
       SET amount = ?,
           status_id = (
             SELECT status_id FROM payment_statuses WHERE status_name = 'PAID' LIMIT 1
           ),
           paid_at = CURRENT_TIMESTAMP
       WHERE order_id = ?
         AND method_id = (
             SELECT method_id FROM payment_methods WHERE method_name = 'COD' LIMIT 1
           )
         AND status_id = (
             SELECT status_id FROM payment_statuses WHERE status_name = 'PENDING' LIMIT 1
           )`,
      [amount, orderId]
    );
    return result.affectedRows;
  },

  async createPaidCodPayment(connection, orderId, amount) {
    const [result] = await connection.execute(
      `INSERT INTO payments (order_id, method_id, status_id, amount, paid_at)
       SELECT ?, method.method_id, status.status_id, ?, CURRENT_TIMESTAMP
       FROM payment_methods method
       CROSS JOIN payment_statuses status
       WHERE method.method_name = 'COD'
         AND status.status_name = 'PAID'`,
      [orderId, amount]
    );
    return result.affectedRows;
  },

  async getOrderTracking(connection, orderId, actor) {
    const params = [orderId];
    let ownershipClause;
    if (actor.role === 'CUSTOMER') {
      ownershipClause = 'order_record.customer_id = ?';
      params.push(actor.customerId);
    } else if (actor.role === 'RESTAURANT') {
      ownershipClause = 'order_record.restaurant_id = ?';
      params.push(actor.restaurantId);
    } else if (actor.role === 'SHIPPER') {
      ownershipClause = 'delivery.shipper_id = ?';
      params.push(actor.shipperId);
    } else {
      return null;
    }
    const [rows] = await connection.execute(
      `SELECT order_record.order_id, order_record.order_code,
        order_status.status_name AS order_status,
        delivery.status AS delivery_status,
        delivery.pickup_time, delivery.delivery_time
       FROM orders order_record
       JOIN order_statuses order_status ON order_status.status_id = order_record.status_id
       JOIN deliveries delivery ON delivery.order_id = order_record.order_id
       WHERE order_record.order_id = ? AND ${ownershipClause}
       LIMIT 1`,
      params
    );
    return rows[0] || null;
  },
};
