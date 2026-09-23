const db = require("../common/db");
const ordersModel = {
  // Lấy tất cả danh sách đơn hàng kèm Tên cửa hàng, Địa chỉ lấy hàng và Địa chỉ giao hàng
  getAll: (cb) => {
    const query = `
      SELECT 
        o.order_id,
        o.order_code,
        o.subtotal,
        o.delivery_fee,
        o.discount,
        o.total_amount,
        o.status_id,
        o.note,
        o.created_at,
        r.restaurant_id,
        r.name AS restaurant_name,
        r.address AS pickup_address,
        r.phone AS restaurant_phone,
        a.address_id,
        a.receiver_name,
        a.receiver_phone,
        a.full_address AS delivery_address
      FROM orders o
      LEFT JOIN restaurants r ON o.restaurant_id = r.restaurant_id
      LEFT JOIN addresses a ON o.address_id = a.address_id
      ORDER BY o.created_at DESC
    `;

    db.query(query, cb);
  },

  // Lấy chi tiết 1 đơn hàng theo order_id
  getById: (id, cb) => {
    const query = `
      SELECT 
        o.*,
        r.name AS restaurant_name,
        r.address AS pickup_address,
        r.phone AS restaurant_phone,
        a.receiver_name,
        a.receiver_phone,
        a.full_address AS delivery_address
      FROM orders o
      LEFT JOIN restaurants r ON o.restaurant_id = r.restaurant_id
      LEFT JOIN addresses a ON o.address_id = a.address_id
      WHERE o.order_id = ?
    `;
    db.query(query, [id], cb);
  },
  create: (data, cb) => db.query("INSERT INTO `orders` SET ?", data, cb),
  update: (id, data, cb) =>
    db.query("UPDATE `orders` SET ? WHERE `order_id` = ?", [data, id], cb),
  delete: (id, cb) =>
    db.query("DELETE FROM `orders` WHERE `order_id` = ?", [id], cb),
};
module.exports = ordersModel;
