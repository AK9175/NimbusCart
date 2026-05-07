require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function migrate() {
  const sql = fs.readFileSync(
    path.join(__dirname, '../../db/migrations/001_init.sql'),
    'utf8'
  );
  try {
    await pool.query(sql);
    console.log('Catalog migration complete.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await pool.end();
  }
}

migrate();
