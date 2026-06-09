const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  client_encoding: 'UTF8'
});

pool.on('connect', (client) => {
  console.log('✅ Подключено к PostgreSQL с UTF-8');
});

module.exports = pool;