const db = require('../common/db');
const user_rolesModel = {
  getAll: (cb) => db.query('SELECT * FROM `user_roles`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `user_roles` WHERE `role_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `user_roles` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `user_roles` SET ? WHERE `role_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `user_roles` WHERE `role_id` = ?', [id], cb)
};
module.exports = user_rolesModel;
