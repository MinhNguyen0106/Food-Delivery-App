const db = require('../common/db').promise();

async function execute(connection, sql, params = []) {
  const [result] = await connection.execute(sql, params);
  return result;
}

module.exports = {
  pool: db,

  async getCart(customerId, connection = db, lock = false) {
    const suffix = lock ? ' FOR UPDATE' : '';
    const [rows] = await connection.execute(
      `SELECT cart_id, customer_id, restaurant_id
       FROM carts WHERE customer_id = ? LIMIT 1${suffix}`,
      [customerId]
    );
    if (!rows[0]) return null;
    const [items] = await connection.execute(
      `SELECT item.cart_item_id, item.food_id, food.name AS food_name,
        item.quantity, item.unit_price, item.subtotal, food.image,
        food_status.status_name AS food_status,
        food.restaurant_id AS food_restaurant_id
       FROM cart_items item
       JOIN foods food ON food.food_id = item.food_id
       JOIN food_statuses food_status ON food_status.status_id = food.status_id
       WHERE item.cart_id = ?
       ORDER BY item.cart_item_id`,
      [rows[0].cart_id]
    );
    const [totals] = await connection.execute(
      'SELECT COALESCE(SUM(subtotal), 0) AS subtotal FROM cart_items WHERE cart_id = ?',
      [rows[0].cart_id]
    );
    return { ...rows[0], items, subtotal: totals[0].subtotal };
  },

  async ensureCart(connection, customerId) {
    await connection.execute(
      `INSERT INTO carts (customer_id, restaurant_id) VALUES (?, NULL)
       ON DUPLICATE KEY UPDATE cart_id = LAST_INSERT_ID(cart_id)`,
      [customerId]
    );
    const [rows] = await connection.execute(
      'SELECT cart_id, customer_id, restaurant_id FROM carts WHERE customer_id = ? LIMIT 1 FOR UPDATE',
      [customerId]
    );
    return rows[0];
  },

  async lockCart(connection, customerId) {
    const [rows] = await connection.execute(
      'SELECT cart_id, customer_id, restaurant_id FROM carts WHERE customer_id = ? LIMIT 1 FOR UPDATE',
      [customerId]
    );
    return rows[0] || null;
  },

  async getFoodForCart(connection, foodId) {
    const [rows] = await connection.execute(
      `SELECT food.food_id, food.restaurant_id, food.price,
        food_status.status_name AS food_status,
        restaurant_status.status_name AS restaurant_status,
        category.is_active AS category_active
       FROM foods food
       JOIN food_statuses food_status ON food_status.status_id = food.status_id
       JOIN restaurants restaurant ON restaurant.restaurant_id = food.restaurant_id
       JOIN restaurant_statuses restaurant_status ON restaurant_status.status_id = restaurant.status_id
       JOIN categories category ON category.category_id = food.category_id
       WHERE food.food_id = ? FOR UPDATE`,
      [foodId]
    );
    return rows[0] || null;
  },

  async getCartItem(connection, cartId, foodId) {
    const [rows] = await connection.execute(
      'SELECT cart_item_id, quantity FROM cart_items WHERE cart_id = ? AND food_id = ? LIMIT 1 FOR UPDATE',
      [cartId, foodId]
    );
    return rows[0] || null;
  },

  async insertCartItem(connection, cartId, foodId, quantity, price, subtotal) {
    return execute(
      connection,
      `INSERT INTO cart_items (cart_id, food_id, quantity, unit_price, subtotal)
       VALUES (?, ?, ?, ?, ?)`,
      [cartId, foodId, quantity, price, subtotal]
    );
  },

  async updateCartItem(connection, itemId, cartId, quantity, price, subtotal) {
    return execute(
      connection,
      `UPDATE cart_items
       SET quantity = ?, unit_price = ?, subtotal = ?
       WHERE cart_item_id = ? AND cart_id = ?`,
      [quantity, price, subtotal, itemId, cartId]
    );
  },

  async deleteCartItem(connection, itemId, cartId) {
    return execute(
      connection,
      'DELETE FROM cart_items WHERE cart_item_id = ? AND cart_id = ?',
      [itemId, cartId]
    );
  },

  async clearCart(connection, cartId) {
    await connection.execute('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
    await connection.execute('UPDATE carts SET restaurant_id = NULL WHERE cart_id = ?', [cartId]);
  },

  async getAddress(connection, addressId, customerId) {
    const [rows] = await connection.execute(
      `SELECT address_id, customer_id, full_address, latitude, longitude, note
       FROM addresses
       WHERE address_id = ? AND customer_id = ?
       LIMIT 1 FOR UPDATE`,
      [addressId, customerId]
    );
    return rows[0] || null;
  },

  async getCheckoutItems(connection, cartId) {
    const [rows] = await connection.execute(
      `SELECT item.cart_item_id, item.food_id, item.quantity, food.price,
        food.name AS food_name, food.restaurant_id, food_status.status_name AS food_status,
        restaurant_status.status_name AS restaurant_status,
        category.is_active AS category_active
       FROM cart_items item
       JOIN foods food ON food.food_id = item.food_id
       JOIN food_statuses food_status ON food_status.status_id = food.status_id
       JOIN restaurants restaurant ON restaurant.restaurant_id = food.restaurant_id
       JOIN restaurant_statuses restaurant_status ON restaurant_status.status_id = restaurant.status_id
       JOIN categories category ON category.category_id = food.category_id
       WHERE item.cart_id = ?
       ORDER BY item.cart_item_id
       FOR UPDATE`,
      [cartId]
    );
    return rows;
  },

  async getRestaurantForCheckout(connection, restaurantId) {
    const [rows] = await connection.execute(
      `SELECT restaurant.restaurant_id, restaurant.latitude, restaurant.longitude,
        restaurant.opening_time, restaurant.closing_time,
        restaurant_status.status_name AS status,
        CASE
          WHEN restaurant.opening_time IS NULL OR restaurant.closing_time IS NULL THEN 0
          WHEN restaurant.opening_time <= restaurant.closing_time
            THEN CURRENT_TIME BETWEEN restaurant.opening_time AND restaurant.closing_time
          ELSE CURRENT_TIME >= restaurant.opening_time OR CURRENT_TIME <= restaurant.closing_time
        END AS is_open
       FROM restaurants restaurant
       JOIN restaurant_statuses restaurant_status
         ON restaurant_status.status_id = restaurant.status_id
       WHERE restaurant.restaurant_id = ?
       LIMIT 1
       FOR UPDATE`,
      [restaurantId]
    );
    return rows[0] || null;
  },

  async getLookupId(connection, table, column, value) {
    const allowed = {
      order_statuses: { key: 'status_id', name: 'status_name' },
      payment_methods: { key: 'method_id', name: 'method_name' },
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

  async createOrder(connection, order) {
    const [result] = await connection.execute(
      `INSERT INTO orders
        (order_code, customer_id, restaurant_id, address_id, voucher_id,
         subtotal, delivery_fee, discount, total_amount, status_id, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [order.orderCode, order.customerId, order.restaurantId, order.addressId,
        order.voucherId, order.subtotal, order.deliveryFee, order.discount,
        order.totalAmount, order.statusId, order.note]
    );
    return result.insertId;
  },

  async createOrderDetail(connection, orderId, item) {
    return execute(
      connection,
      `INSERT INTO order_details (order_id, food_id, quantity, unit_price, subtotal)
       VALUES (?, ?, ?, ?, ?)`,
      [orderId, item.foodId, item.quantity, item.unitPrice, item.subtotal]
    );
  },

  async createPayment(connection, orderId, methodId, statusId, amount) {
    return execute(
      connection,
      `INSERT INTO payments (order_id, method_id, status_id, amount)
       VALUES (?, ?, ?, ?)`,
      [orderId, methodId, statusId, amount]
    );
  },

  async createDelivery(connection, orderId) {
    return execute(
      connection,
      "INSERT INTO deliveries (order_id, status) VALUES (?, 'REQUESTED')",
      [orderId]
    );
  },

  async createOrderHistory(connection, orderId, statusId, userId, note) {
    return execute(
      connection,
      `INSERT INTO order_status_history (order_id, status_id, changed_by_user_id, note)
       VALUES (?, ?, ?, ?)`,
      [orderId, statusId, userId, note]
    );
  },

  async listOrders(customerId, statusName) {
    const params = [customerId];
    const statusFilter = statusName ? ' AND status.status_name = ?' : '';
    if (statusName) params.push(statusName);
    const [rows] = await db.execute(
      `SELECT order_record.order_id, order_record.order_code,
        order_record.restaurant_id, restaurant.name AS restaurant_name,
        order_record.address_id, order_record.subtotal, order_record.delivery_fee,
        order_record.discount, order_record.total_amount, status.status_name AS status,
        order_record.note, order_record.created_at, order_record.updated_at
       FROM orders order_record
       JOIN restaurants restaurant ON restaurant.restaurant_id = order_record.restaurant_id
       JOIN order_statuses status ON status.status_id = order_record.status_id
       WHERE order_record.customer_id = ?${statusFilter}
       ORDER BY order_record.created_at DESC, order_record.order_id DESC`,
      params
    );
    return rows;
  },

  async getOrder(customerId, orderId) {
    const [orders] = await db.execute(
      `SELECT order_record.order_id, order_record.order_code,
        order_record.restaurant_id, restaurant.name AS restaurant_name,
        order_record.address_id, address.address_name, address.receiver_name,
        address.receiver_phone, address.full_address, address.latitude, address.longitude,
        order_record.subtotal, order_record.delivery_fee, order_record.discount,
        order_record.total_amount, status.status_name AS status, order_record.note,
        order_record.created_at, order_record.updated_at
       FROM orders order_record
       JOIN restaurants restaurant ON restaurant.restaurant_id = order_record.restaurant_id
       JOIN addresses address ON address.address_id = order_record.address_id
       JOIN order_statuses status ON status.status_id = order_record.status_id
       WHERE order_record.customer_id = ? AND order_record.order_id = ?
       LIMIT 1`,
      [customerId, orderId]
    );
    if (!orders[0]) return null;
    const [items] = await db.execute(
      `SELECT detail.order_detail_id, detail.food_id, food.name AS food_name,
        detail.quantity, detail.unit_price, detail.subtotal
       FROM order_details detail
       JOIN foods food ON food.food_id = detail.food_id
       WHERE detail.order_id = ?
       ORDER BY detail.order_detail_id`,
      [orderId]
    );
    const [payments] = await db.execute(
      `SELECT payment.amount, method.method_name AS method, status.status_name AS status,
        payment.paid_at
       FROM payments payment
       JOIN payment_methods method ON method.method_id = payment.method_id
       JOIN payment_statuses status ON status.status_id = payment.status_id
       WHERE payment.order_id = ?
       LIMIT 1`,
      [orderId]
    );
    const [deliveries] = await db.execute(
      `SELECT delivery.status, delivery.pickup_time, delivery.delivery_time, delivery.note
       FROM deliveries delivery
       WHERE delivery.order_id = ?
       LIMIT 1`,
      [orderId]
    );
    const history = await this.getOrderHistory(orderId);
    return {
      ...orders[0],
      items,
      payment: payments[0] || null,
      delivery: deliveries[0] || null,
      history,
    };
  },

  async listOrdersForRestaurant(restaurantId, statusName) {
    const params = [restaurantId];
    const statusFilter = statusName ? ' AND status.status_name = ?' : '';
    if (statusName) params.push(statusName);
    const [rows] = await db.execute(
      `SELECT order_record.order_id, order_record.order_code,
        order_record.customer_id, order_record.restaurant_id,
        order_record.address_id, order_record.subtotal, order_record.delivery_fee,
        order_record.discount, order_record.total_amount,
        status.status_name AS status, order_record.note,
        order_record.created_at, order_record.updated_at
       FROM orders order_record
       JOIN order_statuses status ON status.status_id = order_record.status_id
       WHERE order_record.restaurant_id = ?${statusFilter}
       ORDER BY order_record.created_at DESC, order_record.order_id DESC`,
      params
    );
    return rows;
  },

  async getOrderForRestaurant(restaurantId, orderId) {
    const [orders] = await db.execute(
      `SELECT order_record.order_id, order_record.order_code,
        order_record.customer_id, order_record.restaurant_id,
        order_record.address_id, address.address_name, address.receiver_name,
        address.receiver_phone, address.full_address, address.latitude, address.longitude,
        order_record.subtotal, order_record.delivery_fee, order_record.discount,
        order_record.total_amount, status.status_name AS status, order_record.note,
        order_record.created_at, order_record.updated_at
       FROM orders order_record
       JOIN addresses address ON address.address_id = order_record.address_id
       JOIN order_statuses status ON status.status_id = order_record.status_id
       WHERE order_record.restaurant_id = ? AND order_record.order_id = ?
       LIMIT 1`,
      [restaurantId, orderId]
    );
    if (!orders[0]) return null;
    const [items] = await db.execute(
      `SELECT detail.order_detail_id, detail.food_id, food.name AS food_name,
        detail.quantity, detail.unit_price, detail.subtotal
       FROM order_details detail
       JOIN foods food ON food.food_id = detail.food_id
       WHERE detail.order_id = ?
       ORDER BY detail.order_detail_id`,
      [orderId]
    );
    const history = await this.getOrderHistory(orderId);
    return { ...orders[0], items, history };
  },

  async getOrderHistory(orderId, connection = db) {
    const [rows] = await connection.execute(
      `SELECT history.history_id, status.status_name AS status,
        history.changed_by_user_id, history.note, history.changed_at
       FROM order_status_history history
       JOIN order_statuses status ON status.status_id = history.status_id
       WHERE history.order_id = ?
       ORDER BY history.changed_at, history.history_id`,
      [orderId]
    );
    return rows;
  },

  async lockOrderForTransition(connection, orderId) {
    const [rows] = await connection.execute(
      `SELECT order_record.order_id, order_record.customer_id,
        order_record.restaurant_id, order_record.status_id,
        status.status_name AS status
       FROM orders order_record
       JOIN order_statuses status ON status.status_id = order_record.status_id
       WHERE order_record.order_id = ?
       LIMIT 1
       FOR UPDATE`,
      [orderId]
    );
    return rows[0] || null;
  },

  async getOrderStatusId(connection, statusName) {
    return this.getLookupId(connection, 'order_statuses', 'status_name', statusName);
  },

  async updateOrderStatus(connection, orderId, statusId) {
    const [result] = await connection.execute(
      'UPDATE orders SET status_id = ? WHERE order_id = ?',
      [statusId, orderId]
    );
    return result.affectedRows;
  },

  async cancelPendingDelivery(connection, orderId) {
    await connection.execute(
      `UPDATE deliveries SET status = 'CANCELLED'
       WHERE order_id = ? AND status = 'REQUESTED'`,
      [orderId]
    );
    await connection.execute(
      `UPDATE payments
       SET status_id = (
         SELECT status_id FROM payment_statuses WHERE status_name = 'CANCELLED' LIMIT 1
       )
       WHERE order_id = ?
         AND status_id = (
           SELECT status_id FROM payment_statuses WHERE status_name = 'PENDING' LIMIT 1
         )`,
      [orderId]
    );
  },
};
