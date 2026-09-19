const mysql = require("mysql2/promise");
const {database} = require("./env");

const pool = mysql.createPool({
  ...database,
  waitForConnections: true,
  connectionLimit: database.connectionLimit,
  queueLimit: 0,
});

module.exports = pool;
