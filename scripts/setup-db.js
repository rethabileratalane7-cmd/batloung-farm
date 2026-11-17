/**
 * Creates the schema and loads seed data using the credentials in .env.
 *   npm run db:setup
 * Works with a local MySQL or a hosted one (DATABASE_URL / DB_* + DB_SSL).
 * Set SKIP_CREATE_DB=true on hosts where CREATE DATABASE is not allowed.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { buildConfig } = require('../src/config/dbConfig');

async function main() {
  // Hosted MySQL (DATABASE_URL, or SKIP_CREATE_DB=true) already has its database;
  // local MySQL needs CREATE DATABASE, so connect without selecting one.
  const skip = process.env.SKIP_CREATE_DB === 'true' || !!process.env.DATABASE_URL;
  const opts = { ...buildConfig({ withDatabase: skip }), multipleStatements: true };

  const conn = await mysql.createConnection(opts);
  try {
    let schema = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');
    if (skip) schema = schema.replace(/^\s*(CREATE DATABASE|USE)\b[^;]*;/gim, '');
    console.log('Creating tables...');
    await conn.query(schema);
    console.log('Loading sample data...');
    let seed = fs.readFileSync(path.join(__dirname, '..', 'database', 'seed.sql'), 'utf8');
    if (skip) seed = seed.replace(/^\s*USE\b[^;]*;/gim, '');
    await conn.query(seed);
    console.log('Done. Database is ready.');
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error('Setup failed:', e.code || '', e.message); process.exit(1); });
