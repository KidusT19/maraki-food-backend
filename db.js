const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect()
  .then(() => console.log('Connected to the PostgreSQL database.'))
  .catch(err => console.error('Error opening database', err.stack));

module.exports = {
  query: (text, params) => pool.query(text, params),
  dbInstance: pool
};
