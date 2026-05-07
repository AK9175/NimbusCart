require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const migrationsDir = path.join(__dirname, '../../db/migrations');

async function migrate() {
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await pool.query(sql);
      console.log(`Applied: ${file}`);
    } catch (err) {
      // Ignore "already exists" errors from re-running migrations
      if (err.code === '42P07' || err.code === '42710') {
        console.log(`Skipped (already applied): ${file}`);
      } else {
        throw err;
      }
    }
  }
  console.log('Catalog migration complete.');
  await pool.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
