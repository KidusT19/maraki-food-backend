const pool = require('./db');

async function migrate() {
  try {
    console.log('Starting phone verification migration...');

    // 1. Add columns to users table
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS phone_number VARCHAR(255),
      ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN DEFAULT false;
    `);
    console.log('Added phone_number and is_phone_verified to users table.');

    // 2. Create otp_codes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        phone_number VARCHAR(255) NOT NULL,
        code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created otp_codes table.');

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

module.exports = migrate;
