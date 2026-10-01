const db = require('../common/db');
const user_statusesModel = {
  getAll: (cb) => db.query('SELECT * FROM `user_statuses`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `user_statuses` WHERE `status_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `user_statuses` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `user_statuses` SET ? WHERE `status_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `user_statuses` WHERE `status_id` = ?', [id], cb)
};
module.exports = user_statusesModel;
