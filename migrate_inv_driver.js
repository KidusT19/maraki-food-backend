const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log("Starting migration for Inventory and Drivers...");

db.serialize(() => {
  // 1. Add is_available to menu_items
  db.run("ALTER TABLE menu_items ADD COLUMN is_available BOOLEAN DEFAULT 1;", (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log("Column 'is_available' already exists on menu_items.");
      } else {
        console.error("Error adding is_available to menu_items:", err.message);
      }
    } else {
      console.log("Added 'is_available' to menu_items.");
    }
  });

  // 2. Add driver_id to orders
  db.run("ALTER TABLE orders ADD COLUMN driver_id INTEGER REFERENCES users(id) ON DELETE SET NULL;", (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log("Column 'driver_id' already exists on orders.");
      } else {
        console.error("Error adding driver_id to orders:", err.message);
      }
    } else {
      console.log("Added 'driver_id' to orders.");
    }
  });
});

db.close((err) => {
  if (err) {
    console.error("Error closing database:", err.message);
  } else {
    console.log("Migration completed successfully!");
  }
});
