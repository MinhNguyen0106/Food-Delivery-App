const db = require('../common/db');
const addressesModel = {
  getAll: (cb) => db.query('SELECT * FROM `addresses`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `addresses` WHERE `address_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `addresses` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `addresses` SET ? WHERE `address_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `addresses` WHERE `address_id` = ?', [id], cb)
};
module.exports = addressesModel;
