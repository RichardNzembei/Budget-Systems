const mysql = require('mysql2/promise');
require('dotenv').config();
console.log('DEBUG: DB_USER from env     =', process.env.DB_USER);
console.log('DEBUG: DB_PASSWORD from env =', process.env.DB_PASSWORD ? '****** (hidden)' : 'NOT SET');
console.log('DEBUG: DB_NAME from env     =', process.env.DB_NAME);
console.log('DEBUG: dotenv loaded?       =', !!process.env.DB_HOST);
const pool = mysql.createPool({
    host: 'localhost',
    user: process.env.DB_USER || 'budgethair_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'budgethair',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test connection
pool.getConnection()
    .then(connection => {
        console.log('✅ MySQL Connected Successfully');
        connection.release();
    })
    .catch(err => {
        console.error('❌ MySQL Connection Error:', err.message);
        process.exit(1);
    });

module.exports = pool;