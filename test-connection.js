const mysql = require('mysql2');

const db = mysql.createConnection({
  host: '127.0.0.1', // Cloud SQL public IP
  user: 'sqladmin',
  password: 'Slc223311', // Use a secure environment variable for sensitive info
  database: 'fieldaiDB',
  port: 3306,
  connectTimeout: 10000, // 10 seconds timeout
});

//If testing locally, please make sure to add your ip address into the Authorized networks tab.
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