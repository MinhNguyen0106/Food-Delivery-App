const db = require('../common/db');
const adminsModel = {
  getAll: (cb) => db.query('SELECT * FROM `admins`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `admins` WHERE `admin_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `admins` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `admins` SET ? WHERE `admin_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `admins` WHERE `admin_id` = ?', [id], cb)
};
module.exports = adminsModel;
