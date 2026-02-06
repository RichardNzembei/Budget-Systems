// test-login.js
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('SUCCESS: Connected with password from .env!');
        const [rows] = await connection.query('SELECT 1');
        console.log('Test query result:', rows);
        await connection.end();
    } catch (err) {
        console.error('LOGIN FAILED:', err.message);
        console.error('Used these credentials:');
        console.error('user:', process.env.DB_USER);
        console.error('password length:', process.env.DB_PASSWORD?.length || 'missing');
        console.error('database:', process.env.DB_NAME);
    }
})();