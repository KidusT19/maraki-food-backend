const pool = require('./db');

async function migratePayments() {
  try {
    console.log("Running Payments Migration...");
    
    // Add payment_method and payment_status to orders
    await pool.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash',
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
    `);

    console.log("Payments Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

module.exports = migratePayments;
