const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Wrapper to mimic the 'pg' library's API so we don't have to rewrite server.js
module.exports = {
  query: (text, params = []) => {
    return new Promise((resolve, reject) => {
      // Replace PostgreSQL $1, $2 placeholders with SQLite ? placeholders
      const sqliteText = text.replace(/\$\d+/g, '?');
      
      // For SELECT or queries that expect rows back (like RETURNING)
      if (sqliteText.trim().toUpperCase().startsWith('SELECT') || sqliteText.toUpperCase().includes('RETURNING')) {
        db.all(sqliteText, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows: rows || [] });
        });
      } else {
        db.run(sqliteText, params, function (err) {
          if (err) reject(err);
          else resolve({ rows: [{ id: this.lastID }] }); 
        });
      }
    });
  },
  dbInstance: db
};
