const db = require('./db');

async function migrateTracking() {
    try {
        console.log('Running tracking migration...');

        // Add latitude and longitude to restaurants
        await db.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8)`);
        await db.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8)`);

        // Add delivery_lat, delivery_lng to orders
        await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat DECIMAL(10,8)`);
        await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng DECIMAL(11,8)`);
        
        // Add driver_lat, driver_lng to users
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS driver_lat DECIMAL(10,8)`);
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS driver_lng DECIMAL(11,8)`);

        console.log('Tracking migration completed successfully.');
    } catch (error) {
        console.error('Error running tracking migration:', error);
    }
}

module.exports = migrateTracking;
