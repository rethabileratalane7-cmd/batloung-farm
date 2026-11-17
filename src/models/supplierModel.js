const { pool } = require('../config/db');
const { updateById } = require('../utils/sql');

exports.findAll = async (province) => {
  const [rows] = province
    ? await pool.query('SELECT * FROM suppliers WHERE province = ? ORDER BY business_name', [province])
    : await pool.query('SELECT * FROM suppliers ORDER BY business_name');
  return rows;
};

exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM suppliers WHERE supplier_id = ?', [id]);
  return rows[0] || null;
};

exports.create = async (d) => {
  const [r] = await pool.query(
    'INSERT INTO suppliers (business_name, contact_person, phone, province, address, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [d.business_name, d.contact_person, d.phone, d.province, d.address, d.latitude ?? null, d.longitude ?? null]
  );
  return r.insertId;
};

/** Supplier plus purchase statistics (for the details view). */
exports.details = async (id) => {
  const supplier = await exports.findById(id);
  if (!supplier) return null;
  const [[stats]] = await pool.query(
    `SELECT COUNT(*) AS purchase_count, COALESCE(SUM(total_amount), 0) AS total_purchased,
            MAX(purchase_date) AS last_purchase_date
     FROM purchases WHERE supplier_id = ?`, [id]);
  return { ...supplier, ...stats };
};

exports.update = (id, data) => updateById(pool, 'suppliers', 'supplier_id', id, data);

exports.countPurchases = async (id) => {
  const [rows] = await pool.query('SELECT COUNT(*) AS n FROM purchases WHERE supplier_id = ?', [id]);
  return rows[0].n;
};

exports.remove = async (id) => {
  const [r] = await pool.query('DELETE FROM suppliers WHERE supplier_id = ?', [id]);
  return r.affectedRows;
};
