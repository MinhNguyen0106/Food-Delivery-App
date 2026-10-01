const db = require('../common/db');
const order_status_historyModel = {
  getAll: (cb) => db.query('SELECT * FROM `order_status_history`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `order_status_history` WHERE `history_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `order_status_history` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `order_status_history` SET ? WHERE `history_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `order_status_history` WHERE `history_id` = ?', [id], cb)
};
module.exports = order_status_historyModel;
