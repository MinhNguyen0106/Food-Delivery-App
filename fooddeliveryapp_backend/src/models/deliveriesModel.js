const db = require('../common/db');
const deliveriesModel = {
  getAll: (cb) => db.query('SELECT * FROM `deliveries`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `deliveries` WHERE `delivery_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `deliveries` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `deliveries` SET ? WHERE `delivery_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `deliveries` WHERE `delivery_id` = ?', [id], cb)
};
module.exports = deliveriesModel;
