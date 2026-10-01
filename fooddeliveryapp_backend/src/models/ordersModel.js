const db = require('../common/db');
const ordersModel = {
  getAll: (cb) => db.query('SELECT * FROM `orders`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `orders` WHERE `order_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `orders` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `orders` SET ? WHERE `order_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `orders` WHERE `order_id` = ?', [id], cb)
};
module.exports = ordersModel;
