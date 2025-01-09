const mysql = require('mysql2');
const config = require('./config');

const dbConfig = process.env.INSTANCE_UNIX_SOCKET
  ? {   //Cloud Config for Google Cloud
      socketPath: process.env.INSTANCE_UNIX_SOCKET,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    }
  : {   //Local Configuration
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    };

const db = mysql.createConnection({
  ...dbConfig,
  connectTimeout: 10000
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.message);
    return;
  }
  console.log('Connected to MySQL database.');
});

module.exports = db;