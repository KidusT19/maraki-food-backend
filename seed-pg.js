const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://maraki_db_user:8QPSoOBdRMMb3PMLITA1r4ciLZYYf4iw@dpg-d9so0kifngtc73fnbtlg-a.ohio-postgres.render.com/maraki_db';

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function seed() {
  try {
    console.log('Connecting to remote PostgreSQL...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    
    console.log('Running schema and mock data insertion...');
    await pool.query(schema);
    
    console.log('Successfully seeded database!');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    pool.end();
  }
}

seed();
