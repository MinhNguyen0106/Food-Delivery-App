const db = require('../common/db');
const voucher_statusesModel = {
  getAll: (cb) => db.query('SELECT * FROM `voucher_statuses`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `voucher_statuses` WHERE `status_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `voucher_statuses` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `voucher_statuses` SET ? WHERE `status_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `voucher_statuses` WHERE `status_id` = ?', [id], cb)
};
module.exports = voucher_statusesModel;
