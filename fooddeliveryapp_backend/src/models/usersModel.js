const db = require("../common/db");
const usersModel = {
  getAll: (cb) => db.query("SELECT * FROM `users`", cb),
  getById: (id, cb) =>
    db.query("SELECT * FROM `users` WHERE `user_id` = ?", [id], cb),
  create: (data, cb) => db.query("INSERT INTO `users` SET ?", data, cb),
  update: (id, data, cb) =>
    db.query("UPDATE `users` SET ? WHERE `user_id` = ?", [data, id], cb),
  delete: (id, cb) =>
    db.query("DELETE FROM `users` WHERE `user_id` = ?", [id], cb),
  loginShipper: (email, password, cb) => {
    const query = `
      SELECT 
        u.user_id, 
        u.email, 
        u.role_id, 
        u.status_id,
        s.shipper_id,
        s.full_name,
        s.phone,
        s.status_id AS shipper_status_id
      FROM users u
      LEFT JOIN shippers s ON u.user_id = s.user_id
      WHERE u.email = ? 
        AND u.password_hash = ? 
        AND u.role_id = 3 
        AND u.status_id = 1
    `;
    db.query(query, [email, password], cb);
  },
};
module.exports = usersModel;
