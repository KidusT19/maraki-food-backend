const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('database.sqlite');

async function migrate() {
  console.log("Starting migration...");
  
  db.serialize(async () => {
    // 1. Add restaurant_id column if it doesn't exist
    db.run(`ALTER TABLE users ADD COLUMN restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE SET NULL`, (err) => {
      if (err) {
        if (err.message.includes("duplicate column name")) {
          console.log("Column restaurant_id already exists.");
        } else {
          console.error("Error altering table:", err);
        }
      } else {
        console.log("Added restaurant_id column to users.");
      }
    });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const owners = [
      { name: "Habesha Admin", email: "habesha@shegawfoods.com", role: "restaurant", rest_id: 1 },
      { name: "Addis Admin", email: "addis@shegawfoods.com", role: "restaurant", rest_id: 2 },
      { name: "Sheger Admin", email: "sheger@shegawfoods.com", role: "restaurant", rest_id: 3 }
    ];

    const stmt = db.prepare(`INSERT INTO users (name, email, password, role, restaurant_id) VALUES (?, ?, ?, ?, ?)`);
    
    owners.forEach(owner => {
      stmt.run(owner.name, owner.email, hashedPassword, owner.role, owner.rest_id, (err) => {
        if (err) {
          if (err.message.includes("UNIQUE constraint failed")) {
            console.log(`User ${owner.email} already exists.`);
          } else {
            console.error(`Error inserting ${owner.email}:`, err);
          }
        } else {
          console.log(`Inserted user ${owner.email} for restaurant ${owner.rest_id}.`);
        }
      });
    });

    stmt.finalize(() => {
      console.log("Migration complete.");
    });
  });
}

migrate();
