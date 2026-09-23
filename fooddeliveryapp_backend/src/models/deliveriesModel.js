const db = require("../common/db");
const deliveriesModel = {
  getAll: (cb) => db.query("SELECT * FROM `deliveries`", cb),
  getByShipperId: (shipperId, cb) => {
    const query = `
      SELECT 
        d.delivery_id,
        d.order_id,
        d.shipper_id,
        d.status,
        d.created_at,
        o.pickup_address,
        o.delivery_address,
        o.shipping_fee,
        o.total_amount
      FROM deliveries d
      LEFT JOIN orders o ON d.order_id = o.order_id
      WHERE d.shipper_id = ? OR d.shipper_id = (
        SELECT shipper_id FROM shippers WHERE user_id = ? LIMIT 1
      )
    `;
    db.query(query, [shipperId, shipperId], cb);
  },
  create: (data, cb) => db.query("INSERT INTO `deliveries` SET ?", data, cb),
  update: (id, data, cb) =>
    db.query(
      "UPDATE `deliveries` SET ? WHERE `delivery_id` = ?",
      [data, id],
      cb,
    ),
  delete: (id, cb) =>
    db.query("DELETE FROM `deliveries` WHERE `delivery_id` = ?", [id], cb),
};
module.exports = deliveriesModel;
