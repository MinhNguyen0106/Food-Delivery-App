const mysql = require("mysql2");
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "letruong238205",
  database: "food_delivery_app",
});
module.exports = db;
