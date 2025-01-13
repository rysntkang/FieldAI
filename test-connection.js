const mysql = require('mysql2');

const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'sqladmin',
  password: 'Slc223311',
  database: 'fieldaidb',
  port: 3306,
  connectTimeout: 10000, 
});

db.connect(err => {
  if (err) {
    console.error('Connection error:', err.message);
    if (err.code === 'ETIMEDOUT') {
      console.error('Connection timed out. Verify network settings and access permissions.');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('Connection refused. Check if the database is running and accessible.');
    }
  } else {
    console.log('Connected to MySQL database.');
  }
});