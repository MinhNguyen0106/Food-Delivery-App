const db = require('../common/db');
const cartsModel = {
  getAll: (cb) => db.query('SELECT * FROM `carts`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `carts` WHERE `cart_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `carts` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `carts` SET ? WHERE `cart_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `carts` WHERE `cart_id` = ?', [id], cb)
};
module.exports = cartsModel;
