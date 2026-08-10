const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://maraki_db_user:8QPSoOBdRMMb3PMLITA1r4ciLZYYf4iw@dpg-d9so0kifngtc73fnbtlg-a.ohio-postgres.render.com/maraki_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await pool.query('ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_available INTEGER DEFAULT 1');
    console.log('Column added successfully!');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
