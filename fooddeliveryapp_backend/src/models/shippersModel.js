const db = require('../common/db');
const shippersModel = {
  getAll: (cb) => db.query('SELECT * FROM `shippers`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `shippers` WHERE `shipper_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `shippers` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `shippers` SET ? WHERE `shipper_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `shippers` WHERE `shipper_id` = ?', [id], cb)
};
module.exports = shippersModel;
