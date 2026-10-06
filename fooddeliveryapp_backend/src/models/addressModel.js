const db = require('../common/db').promise();

module.exports = {
  async listForCustomer(customerId) {
    const [rows] = await db.execute(
      `SELECT address_id, customer_id, address_name, receiver_name, receiver_phone,
        full_address, latitude, longitude, note, is_default, created_at, updated_at
       FROM addresses WHERE customer_id = ? ORDER BY is_default DESC, updated_at DESC`,
      [customerId]
    );
    return rows;
  },

  async getForCustomer(addressId, customerId, connection = db) {
    const [rows] = await connection.execute(
      `SELECT address_id, customer_id, address_name, receiver_name, receiver_phone,
        full_address, latitude, longitude, note, is_default, created_at, updated_at
       FROM addresses WHERE address_id = ? AND customer_id = ? LIMIT 1`,
      [addressId, customerId]
    );
    return rows[0] || null;
  },

  async create(customerId, data, connection) {
    const [result] = await connection.execute(
      `INSERT INTO addresses
        (customer_id, address_name, receiver_name, receiver_phone, full_address,
         latitude, longitude, note, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [customerId, data.address_name.trim(), data.receiver_name.trim(),
        data.receiver_phone.trim(), data.full_address.trim(), data.latitude,
        data.longitude, data.note?.trim() || null, data.is_default ? 1 : 0]
    );
    return result.insertId;
  },

  async update(addressId, customerId, data, connection) {
    const fields = [
      'address_name',
      'receiver_name',
      'receiver_phone',
      'full_address',
      'latitude',
      'longitude',
      'note',
      'is_default',
    ].filter((field) => data[field] !== undefined);
    const values = fields.map((field) => {
      if (field === 'is_default') return data[field] ? 1 : 0;
      if (['address_name', 'receiver_name', 'receiver_phone', 'full_address'].includes(field)) {
        return data[field].trim();
      }
      if (field === 'note') return data[field]?.trim() || null;
      return data[field];
    });
    const [result] = await connection.execute(
      `UPDATE addresses
       SET ${fields.map((field) => `\`${field}\` = ?`).join(', ')}
       WHERE address_id = ? AND customer_id = ?`,
      [...values, addressId, customerId]
    );
    return result.affectedRows;
  },

  async delete(addressId, customerId, connection = db) {
    const [result] = await connection.execute(
      'DELETE FROM addresses WHERE address_id = ? AND customer_id = ?',
      [addressId, customerId]
    );
    return result.affectedRows;
  },
};
