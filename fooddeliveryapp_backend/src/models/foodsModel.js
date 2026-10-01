const db = require('../common/db');
const foodsModel = {
  getAll: (cb) => db.query('SELECT * FROM `foods`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `foods` WHERE `food_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `foods` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `foods` SET ? WHERE `food_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `foods` WHERE `food_id` = ?', [id], cb)
};
module.exports = foodsModel;
