const db = require('../common/db');
const customersModel = {
  getAll: (cb) => db.query('SELECT * FROM `customers`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `customers` WHERE `customer_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `customers` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `customers` SET ? WHERE `customer_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `customers` WHERE `customer_id` = ?', [id], cb)
};
module.exports = customersModel;
