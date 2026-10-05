const db = require('../common/db');
const payment_statusesModel = {
  getAll: (cb) => db.query('SELECT * FROM `payment_statuses`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `payment_statuses` WHERE `status_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `payment_statuses` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `payment_statuses` SET ? WHERE `status_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `payment_statuses` WHERE `status_id` = ?', [id], cb)
};
module.exports = payment_statusesModel;
