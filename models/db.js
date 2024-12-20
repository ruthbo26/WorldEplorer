const { Pool } = require('pg');

// Database connection pool
const pool = new Pool({
    user: 'postgres',       
    host: 'localhost',      
    database: 'travel_app', 
    password: 'ebunola',   
    port: 5432,             
});

// Export the connection pool for use elsewhere
module.exports = pool;

