const { pool } = require('../config/db');
const { updateById } = require('../utils/sql');

exports.findAll = async () =>
  (await pool.query('SELECT * FROM vendors ORDER BY vendor_name'))[0];

/** Search by name OR phone number (partial, case-insensitive). */
exports.search = async (term) => {
  const like = `%${term.replace(/[%_\\]/g, '\\$&')}%`;
  return (await pool.query(
    'SELECT * FROM vendors WHERE vendor_name LIKE ? OR phone_number LIKE ? ORDER BY vendor_name',
    [like, like]
  ))[0];
};

exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM vendors WHERE vendor_id = ?', [id]);
  return rows[0] || null;
};

exports.create = async (d) => {
  const [r] = await pool.query(
    'INSERT INTO vendors (vendor_name, phone_number, location, registration_date, latitude, longitude) VALUES (?, ?, ?, COALESCE(?, CURRENT_DATE), ?, ?)',
    [d.vendor_name, d.phone_number, d.location, d.registration_date || null, d.latitude ?? null, d.longitude ?? null]
  );
  return r.insertId;
};

exports.update = (id, data) => updateById(pool, 'vendors', 'vendor_id', id, data);

const BALANCE_SQL = `
  SELECT v.vendor_id, v.vendor_name, v.phone_number, v.location,
         COUNT(s.sale_id)                                  AS sales_count,
         COALESCE(SUM(s.total_amount), 0)                  AS total_billed,
         COALESCE(SUM(s.amount_paid), 0)                   AS total_paid,
         COALESCE(SUM(s.total_amount - s.amount_paid), 0)  AS outstanding_balance
  FROM vendors v
  LEFT JOIN sales s ON s.vendor_id = v.vendor_id`;
const GROUP = 'GROUP BY v.vendor_id, v.vendor_name, v.phone_number, v.location';

/** Outstanding balance of every vendor (highest debt first). */
exports.balances = async () =>
  (await pool.query(`${BALANCE_SQL} ${GROUP} ORDER BY outstanding_balance DESC, v.vendor_name`))[0];

/** One vendor's balance plus the list of sales still owing. */
exports.balanceFor = async (id) => {
  const [rows] = await pool.query(`${BALANCE_SQL} WHERE v.vendor_id = ? ${GROUP}`, [id]);
  if (!rows[0]) return null;
  const [owing] = await pool.query(
    `SELECT sale_id, sale_date, payment_status, total_amount, amount_paid,
            (total_amount - amount_paid) AS outstanding
     FROM sales WHERE vendor_id = ? AND payment_status <> 'PAID'
     ORDER BY sale_date, sale_id`,
    [id]
  );
  return { ...rows[0], unpaid_sales: owing };
};
