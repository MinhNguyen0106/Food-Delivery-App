const mysql = require("mysql2");
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Huong4536@",
  database: "food_delivery_app",
});
module.exports = db;
