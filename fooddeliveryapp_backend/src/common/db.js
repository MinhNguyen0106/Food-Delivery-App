const mysql = require("mysql2");
const { db: dbConfig } = require("../config/env");

const db = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = db;
