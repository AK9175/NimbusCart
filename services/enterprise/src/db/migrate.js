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
      if (err.code === '42P07' || err.code === '42710') {
        console.log(`Skipped (already applied): ${file}`);
      } else {
        throw err;
      }
    }
  }
  console.log('Migration complete');
  await pool.end();
}

// Retry logic: RDS may not accept connections immediately after CloudFormation
// marks it available. Retry up to 10 times with 6-second delays (up to 60s wait).
async function runWithRetry() {
  const maxAttempts = 10;
  const delayMs = 6000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await migrate();
      return;
    } catch (err) {
      console.error(`Migration attempt ${attempt}/${maxAttempts} failed: ${err.message}`);
      if (attempt === maxAttempts) {
        console.error('All migration attempts exhausted — exiting');
        process.exit(1);
      }
      console.log(`Retrying in ${delayMs / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

runWithRetry();
