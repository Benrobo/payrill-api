require("dotenv").config({ path: "./.env" });

let host = process.env.HOST;
let user = process.env.DB_USER;
let password = process.env.DB_PASSWORD;
let database = process.env.DATABASE;

let mysql = require("mysql");
const connection = mysql.createConnection({
    host: host || "localhost",
    user: user || "root",
    password: password || "root",
    database: database || "payrill",
    port: '/var/run/mysqld/mysqld.sock'  // hack
});

connection.connect();

module.exports = connection;