const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://maraki_db_user:8QPSoOBdRMMb3PMLITA1r4ciLZYYf4iw@dpg-d9so0kifngtc73fnbtlg-a.ohio-postgres.render.com/maraki_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE SET NULL');
    
    // Link users to restaurants
    await pool.query('UPDATE users SET restaurant_id = 3 WHERE email = $1', ['sheger@gmail.com']);
    await pool.query('UPDATE users SET restaurant_id = 1 WHERE email = $1', ['habesha@gmail.com']);
    await pool.query('UPDATE users SET restaurant_id = 2 WHERE email = $1', ['addis@gmail.com']);
    
    console.log('Database fixed successfully!');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
