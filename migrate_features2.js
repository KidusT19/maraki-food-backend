const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to database.');

    await client.query(`
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_rated INTEGER DEFAULT 0;
    `);
    console.log('Added order_id to reviews and is_rated to orders.');

    console.log('Migration 2 completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

migrate();
