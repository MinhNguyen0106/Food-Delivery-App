const db = require('../common/db');
const restaurant_statusesModel = {
  getAll: (cb) => db.query('SELECT * FROM `restaurant_statuses`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `restaurant_statuses` WHERE `status_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `restaurant_statuses` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `restaurant_statuses` SET ? WHERE `status_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `restaurant_statuses` WHERE `status_id` = ?', [id], cb)
};
module.exports = restaurant_statusesModel;
