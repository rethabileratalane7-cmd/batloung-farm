const { pool, withTransaction } = require('../config/db');
const AppError = require('../utils/AppError');
const { round2 } = require('../utils/sql');

const statusFor = (paid, total) => (paid >= total ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID');

/** Merges repeated fruit+size lines and sorts them (consistent lock order = no deadlocks). */
function aggregate(items) {
  const map = new Map();
  for (const it of items) {
    const key = `${it.fruit_id}-${it.packaging_size}`;
    const existing = map.get(key);
    if (existing) existing.quantity += it.quantity;
    else map.set(key, { ...it });
  }
  return [...map.values()].sort((a, b) => a.fruit_id - b.fruit_id || a.packaging_size.localeCompare(b.packaging_size));
}

/**
 * Records a sale to a vendor inside ONE transaction.
 *  - selling price comes from packaging_prices (the admin never types a total)
 *  - stock rows are locked (SELECT ... FOR UPDATE) and checked per fruit + size
 *  - if ANY line cannot be satisfied the whole sale is rolled back: no sale row,
 *    no sale lines and no stock change
 *  - optional payment: { method: CASH | MOBILE_MONEY | CREDIT, amount }
 */
exports.record = ({ vendor_id, items, payment }) =>
  withTransaction(async (conn) => {
    const [vendor] = await conn.query('SELECT vendor_id FROM vendors WHERE vendor_id = ?', [vendor_id]);
    if (!vendor.length) throw new AppError(404, `Vendor ${vendor_id} not found`, 'VENDOR_NOT_FOUND');

    const [header] = await conn.query(
      "INSERT INTO sales (vendor_id, payment_status, total_amount, amount_paid) VALUES (?, 'UNPAID', 0, 0)",
      [vendor_id]
    );
    const saleId = header.insertId;

    let total = 0;
    for (const item of aggregate(items)) {
      const [fruit] = await conn.query('SELECT fruit_name, status FROM fruits WHERE fruit_id = ?', [item.fruit_id]);
      if (!fruit.length) throw new AppError(404, `Fruit ${item.fruit_id} not found. Sale rejected.`, 'FRUIT_NOT_FOUND');
      if (fruit[0].status !== 'ACTIVE') {
        throw new AppError(400, `${fruit[0].fruit_name} is inactive and cannot be sold. Sale rejected.`, 'FRUIT_INACTIVE');
      }

      const [stockRow] = await conn.query(
        'SELECT available_quantity FROM stock WHERE fruit_id = ? AND packaging_size = ? FOR UPDATE',
        [item.fruit_id, item.packaging_size]
      );
      const available = stockRow.length ? stockRow[0].available_quantity : 0;
      if (item.quantity > available) {
        const sizeTxt = item.packaging_size.toLowerCase();
        const msg = available === 0
          ? `${fruit[0].fruit_name} (${sizeTxt}) is not available: 0 boxes in stock. The whole sale was rejected and no stock was changed.`
          : `Insufficient stock for ${fruit[0].fruit_name} (${sizeTxt}): requested ${item.quantity}, available ${available}. The whole sale was rejected and no stock was changed.`;
        throw new AppError(400, msg, 'INSUFFICIENT_STOCK',
          [{ fruit_id: item.fruit_id, fruit_name: fruit[0].fruit_name, packaging_size: item.packaging_size, requested: item.quantity, available }]);
      }

      const [priceRow] = await conn.query('SELECT selling_price FROM packaging_prices WHERE packaging_size = ?', [item.packaging_size]);
      const unitPrice = priceRow[0].selling_price;

      await conn.query(
        `INSERT INTO sales_details (sale_id, fruit_id, packaging_size, quantity, unit_price)
         VALUES (?, ?, ?, ?, ?)`,
        [saleId, item.fruit_id, item.packaging_size, item.quantity, unitPrice]
      );
      const [upd] = await conn.query(
        `UPDATE stock SET available_quantity = available_quantity - ?
         WHERE fruit_id = ? AND packaging_size = ? AND available_quantity >= ?`,
        [item.quantity, item.fruit_id, item.packaging_size, item.quantity]
      );
      if (upd.affectedRows !== 1) {
        throw new AppError(400, 'Stock changed while processing the sale. Please retry.', 'STOCK_CONFLICT');
      }
      total += item.quantity * unitPrice;
    }

    total = round2(total);
    let paid = 0;
    if (payment && payment.method !== 'CREDIT') {
      paid = payment.amount === undefined ? total : round2(payment.amount);
      if (paid > total) {
        throw new AppError(400, `Payment (${paid}) is more than the sale total (${total}).`, 'OVERPAYMENT');
      }
      if (paid > 0) {
        await conn.query(
          'INSERT INTO payments (sale_id, amount, method, reference) VALUES (?, ?, ?, ?)',
          [saleId, paid, payment.method, payment.reference || null]
        );
      }
    }

    await conn.query(
      'UPDATE sales SET total_amount = ?, amount_paid = ?, payment_status = ? WHERE sale_id = ?',
      [total, paid, statusFor(paid, total), saleId]
    );
    return saleId;
  });

exports.findAll = async ({ vendor_id, status, limit = 100 }) => {
  const where = [];
  const params = [];
  if (vendor_id) { where.push('s.vendor_id = ?'); params.push(vendor_id); }
  if (status) { where.push('s.payment_status = ?'); params.push(status); }
  params.push(limit);
  return (await pool.query(
    `SELECT s.sale_id, s.vendor_id, v.vendor_name, s.sale_date, s.payment_status,
            s.total_amount, s.amount_paid, (s.total_amount - s.amount_paid) AS outstanding,
            (SELECT COALESCE(SUM(quantity), 0) FROM sales_details d WHERE d.sale_id = s.sale_id) AS total_boxes
     FROM sales s JOIN vendors v ON v.vendor_id = s.vendor_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY s.sale_date DESC, s.sale_id DESC LIMIT ?`,
    params
  ))[0];
};

exports.findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT s.sale_id, s.vendor_id, v.vendor_name, v.phone_number, s.sale_date, s.payment_status,
            s.total_amount, s.amount_paid, (s.total_amount - s.amount_paid) AS outstanding
     FROM sales s JOIN vendors v ON v.vendor_id = s.vendor_id WHERE s.sale_id = ?`,
    [id]
  );
  if (!rows[0]) return null;
  const [items] = await pool.query(
    `SELECT d.sales_detail_id, d.fruit_id, f.fruit_name, d.packaging_size, d.quantity, d.unit_price,
            (d.quantity * d.unit_price) AS line_total
     FROM sales_details d JOIN fruits f ON f.fruit_id = d.fruit_id
     WHERE d.sale_id = ? ORDER BY d.sales_detail_id`,
    [id]
  );
  const [payments] = await pool.query(
    'SELECT payment_id, amount, method, reference, paid_at FROM payments WHERE sale_id = ? ORDER BY paid_at, payment_id',
    [id]
  );
  return { ...rows[0], items, payments };
};

exports.statusFor = statusFor;
