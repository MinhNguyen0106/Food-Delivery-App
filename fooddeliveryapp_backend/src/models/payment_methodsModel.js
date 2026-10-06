const db = require('../common/db');
const payment_methodsModel = {
  getAll: (cb) => db.query('SELECT * FROM `payment_methods`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `payment_methods` WHERE `method_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `payment_methods` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `payment_methods` SET ? WHERE `method_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `payment_methods` WHERE `method_id` = ?', [id], cb)
};
module.exports = payment_methodsModel;
