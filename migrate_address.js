const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run("ALTER TABLE orders ADD COLUMN delivery_address TEXT", (err) => {
    if (err) console.log("Note: delivery_address may already exist", err.message);
    else console.log("Added delivery_address to orders.");
  });
  
  db.run("ALTER TABLE orders ADD COLUMN customer_phone VARCHAR(20)", (err) => {
    if (err) console.log("Note: customer_phone may already exist", err.message);
    else console.log("Added customer_phone to orders.");
  });
});

db.close();
console.log("Migration finished.");
