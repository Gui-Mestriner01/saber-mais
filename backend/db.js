const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'saber_mais',
});

connection.connect((err) => {
  if (err) throw err;
  console.log(' MySQL conectado!');
});

module.exports = connection;