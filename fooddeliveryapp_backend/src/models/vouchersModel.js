const db = require('../common/db');
const vouchersModel = {
  getAll: (cb) => db.query('SELECT * FROM `vouchers`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `vouchers` WHERE `voucher_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `vouchers` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `vouchers` SET ? WHERE `voucher_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `vouchers` WHERE `voucher_id` = ?', [id], cb)
};
module.exports = vouchersModel;
