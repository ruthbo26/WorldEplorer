const pool = require('./models/db');

async function testConnection() {
    try {
        const res = await pool.query('SELECT NOW()'); // A simple query to check the connection
        console.log('Database connected successfully at:', res.rows[0].now);
    } catch (err) {
        console.error('Database connection error:', err.message);
    } finally {
        pool.end(); // Closes the database connection
    }
}

testConnection();
