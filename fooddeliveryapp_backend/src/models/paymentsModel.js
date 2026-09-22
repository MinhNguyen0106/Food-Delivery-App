const db = require('../common/db');
const paymentsModel = {
  getAll: (cb) => db.query('SELECT * FROM `payments`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `payments` WHERE `payment_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `payments` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `payments` SET ? WHERE `payment_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `payments` WHERE `payment_id` = ?', [id], cb)
};
module.exports = paymentsModel;
