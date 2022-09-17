let mysql = require("mysql");

require("dotenv").config({ path: "./.env" });
let host = process.env.HOST;
let user = process.env.DB_USER;
let password = process.env.DB_PASSWORD;
let database = process.env.DATABASE;
let port = process.env.MYSQL_PORT;

const connection = mysql.createPool({
    host: host || "localhost",
    user: user || "root",
    password: password || "root",
    database: database || "payrill",
    connectionLimit: 100,
    port: port || '/var/run/mysqld/mysqld.sock'  // hack
});

connection.getConnection((err) => {
    if (err) return console.log(err);
    console.log('DB CONNECTED');
});

module.exports = connection;