/**
 * Database configuration. Credentials come from environment variables (.env),
 * never from the source code. The pool never throws at start-up: if MySQL is
 * down the API keeps running and answers with a clear 503 message.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { buildConfig } = require('./dbConfig');

const poolOptions = {
  ...buildConfig(),
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  connectTimeout: 15000,
  decimalNumbers: true, // DECIMAL columns come back as JS numbers
  dateStrings: true,    // DATE/DATETIME come back as plain strings (no timezone shifts)
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  timezone: 'Z',
};

const pool = mysql.createPool(poolOptions);

/** Checks the database is reachable. Returns { ok, message } and never throws. */
async function testConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.ping();
    return { ok: true, message: 'MySQL connection established' };
  } catch (err) {
    return { ok: false, message: `MySQL connection failed: ${err.code || err.message}` };
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Runs `work(conn)` inside a MySQL transaction:
 * BEGIN -> work -> COMMIT, or ROLLBACK if anything throws.
 */
async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.query('BEGIN');
    const result = await work(conn);
    await conn.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await conn.query('ROLLBACK');
      console.warn(`[transaction] ROLLBACK executed: ${err.message}`);
    } catch (rollbackErr) {
      console.error('[transaction] ROLLBACK failed:', rollbackErr.message);
    }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, testConnection, withTransaction };
