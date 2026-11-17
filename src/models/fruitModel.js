const { pool, withTransaction } = require('../config/db');
const { updateById } = require('../utils/sql');
const { SIZES } = require('../config/constants');

exports.findAll = async (status) => {
  const [rows] = status
    ? await pool.query('SELECT * FROM fruits WHERE status = ? ORDER BY fruit_name', [status])
    : await pool.query('SELECT * FROM fruits ORDER BY fruit_name');
  return rows;
};

exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM fruits WHERE fruit_id = ?', [id]);
  return rows[0] || null;
};

/** Creates the fruit AND its three stock rows (small/medium/large) atomically. */
exports.create = (d) =>
  withTransaction(async (conn) => {
    const [r] = await conn.query(
      'INSERT INTO fruits (fruit_name, description, status) VALUES (?, ?, ?)',
      [d.fruit_name, d.description || null, d.status || 'ACTIVE']
    );
    for (const size of SIZES) {
      await conn.query(
        'INSERT INTO stock (fruit_id, packaging_size, available_quantity) VALUES (?, ?, 0)',
        [r.insertId, size]
      );
    }
    return r.insertId;
  });

exports.update = (id, data) => updateById(pool, 'fruits', 'fruit_id', id, data);
