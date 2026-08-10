const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
    process.exit(1);
  }
});

console.log('Running migration: add reset token columns to users table...');

db.serialize(() => {
  db.run(`ALTER TABLE users ADD COLUMN reset_token VARCHAR(255)`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('Column reset_token already exists.');
      } else {
        console.error('Error adding reset_token column:', err.message);
      }
    } else {
      console.log('Added reset_token column successfully.');
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN reset_token_expires BIGINT`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('Column reset_token_expires already exists.');
      } else {
        console.error('Error adding reset_token_expires column:', err.message);
      }
    } else {
      console.log('Added reset_token_expires column successfully.');
    }
  });
});

db.close((err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Migration finished.');
});
