const db = require('../common/db').promise();

module.exports = {
  pool: db,

  async list(connection = db) {
    const [rows] = await connection.execute(
      `SELECT voucher.voucher_id, voucher.code, voucher.discount_value,
        voucher.min_order_value, voucher.usage_limit, voucher.used_count,
        status.status_name AS status, voucher.start_date, voucher.end_date
       FROM vouchers voucher
       JOIN voucher_statuses status ON status.status_id = voucher.status_id
       ORDER BY voucher.voucher_id`
    );
    return rows;
  },

  async listAvailable(connection = db) {
    const [rows] = await connection.execute(
      `SELECT voucher.code, voucher.discount_value, voucher.min_order_value,
        voucher.start_date, voucher.end_date
       FROM vouchers voucher
       JOIN voucher_statuses status ON status.status_id = voucher.status_id
       WHERE status.status_name = 'ACTIVE'
         AND voucher.used_count < voucher.usage_limit
         AND voucher.start_date <= CURRENT_TIMESTAMP
         AND voucher.end_date >= CURRENT_TIMESTAMP
       ORDER BY voucher.end_date, voucher.code`
    );
    return rows;
  },

  async get(connection, voucherId, lock = false) {
    const [rows] = await connection.execute(
      `SELECT voucher.voucher_id, voucher.code, voucher.discount_value,
        voucher.min_order_value, voucher.usage_limit, voucher.used_count,
        voucher.status_id, status.status_name AS status,
        voucher.start_date, voucher.end_date
       FROM vouchers voucher
       JOIN voucher_statuses status ON status.status_id = voucher.status_id
       WHERE voucher.voucher_id = ?
       LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
      [voucherId]
    );
    return rows[0] || null;
  },

  async statusId(connection, status) {
    const [rows] = await connection.execute(
      'SELECT status_id FROM voucher_statuses WHERE status_name = ? LIMIT 1',
      [status]
    );
    return rows[0]?.status_id ?? null;
  },

  async lockByCode(connection, code) {
    const [rows] = await connection.execute(
      `SELECT voucher.voucher_id, voucher.code, voucher.discount_value,
        voucher.min_order_value, voucher.usage_limit, voucher.used_count,
        status.status_name AS status,
        (CURRENT_TIMESTAMP BETWEEN voucher.start_date AND voucher.end_date) AS is_in_period
       FROM vouchers voucher
       JOIN voucher_statuses status ON status.status_id = voucher.status_id
       WHERE voucher.code = ?
       LIMIT 1
       FOR UPDATE`,
      [code]
    );
    return rows[0] || null;
  },

  async incrementUsage(connection, voucherId) {
    const [result] = await connection.execute(
      `UPDATE vouchers
       SET used_count = used_count + 1
       WHERE voucher_id = ?
         AND used_count < usage_limit
         AND status_id = (
           SELECT status_id FROM voucher_statuses WHERE status_name = 'ACTIVE' LIMIT 1
         )
         AND start_date <= CURRENT_TIMESTAMP
         AND end_date >= CURRENT_TIMESTAMP`,
      [voucherId]
    );
    return result.affectedRows === 1;
  },

  async create(connection, voucher) {
    const [result] = await connection.execute(
      `INSERT INTO vouchers
        (code, discount_value, min_order_value, usage_limit, used_count,
         status_id, start_date, end_date)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
      [voucher.code, voucher.discountValue, voucher.minOrderValue,
        voucher.usageLimit, voucher.statusId, voucher.startDate, voucher.endDate]
    );
    return result.insertId;
  },

  async update(connection, voucherId, voucher) {
    const [result] = await connection.execute(
      `UPDATE vouchers
       SET code = ?, discount_value = ?, min_order_value = ?,
         usage_limit = ?, status_id = ?, start_date = ?, end_date = ?
       WHERE voucher_id = ? AND used_count <= ?`,
      [voucher.code, voucher.discountValue, voucher.minOrderValue,
        voucher.usageLimit, voucher.statusId, voucher.startDate,
        voucher.endDate, voucherId, voucher.usageLimit]
    );
    return result.affectedRows;
  },

  async delete(connection, voucherId) {
    const [result] = await connection.execute(
      `DELETE FROM vouchers
       WHERE voucher_id = ? AND used_count = 0
         AND NOT EXISTS (SELECT 1 FROM orders WHERE orders.voucher_id = vouchers.voucher_id)`,
      [voucherId]
    );
    return result.affectedRows;
  },
};
