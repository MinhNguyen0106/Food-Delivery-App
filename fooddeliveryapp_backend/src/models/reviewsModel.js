const db = require('../common/db');
const reviewsModel = {
  getAll: (cb) => db.query('SELECT * FROM `reviews`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `reviews` WHERE `review_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `reviews` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `reviews` SET ? WHERE `review_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `reviews` WHERE `review_id` = ?', [id], cb)
};
module.exports = reviewsModel;
