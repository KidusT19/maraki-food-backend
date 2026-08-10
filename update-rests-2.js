const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://maraki_db_user:8QPSoOBdRMMb3PMLITA1r4ciLZYYf4iw@dpg-d9so0kifngtc73fnbtlg-a.ohio-postgres.render.com/maraki_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await pool.query("UPDATE restaurants SET name = 'ባርች ቁርስ ቤት', description = '' WHERE id = 2");
    await pool.query("UPDATE restaurants SET name = 'ፍቄ በርገር', description = '' WHERE id = 3");
    const res = await pool.query('SELECT id, name FROM restaurants');
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
