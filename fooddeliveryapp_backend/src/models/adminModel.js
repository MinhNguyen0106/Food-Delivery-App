const db = require('../common/db').promise();

module.exports = {
  pool: db,

  async listCustomers(filter = {}) {
    const clauses = [];
    const params = [];
    if (filter.q) {
      clauses.push('(profile.full_name LIKE ? OR profile.phone LIKE ? OR usr.email LIKE ?)');
      const term = `%${filter.q}%`;
      params.push(term, term, term);
    }
    if (filter.status) {
      clauses.push('user_status.status_name = ?');
      params.push(filter.status);
    }
    const [rows] = await db.execute(
      `SELECT customer.customer_id, usr.user_id, usr.email,
        user_status.status_name AS account_status, profile.full_name, profile.phone,
        profile.date_of_birth, usr.created_at
       FROM customers customer
       JOIN users usr ON usr.user_id = customer.user_id
       JOIN user_statuses user_status ON user_status.status_id = usr.status_id
       LEFT JOIN customer_profiles profile ON profile.customer_id = customer.customer_id
       ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
       ORDER BY customer.customer_id DESC`,
      params
    );
    return rows;
  },

  async getCustomer(customerId) {
    const [rows] = await db.execute(
      `SELECT customer.customer_id, usr.user_id, usr.email,
        user_status.status_name AS account_status, profile.full_name, profile.phone,
        profile.date_of_birth, usr.created_at
       FROM customers customer
       JOIN users usr ON usr.user_id = customer.user_id
       JOIN user_statuses user_status ON user_status.status_id = usr.status_id
       LEFT JOIN customer_profiles profile ON profile.customer_id = customer.customer_id
       WHERE customer.customer_id = ?
       LIMIT 1`,
      [customerId]
    );
    return rows[0] || null;
  },

  async listRestaurants(filter = {}) {
    const clauses = [];
    const params = [];
    if (filter.q) {
      clauses.push('(restaurant.name LIKE ? OR restaurant.address LIKE ? OR restaurant.phone LIKE ? OR usr.email LIKE ?)');
      const term = `%${filter.q}%`;
      params.push(term, term, term, term);
    }
    if (filter.status) {
      clauses.push('restaurant_status.status_name = ?');
      params.push(filter.status);
    }
    const [rows] = await db.execute(
      `SELECT restaurant.restaurant_id, usr.user_id, usr.email,
        restaurant.name, restaurant.address, restaurant.phone, restaurant.description,
        restaurant.latitude, restaurant.longitude, restaurant.image,
        restaurant.opening_time, restaurant.closing_time,
        restaurant_status.status_name AS status, user_status.status_name AS account_status
       FROM restaurants restaurant
       JOIN users usr ON usr.user_id = restaurant.user_id
       JOIN user_statuses user_status ON user_status.status_id = usr.status_id
       JOIN restaurant_statuses restaurant_status
         ON restaurant_status.status_id = restaurant.status_id
       ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
       ORDER BY restaurant.restaurant_id DESC`,
      params
    );
    return rows;
  },

  async getRestaurant(restaurantId) {
    const [rows] = await db.execute(
      `SELECT restaurant.restaurant_id, usr.user_id, usr.email,
        restaurant.name, restaurant.address, restaurant.phone, restaurant.description,
        restaurant.latitude, restaurant.longitude, restaurant.image,
        restaurant.opening_time, restaurant.closing_time,
        restaurant_status.status_name AS status, user_status.status_name AS account_status
       FROM restaurants restaurant
       JOIN users usr ON usr.user_id = restaurant.user_id
       JOIN user_statuses user_status ON user_status.status_id = usr.status_id
       JOIN restaurant_statuses restaurant_status
         ON restaurant_status.status_id = restaurant.status_id
       WHERE restaurant.restaurant_id = ?
       LIMIT 1`,
      [restaurantId]
    );
    return rows[0] || null;
  },

  async listShippers(filter = {}) {
    const clauses = [];
    const params = [];
    if (filter.q) {
      clauses.push('(shipper.full_name LIKE ? OR shipper.phone LIKE ? OR usr.email LIKE ?)');
      const term = `%${filter.q}%`;
      params.push(term, term, term);
    }
    if (filter.accountStatus) {
      clauses.push('user_status.status_name = ?');
      params.push(filter.accountStatus);
    }
    if (filter.availability) {
      clauses.push('shipper_status.status_name = ?');
      params.push(filter.availability);
    }
    const [rows] = await db.execute(
      `SELECT shipper.shipper_id, usr.user_id, usr.email, shipper.full_name,
        shipper.phone, user_status.status_name AS account_status,
        shipper_status.status_name AS availability, usr.created_at
       FROM shippers shipper
       JOIN users usr ON usr.user_id = shipper.user_id
       JOIN user_statuses user_status ON user_status.status_id = usr.status_id
       JOIN shipper_statuses shipper_status
         ON shipper_status.status_id = shipper.status_id
       ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
       ORDER BY shipper.shipper_id DESC`,
      params
    );
    return rows;
  },

  async getShipper(shipperId) {
    const [rows] = await db.execute(
      `SELECT shipper.shipper_id, usr.user_id, usr.email, shipper.full_name,
        shipper.phone, user_status.status_name AS account_status,
        shipper_status.status_name AS availability, usr.created_at
       FROM shippers shipper
       JOIN users usr ON usr.user_id = shipper.user_id
       JOIN user_statuses user_status ON user_status.status_id = usr.status_id
       JOIN shipper_statuses shipper_status
         ON shipper_status.status_id = shipper.status_id
       WHERE shipper.shipper_id = ?
       LIMIT 1`,
      [shipperId]
    );
    return rows[0] || null;
  },

  async updateCustomerAccountStatus(connection, customerId, statusId) {
    const [result] = await connection.execute(
      `      UPDATE users usr
      JOIN customers customer ON customer.user_id = usr.user_id
      SET usr.status_id = ?
       WHERE customer.customer_id = ?`,
      [statusId, customerId]
    );
    return result.affectedRows;
  },

  async updateShipperAccountStatus(connection, shipperId, statusId) {
    const [result] = await connection.execute(
      `      UPDATE users usr
      JOIN shippers shipper ON shipper.user_id = usr.user_id
      SET usr.status_id = ?
       WHERE shipper.shipper_id = ?`,
      [statusId, shipperId]
    );
    return result.affectedRows;
  },

  async shipperHasActiveDelivery(connection, shipperId) {
    const [rows] = await connection.execute(
      `SELECT delivery.delivery_id
       FROM deliveries delivery
       WHERE delivery.shipper_id = ?
         AND delivery.status IN ('ACCEPTED', 'PICKED_UP', 'DELIVERING')
       LIMIT 1
       FOR UPDATE`,
      [shipperId]
    );
    return rows.length > 0;
  },

  async lockRestaurant(connection, restaurantId) {
    const [rows] = await connection.execute(
      `SELECT restaurant.restaurant_id, restaurant.user_id,
        status.status_name AS status
       FROM restaurants restaurant
       JOIN restaurant_statuses status ON status.status_id = restaurant.status_id
       WHERE restaurant.restaurant_id = ?
       LIMIT 1
       FOR UPDATE`,
      [restaurantId]
    );
    return rows[0] || null;
  },

  async setRestaurantStatus(connection, restaurantId, statusId) {
    const [result] = await connection.execute(
      'UPDATE restaurants SET status_id = ? WHERE restaurant_id = ?',
      [statusId, restaurantId]
    );
    return result.affectedRows;
  },

  async getAdminOrder(connection, orderId) {
    const [rows] = await connection.execute(
      `SELECT order_record.order_id, order_record.order_code,
        order_record.customer_id, customer_profile.full_name AS customer_name,
        order_record.restaurant_id, restaurant.name AS restaurant_name,
        order_record.address_id, address.receiver_name, address.receiver_phone,
        address.full_address, order_record.subtotal, order_record.delivery_fee,
        order_record.discount, order_record.total_amount,
        order_status.status_name AS status, order_record.note,
        order_record.created_at, order_record.updated_at
       FROM orders order_record
       JOIN customers customer ON customer.customer_id = order_record.customer_id
       LEFT JOIN customer_profiles customer_profile
         ON customer_profile.customer_id = customer.customer_id
       JOIN restaurants restaurant ON restaurant.restaurant_id = order_record.restaurant_id
       JOIN addresses address ON address.address_id = order_record.address_id
       JOIN order_statuses order_status ON order_status.status_id = order_record.status_id
       WHERE order_record.order_id = ?
       LIMIT 1`,
      [orderId]
    );
    if (!rows[0]) return null;
    const [items] = await connection.execute(
      `SELECT detail.order_detail_id, detail.food_id, food.name AS food_name,
        detail.quantity, detail.unit_price, detail.subtotal
       FROM order_details detail
       JOIN foods food ON food.food_id = detail.food_id
       WHERE detail.order_id = ?
       ORDER BY detail.order_detail_id`,
      [orderId]
    );
    const [history] = await connection.execute(
      `SELECT order_status.status_name AS status, history.note, history.changed_at,
        history.changed_by_user_id
       FROM order_status_history history
       JOIN order_statuses order_status ON order_status.status_id = history.status_id
       WHERE history.order_id = ?
       ORDER BY history.changed_at, history.history_id`,
      [orderId]
    );
    const [payment] = await connection.execute(
      `SELECT method.method_name AS method, status.status_name AS status,
        payment.amount, payment.paid_at
       FROM payments payment
       JOIN payment_methods method ON method.method_id = payment.method_id
       JOIN payment_statuses status ON status.status_id = payment.status_id
       WHERE payment.order_id = ?
       LIMIT 1`,
      [orderId]
    );
    const [delivery] = await connection.execute(
      `SELECT delivery.delivery_id, delivery.shipper_id,
        delivery.status AS delivery_status, delivery.pickup_time,
        delivery.delivery_time, delivery.note
       FROM deliveries delivery
       WHERE delivery.order_id = ?
       LIMIT 1`,
      [orderId]
    );
    return {
      ...rows[0],
      items,
      history,
      payment: payment[0] || null,
      delivery: delivery[0] || null,
    };
  },

  async listAdminOrders(filter = {}) {
    const clauses = [];
    const params = [];
    if (filter.status) {
      clauses.push('order_status.status_name = ?');
      params.push(filter.status);
    }
    if (filter.from) {
      clauses.push('order_record.created_at >= ?');
      params.push(`${filter.from} 00:00:00`);
    }
    if (filter.to) {
      clauses.push('order_record.created_at < DATE_ADD(?, INTERVAL 1 DAY)');
      params.push(filter.to);
    }
    if (filter.q) {
      clauses.push('(order_record.order_code LIKE ? OR restaurant.name LIKE ? OR customer_profile.full_name LIKE ?)');
      const term = `%${filter.q}%`;
      params.push(term, term, term);
    }
    const [rows] = await db.execute(
      `SELECT order_record.order_id, order_record.order_code,
        order_record.customer_id, customer_profile.full_name AS customer_name,
        order_record.restaurant_id, restaurant.name AS restaurant_name,
        order_record.subtotal, order_record.delivery_fee, order_record.discount,
        order_record.total_amount, order_status.status_name AS status,
        order_record.created_at, order_record.updated_at
       FROM orders order_record
       JOIN order_statuses order_status ON order_status.status_id = order_record.status_id
       JOIN restaurants restaurant ON restaurant.restaurant_id = order_record.restaurant_id
       LEFT JOIN customers customer ON customer.customer_id = order_record.customer_id
       LEFT JOIN customer_profiles customer_profile
         ON customer_profile.customer_id = customer.customer_id
       ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
       ORDER BY order_record.created_at DESC, order_record.order_id DESC
       LIMIT 500`,
      params
    );
    return rows;
  },

  async getReportSummary(connection = db) {
    const [[summaryRows], [orderStatusRows]] = await Promise.all([
      connection.execute(
      `SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM users user_record
          JOIN user_statuses status ON status.status_id = user_record.status_id
          WHERE status.status_name = 'ACTIVE') AS active_users,
        (SELECT COUNT(*) FROM users user_record
          JOIN user_statuses status ON status.status_id = user_record.status_id
          WHERE status.status_name = 'LOCKED') AS locked_users,
        (SELECT COUNT(*) FROM customers) AS total_customers,
        (SELECT COUNT(*) FROM customers customer
          JOIN users usr ON usr.user_id = customer.user_id
          JOIN user_statuses status ON status.status_id = usr.status_id
          WHERE status.status_name = 'ACTIVE') AS active_customers,
        (SELECT COUNT(*) FROM customers customer
          JOIN users usr ON usr.user_id = customer.user_id
          JOIN user_statuses status ON status.status_id = usr.status_id
          WHERE status.status_name = 'LOCKED') AS locked_customers,
        (SELECT COUNT(*) FROM restaurants) AS total_restaurants,
        (SELECT COUNT(*) FROM restaurants restaurant
          JOIN restaurant_statuses status ON status.status_id = restaurant.status_id
          WHERE status.status_name = 'ACTIVE') AS active_restaurants,
        (SELECT COUNT(*) FROM restaurants restaurant
          JOIN restaurant_statuses status ON status.status_id = restaurant.status_id
          WHERE status.status_name = 'SUSPENDED') AS suspended_restaurants,
        (SELECT COUNT(*) FROM restaurants restaurant
          JOIN restaurant_statuses status ON status.status_id = restaurant.status_id
          WHERE status.status_name = 'PENDING') AS pending_restaurants,
        (SELECT COUNT(*) FROM restaurants restaurant
          JOIN restaurant_statuses status ON status.status_id = restaurant.status_id
          WHERE status.status_name = 'REJECTED') AS rejected_restaurants,
        (SELECT COUNT(*) FROM shippers) AS total_shippers,
        (SELECT COUNT(*) FROM shippers shipper
          JOIN users usr ON usr.user_id = shipper.user_id
          JOIN user_statuses status ON status.status_id = usr.status_id
          WHERE status.status_name = 'ACTIVE') AS active_shippers,
        (SELECT COUNT(*) FROM shippers shipper
          JOIN users usr ON usr.user_id = shipper.user_id
          JOIN user_statuses status ON status.status_id = usr.status_id
          WHERE status.status_name = 'LOCKED') AS locked_shippers,
        (SELECT COUNT(*) FROM shippers shipper
          JOIN shipper_statuses status ON status.status_id = shipper.status_id
          WHERE status.status_name = 'ONLINE') AS online_shippers,
        (SELECT COUNT(*) FROM shippers shipper
          JOIN shipper_statuses status ON status.status_id = shipper.status_id
          WHERE status.status_name = 'OFFLINE') AS offline_shippers,
        (SELECT COUNT(*) FROM shippers shipper
          JOIN shipper_statuses status ON status.status_id = shipper.status_id
          WHERE status.status_name = 'BUSY') AS busy_shippers,
        (SELECT COUNT(*) FROM orders) AS total_orders,
        (SELECT COUNT(*) FROM orders order_record
          JOIN order_statuses status ON status.status_id = order_record.status_id
          WHERE status.status_name = 'COMPLETED') AS completed_orders,
        (SELECT COUNT(*) FROM orders order_record
          JOIN order_statuses status ON status.status_id = order_record.status_id
          WHERE status.status_name = 'CANCELLED') AS cancelled_orders,
        (SELECT COUNT(*) FROM orders order_record
          JOIN order_statuses status ON status.status_id = order_record.status_id
          WHERE status.status_name = 'REJECTED') AS rejected_orders,
        (SELECT COUNT(*) FROM orders
          WHERE created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL 1 DAY
        ) AS orders_today,
        (SELECT COALESCE(SUM(order_record.subtotal), 0)
          FROM orders order_record
          JOIN order_statuses status ON status.status_id = order_record.status_id
          WHERE status.status_name = 'COMPLETED') AS total_restaurant_revenue,
        (SELECT COALESCE(SUM(order_record.subtotal), 0)
          FROM orders order_record
          JOIN order_statuses status ON status.status_id = order_record.status_id
          WHERE status.status_name = 'COMPLETED'
            AND EXISTS (
              SELECT 1 FROM order_status_history history
              JOIN order_statuses completed ON completed.status_id = history.status_id
              WHERE history.order_id = order_record.order_id
                AND completed.status_name = 'COMPLETED'
                AND history.changed_at >= CURRENT_DATE
                AND history.changed_at < CURRENT_DATE + INTERVAL 1 DAY
            )
        ) AS revenue_today`,
      ),
      connection.execute(
        `SELECT status.status_name AS status, COUNT(order_record.order_id) AS order_count
         FROM order_statuses status
         LEFT JOIN orders order_record ON order_record.status_id = status.status_id
         GROUP BY status.status_id, status.status_name
         ORDER BY status.status_id`
      ),
    ]);
    return {
      ...summaryRows[0],
      orders_by_status: Object.fromEntries(
        orderStatusRows.map((row) => [row.status, row.order_count])
      ),
    };
  },

  async getAdminRevenue(filter, groupBy, connection = db) {
    const periodExpression = groupBy === 'month'
      ? "DATE_FORMAT(completion.completed_at, '%Y-%m')"
      : "DATE_FORMAT(completion.completed_at, '%Y-%m-%d')";
    const clauses = [];
    const params = [];
    if (filter.from) {
      clauses.push('completion.completed_at >= ?');
      params.push(`${filter.from} 00:00:00`);
    }
    if (filter.to) {
      clauses.push('completion.completed_at < DATE_ADD(?, INTERVAL 1 DAY)');
      params.push(filter.to);
    }
    const [rows] = await connection.execute(
      `SELECT ${periodExpression} AS period,
        COALESCE(SUM(order_record.subtotal), 0) AS revenue,
        COUNT(*) AS completed_orders
       FROM orders order_record
       JOIN (
         SELECT history.order_id, MAX(history.changed_at) AS completed_at
         FROM order_status_history history
         JOIN order_statuses status ON status.status_id = history.status_id
         WHERE status.status_name = 'COMPLETED'
         GROUP BY history.order_id
       ) completion ON completion.order_id = order_record.order_id
       ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
       GROUP BY period
       ORDER BY period DESC
       `,
      params
    );
    return rows;
  },

  async getRestaurantRevenue(restaurantId, filter, groupBy, connection = db) {
    const periodExpression = groupBy === 'month'
      ? "DATE_FORMAT(completion.completed_at, '%Y-%m')"
      : groupBy === 'week'
        ? "DATE_FORMAT(DATE_SUB(completion.completed_at, INTERVAL WEEKDAY(completion.completed_at) DAY), '%Y-%m-%d')"
        : "DATE_FORMAT(completion.completed_at, '%Y-%m-%d')";
    const clauses = ['order_record.restaurant_id = ?'];
    const params = [restaurantId];
    if (filter.from) {
      clauses.push('completion.completed_at >= ?');
      params.push(`${filter.from} 00:00:00`);
    }
    if (filter.to) {
      clauses.push('completion.completed_at < DATE_ADD(?, INTERVAL 1 DAY)');
      params.push(filter.to);
    }
    const [rows] = await connection.execute(
      `SELECT ${periodExpression} AS period,
        COALESCE(SUM(order_record.subtotal), 0) AS revenue,
        COUNT(*) AS completed_orders
       FROM orders order_record
       JOIN (
         SELECT history.order_id, MAX(history.changed_at) AS completed_at
         FROM order_status_history history
         JOIN order_statuses status ON status.status_id = history.status_id
         WHERE status.status_name = 'COMPLETED'
         GROUP BY history.order_id
       ) completion ON completion.order_id = order_record.order_id
       WHERE ${clauses.join(' AND ')}
       GROUP BY period
       ORDER BY period DESC
       `,
      params
    );
    return rows;
  },
};
