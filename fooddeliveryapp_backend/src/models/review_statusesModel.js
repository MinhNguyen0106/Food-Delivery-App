const db = require('../common/db');
const review_statusesModel = {
  getAll: (cb) => db.query('SELECT * FROM `review_statuses`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `review_statuses` WHERE `status_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `review_statuses` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `review_statuses` SET ? WHERE `status_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `review_statuses` WHERE `status_id` = ?', [id], cb)
};
module.exports = review_statusesModel;
