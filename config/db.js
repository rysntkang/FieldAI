const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

let db;
if (process.env.INSTANCE_UNIX_SOCKET){
    db = mysql.createPool({
        socketPath: process.env.INSTANCE_UNIX_SOCKET,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        waitForConnections: true,
        maxIdle: 10, // max idle connections, the default value is the same as connectionLimit
        idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
    });
}
else{
    db = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        waitForConnections: true,
        maxIdle: 10, // max idle connections, the default value is the same as connectionLimit
        idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
    });
}

module.exports = db;
