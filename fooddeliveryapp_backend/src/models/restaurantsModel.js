const db = require('../common/db');
const restaurantsModel = {
  getAll: (cb) => db.query('SELECT * FROM `restaurants`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `restaurants` WHERE `restaurant_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `restaurants` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `restaurants` SET ? WHERE `restaurant_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `restaurants` WHERE `restaurant_id` = ?', [id], cb)
};
module.exports = restaurantsModel;
