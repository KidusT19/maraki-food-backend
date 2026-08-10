const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://maraki_db_user:8QPSoOBdRMMb3PMLITA1r4ciLZYYf4iw@dpg-d9so0kifngtc73fnbtlg-a.ohio-postgres.render.com/maraki_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query("UPDATE restaurants SET name = 'ማሚ ቁርስ ቤት', description = '' WHERE id = 1 RETURNING *");
    console.log(res.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
