const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('database.sqlite');

async function migrate() {
  console.log("Starting reviews migration...");
  
  db.serialize(() => {
    // 1. Create reviews table
    db.run(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error("Error creating reviews table:", err);
      else console.log("Created reviews table.");
    });

    // 2. Add is_rated column to orders
    db.run(`ALTER TABLE orders ADD COLUMN is_rated BOOLEAN DEFAULT 0`, (err) => {
      if (err) {
        if (err.message.includes("duplicate column name")) {
          console.log("Column is_rated already exists.");
        } else {
          console.error("Error altering orders table:", err);
        }
      } else {
        console.log("Added is_rated column to orders.");
      }
    });
  });
}

migrate();
