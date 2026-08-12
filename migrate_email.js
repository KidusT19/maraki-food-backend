const pool = require('./db');

async function migrateEmail() {
  try {
    console.log("Running Email Verification Migration...");
    // Add is_email_verified to users
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;
    `);

    // Ensure otp_codes table exists (it was created for phone, but we reuse it for email)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Drop the phone_number column if it exists from the previous migration, as it had a NOT NULL constraint
    await pool.query(`
      ALTER TABLE otp_codes DROP COLUMN IF EXISTS phone_number;
    `);
    
    console.log("Email Verification Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

module.exports = migrateEmail;
