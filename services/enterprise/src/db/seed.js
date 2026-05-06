require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function seed() {
  const sql = fs.readFileSync(
    path.join(__dirname, '../../db/seed.sql'),
    'utf8'
  );
  await pool.query(sql);
  console.log('Seed complete');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
