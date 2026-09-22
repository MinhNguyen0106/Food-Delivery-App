const db = require('../common/db');
const customer_profilesModel = {
  getAll: (cb) => db.query('SELECT * FROM `customer_profiles`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `customer_profiles` WHERE `profile_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `customer_profiles` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `customer_profiles` SET ? WHERE `profile_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `customer_profiles` WHERE `profile_id` = ?', [id], cb)
};
module.exports = customer_profilesModel;
