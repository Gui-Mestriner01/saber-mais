const mysql = require('mysql2');
require('dotenv').config({ path: require('path').join(__dirname, '.env') }); // acha o .env mesmo rodando de outra pasta

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 3,
  charset: 'utf8mb4',
  queueLimit: 0,
  // Blindagem contra "SQL injection":
  // - só um comando por consulta: ninguém consegue emendar "; DROP TABLE ..."
  multipleStatements: false,
  // - se alguém mandar um objeto no lugar de um texto/número, ele vira texto
  //   em vez de virar pedaço de SQL (truque clássico para pular o login)
  stringifyObjects: true
});

// Teste de conexão que libera o espaço logo em seguida
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Erro ao conectar ao MySQL:', err.message);
  } else {
    console.log('✅ MySQL conectado!');
    connection.release(); // Devolve a conexão para o pool imediatamente
  }
});

module.exports = db;