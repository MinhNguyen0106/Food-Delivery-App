const db = require('../common/db');
const order_detailsModel = {
  getAll: (cb) => db.query('SELECT * FROM `order_details`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `order_details` WHERE `order_detail_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `order_details` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `order_details` SET ? WHERE `order_detail_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `order_details` WHERE `order_detail_id` = ?', [id], cb)
};
module.exports = order_detailsModel;
