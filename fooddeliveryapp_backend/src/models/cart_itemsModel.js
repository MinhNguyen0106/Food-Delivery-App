const db = require('../common/db');
const cart_itemsModel = {
  getAll: (cb) => db.query('SELECT * FROM `cart_items`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `cart_items` WHERE `cart_item_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `cart_items` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `cart_items` SET ? WHERE `cart_item_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `cart_items` WHERE `cart_item_id` = ?', [id], cb)
};
module.exports = cart_itemsModel;
