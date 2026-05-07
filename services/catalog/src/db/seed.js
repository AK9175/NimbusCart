require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function seed() {
  const sql = fs.readFileSync(
    path.join(__dirname, '../../db/seed.sql'),
    'utf8'
  );
  try {
    await pool.query(sql);
    console.log('Catalog seed complete.');
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await pool.end();
  }
}

seed();
