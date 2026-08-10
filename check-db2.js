const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://maraki_db_user:8QPSoOBdRMMb3PMLITA1r4ciLZYYf4iw@dpg-d9so0kifngtc73fnbtlg-a.ohio-postgres.render.com/maraki_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query('SELECT id, name, price, image_url FROM menu_items');
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
