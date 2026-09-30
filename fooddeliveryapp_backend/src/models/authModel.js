const db = require('../common/db');

const pool = db.promise();

const identityQuery = `
  SELECT
    u.user_id,
    u.email,
    u.password_hash,
    u.status_id,
    us.status_name AS user_status,
    ur.role_name AS role,
    c.customer_id,
    cp.full_name AS customer_name,
    cp.phone AS customer_phone,
    cp.date_of_birth AS customer_date_of_birth,
    r.restaurant_id,
    r.name AS restaurant_name,
    s.shipper_id,
    s.full_name AS shipper_name,
    s.phone AS shipper_phone,
    a.admin_id,
    a.full_name AS admin_name
  FROM users u
  JOIN user_statuses us ON us.status_id = u.status_id
  JOIN user_roles ur ON ur.role_id = u.role_id
  LEFT JOIN customers c ON c.user_id = u.user_id
  LEFT JOIN customer_profiles cp ON cp.customer_id = c.customer_id
  LEFT JOIN restaurants r ON r.user_id = u.user_id
  LEFT JOIN shippers s ON s.user_id = u.user_id
  LEFT JOIN admins a ON a.user_id = u.user_id
`;

module.exports = {
  pool,

  async getIdentityByEmail(email) {
    const [rows] = await pool.execute(
      `${identityQuery} WHERE u.email = ? LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  async getIdentityById(userId) {
    const [rows] = await pool.execute(
      `${identityQuery} WHERE u.user_id = ? LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  },

  async getAuthorizationIdentityById(userId) {
    const [rows] = await pool.execute(
      `SELECT
        u.user_id,
        us.status_name AS user_status,
        ur.role_name AS role,
        c.customer_id,
        r.restaurant_id,
        restaurant_status.status_name AS restaurant_status,
        s.shipper_id,
        a.admin_id
      FROM users u
      JOIN user_statuses us ON us.status_id = u.status_id
      JOIN user_roles ur ON ur.role_id = u.role_id
      LEFT JOIN customers c ON c.user_id = u.user_id
      LEFT JOIN restaurants r ON r.user_id = u.user_id
      LEFT JOIN restaurant_statuses restaurant_status
        ON restaurant_status.status_id = r.status_id
      LEFT JOIN shippers s ON s.user_id = u.user_id
      LEFT JOIN admins a ON a.user_id = u.user_id
      WHERE u.user_id = ?
      LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  },
};
