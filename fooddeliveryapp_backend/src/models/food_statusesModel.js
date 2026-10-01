const db = require('../common/db');
const food_statusesModel = {
  getAll: (cb) => db.query('SELECT * FROM `food_statuses`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `food_statuses` WHERE `status_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `food_statuses` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `food_statuses` SET ? WHERE `status_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `food_statuses` WHERE `status_id` = ?', [id], cb)
};
module.exports = food_statusesModel;
