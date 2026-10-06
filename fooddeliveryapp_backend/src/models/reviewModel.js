const db = require('../common/db').promise();

module.exports = {
  pool: db,

  async lockCustomerOrder(connection, orderId, customerId) {
    const [rows] = await connection.execute(
      `SELECT order_record.order_id, order_record.restaurant_id,
        status.status_name AS status
       FROM orders order_record
       JOIN order_statuses status ON status.status_id = order_record.status_id
       WHERE order_record.order_id = ? AND order_record.customer_id = ?
       LIMIT 1
       FOR UPDATE`,
      [orderId, customerId]
    );
    return rows[0] || null;
  },

  async create(connection, review) {
    const [result] = await connection.execute(
      `INSERT INTO reviews (customer_id, order_id, rating, comment, status_id)
       SELECT ?, ?, ?, ?, status_id
       FROM review_statuses
       WHERE status_name = 'VISIBLE'`,
      [review.customerId, review.orderId, review.rating, review.comment]
    );
    return result.insertId;
  },

  async get(connection, reviewId, lock = false) {
    const [rows] = await connection.execute(
      `SELECT review.review_id, review.customer_id, review.order_id,
        review.rating, review.comment, status.status_name AS status,
        review.created_at, review.updated_at,
        order_record.restaurant_id, order_status.status_name AS order_status
       FROM reviews review
       JOIN review_statuses status ON status.status_id = review.status_id
       JOIN orders order_record ON order_record.order_id = review.order_id
       JOIN order_statuses order_status ON order_status.status_id = order_record.status_id
       WHERE review.review_id = ?
       LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
      [reviewId]
    );
    return rows[0] || null;
  },

  async listCustomer(customerId) {
    const [rows] = await db.execute(
      `SELECT review.review_id, review.order_id, review.rating, review.comment,
        status.status_name AS status, review.created_at, review.updated_at,
        restaurant.name AS restaurant_name
       FROM reviews review
       JOIN review_statuses status ON status.status_id = review.status_id
       JOIN orders order_record ON order_record.order_id = review.order_id
       JOIN restaurants restaurant ON restaurant.restaurant_id = order_record.restaurant_id
       WHERE review.customer_id = ?
       ORDER BY review.created_at DESC, review.review_id DESC`,
      [customerId]
    );
    return rows;
  },

  async listAdmin(statusName) {
    const params = [];
    const filter = statusName ? 'WHERE status.status_name = ?' : '';
    if (statusName) params.push(statusName);
    const [rows] = await db.execute(
      `SELECT review.review_id, review.customer_id, review.order_id,
        review.rating, review.comment,
        CASE WHEN status.status_name = 'PENDING' THEN 'VISIBLE'
          ELSE status.status_name END AS status,
        review.created_at, review.updated_at,
        order_record.restaurant_id, restaurant.name AS restaurant_name
       FROM reviews review
       JOIN review_statuses status ON status.status_id = review.status_id
       JOIN orders order_record ON order_record.order_id = review.order_id
       JOIN restaurants restaurant ON restaurant.restaurant_id = order_record.restaurant_id
       ${filter}
       ORDER BY review.created_at DESC, review.review_id DESC`,
      params
    );
    return rows;
  },

  async listRestaurant(restaurantId) {
    const [rows] = await db.execute(
      `SELECT review.review_id, review.order_id, review.rating, review.comment,
        review.created_at, restaurant.name AS restaurant_name
       FROM reviews review
       JOIN review_statuses status ON status.status_id = review.status_id
       JOIN orders order_record ON order_record.order_id = review.order_id
       JOIN restaurants restaurant ON restaurant.restaurant_id = order_record.restaurant_id
       WHERE order_record.restaurant_id = ?
         AND status.status_name IN ('VISIBLE', 'PENDING')
       ORDER BY review.created_at DESC, review.review_id DESC`,
      [restaurantId]
    );
    return rows;
  },

  async listPublicRestaurant(restaurantId) {
    const [rows] = await db.execute(
      `SELECT review.review_id, review.rating, review.comment, review.created_at
       FROM reviews review
       JOIN review_statuses status ON status.status_id = review.status_id
       JOIN orders order_record ON order_record.order_id = review.order_id
       WHERE order_record.restaurant_id = ?
         AND status.status_name IN ('VISIBLE', 'PENDING')
       ORDER BY review.created_at DESC, review.review_id DESC`,
      [restaurantId]
    );
    return rows;
  },

  async statusId(connection, statusName) {
    const [rows] = await connection.execute(
      'SELECT status_id FROM review_statuses WHERE status_name = ? LIMIT 1',
      [statusName]
    );
    return rows[0]?.status_id ?? null;
  },

  async updateStatus(connection, reviewId, statusId) {
    const [result] = await connection.execute(
      'UPDATE reviews SET status_id = ? WHERE review_id = ?',
      [statusId, reviewId]
    );
    return result.affectedRows;
  },
};
