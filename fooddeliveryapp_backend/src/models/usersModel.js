const db = require('../common/db');
const usersModel = {
  getAll: (cb) => db.query('SELECT * FROM `users`', cb),
  getById: (id, cb) => db.query('SELECT * FROM `users` WHERE `user_id` = ?', [id], cb),
  create: (data, cb) => db.query('INSERT INTO `users` SET ?', data, cb),
  update: (id, data, cb) => db.query('UPDATE `users` SET ? WHERE `user_id` = ?', [data, id], cb),
  delete: (id, cb) => db.query('DELETE FROM `users` WHERE `user_id` = ?', [id], cb)
};
module.exports = usersModel;
