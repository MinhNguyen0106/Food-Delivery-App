const db = require('../common/db');
const shipper_statusesModel = {
  getAll: (cb) => db.query('SELECT * FROM `shipper_statuses`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `shipper_statuses` WHERE `status_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `shipper_statuses` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `shipper_statuses` SET ? WHERE `status_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `shipper_statuses` WHERE `status_id` = ?', [id], cb)
};
module.exports = shipper_statusesModel;
