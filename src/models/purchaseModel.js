const { pool, withTransaction } = require('../config/db');
const AppError = require('../utils/AppError');
const { round2 } = require('../utils/sql');

/**
 * Records a purchase from a supplier inside ONE transaction:
 *   BEGIN -> header -> every item (validate, insert, increase stock) -> total -> COMMIT
 * If any item fails validation, ROLLBACK removes the header, the earlier
 * items and the stock increases, so nothing is half-saved.
 */
exports.record = ({ supplier_id, purchase_date, items }) =>
  withTransaction(async (conn) => {
    const [sup] = await conn.query('SELECT supplier_id FROM suppliers WHERE supplier_id = ?', [supplier_id]);
    if (!sup.length) throw new AppError(404, `Supplier ${supplier_id} not found`, 'SUPPLIER_NOT_FOUND');

    const [header] = await conn.query(
      'INSERT INTO purchases (supplier_id, purchase_date, total_amount) VALUES (?, COALESCE(?, CURRENT_DATE), 0)',
      [supplier_id, purchase_date || null]
    );
    const purchaseId = header.insertId;

    let total = 0;
    for (const [i, item] of items.entries()) {
      const [fruit] = await conn.query('SELECT fruit_id, fruit_name, status FROM fruits WHERE fruit_id = ?', [item.fruit_id]);
      if (!fruit.length) {
        throw new AppError(404, `Item ${i + 1}: fruit ${item.fruit_id} not found. Purchase rejected, nothing was saved.`, 'FRUIT_NOT_FOUND');
      }
      if (fruit[0].status !== 'ACTIVE') {
        throw new AppError(400, `Item ${i + 1}: ${fruit[0].fruit_name} is inactive. Purchase rejected, nothing was saved.`, 'FRUIT_INACTIVE');
      }

      await conn.query(
        `INSERT INTO purchase_details (purchase_id, fruit_id, quantity, unit_cost, packaging_size)
         VALUES (?, ?, ?, ?, ?)`,
        [purchaseId, item.fruit_id, item.quantity, item.unit_cost, item.packaging_size]
      );
      // Increase stock for this fruit AND packaging size
      await conn.query(
        `INSERT INTO stock (fruit_id, packaging_size, available_quantity) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE available_quantity = available_quantity + ?`,
        [item.fruit_id, item.packaging_size, item.quantity, item.quantity]
      );
      total += item.quantity * item.unit_cost;
    }

    total = round2(total); // calculated automatically, never typed in by the admin
    await conn.query('UPDATE purchases SET total_amount = ? WHERE purchase_id = ?', [total, purchaseId]);
    return { purchase_id: purchaseId, total_amount: total };
  });

exports.findAll = async (limit = 100) =>
  (await pool.query(
    `SELECT p.purchase_id, p.supplier_id, s.business_name, s.province, p.purchase_date, p.total_amount,
            (SELECT COALESCE(SUM(quantity), 0) FROM purchase_details d WHERE d.purchase_id = p.purchase_id) AS total_boxes
     FROM purchases p JOIN suppliers s ON s.supplier_id = p.supplier_id
     ORDER BY p.purchase_date DESC, p.purchase_id DESC LIMIT ?`,
    [limit]
  ))[0];

exports.findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT p.purchase_id, p.supplier_id, s.business_name, s.province, p.purchase_date, p.total_amount
     FROM purchases p JOIN suppliers s ON s.supplier_id = p.supplier_id WHERE p.purchase_id = ?`,
    [id]
  );
  if (!rows[0]) return null;
  const [items] = await pool.query(
    `SELECT d.purchase_detail_id, d.fruit_id, f.fruit_name, d.packaging_size, d.quantity, d.unit_cost,
            (d.quantity * d.unit_cost) AS line_total
     FROM purchase_details d JOIN fruits f ON f.fruit_id = d.fruit_id
     WHERE d.purchase_id = ? ORDER BY d.purchase_detail_id`,
    [id]
  );
  return { ...rows[0], items };
};
