const { pool, withTransaction } = require('../config/db');
const AppError = require('../utils/AppError');
const { round2 } = require('../utils/sql');
const { statusFor } = require('./saleModel');

/** Adds a payment to ONE sale (cash or mobile money) and updates its status. */
exports.addToSale = (saleId, { amount, method, reference }) =>
  withTransaction(async (conn) => {
    const [rows] = await conn.query(
      'SELECT sale_id, total_amount, amount_paid FROM sales WHERE sale_id = ? FOR UPDATE',
      [saleId]
    );
    if (!rows.length) throw new AppError(404, `Sale ${saleId} not found`, 'SALE_NOT_FOUND');

    const outstanding = round2(rows[0].total_amount - rows[0].amount_paid);
    if (outstanding <= 0) throw new AppError(400, `Sale ${saleId} is already fully paid.`, 'ALREADY_PAID');
    if (amount > outstanding) {
      throw new AppError(400, `Payment of ${amount} is more than the outstanding balance of ${outstanding}.`, 'OVERPAYMENT');
    }

    await conn.query('INSERT INTO payments (sale_id, amount, method, reference) VALUES (?, ?, ?, ?)',
      [saleId, amount, method, reference || null]);
    const newPaid = round2(rows[0].amount_paid + amount);
    await conn.query('UPDATE sales SET amount_paid = ?, payment_status = ? WHERE sale_id = ?',
      [newPaid, statusFor(newPaid, rows[0].total_amount), saleId]);
    return { sale_id: saleId, amount_paid: newPaid, outstanding: round2(rows[0].total_amount - newPaid), payment_status: statusFor(newPaid, rows[0].total_amount) };
  });

/**
 * Settles a vendor's debt: the amount is applied to the OLDEST unpaid sales first.
 * Rejected if it exceeds the vendor's total outstanding balance.
 */
exports.applyToVendor = (vendorId, { amount, method, reference }) =>
  withTransaction(async (conn) => {
    const [v] = await conn.query('SELECT vendor_id FROM vendors WHERE vendor_id = ?', [vendorId]);
    if (!v.length) throw new AppError(404, `Vendor ${vendorId} not found`, 'VENDOR_NOT_FOUND');

    const [sales] = await conn.query(
      `SELECT sale_id, total_amount, amount_paid FROM sales
       WHERE vendor_id = ? AND payment_status <> 'PAID'
       ORDER BY sale_date, sale_id FOR UPDATE`,
      [vendorId]
    );
    const totalOwed = round2(sales.reduce((s, r) => s + (r.total_amount - r.amount_paid), 0));
    if (totalOwed <= 0) throw new AppError(400, 'This vendor has no outstanding balance.', 'NOTHING_OWED');
    if (amount > totalOwed) {
      throw new AppError(400, `Payment of ${amount} is more than the vendor's outstanding balance of ${totalOwed}.`, 'OVERPAYMENT');
    }

    let remaining = amount;
    const allocations = [];
    for (const s of sales) {
      if (remaining <= 0) break;
      const owed = round2(s.total_amount - s.amount_paid);
      const pay = round2(Math.min(owed, remaining));
      const newPaid = round2(s.amount_paid + pay);
      await conn.query('INSERT INTO payments (sale_id, amount, method, reference) VALUES (?, ?, ?, ?)',
        [s.sale_id, pay, method, reference || null]);
      await conn.query('UPDATE sales SET amount_paid = ?, payment_status = ? WHERE sale_id = ?',
        [newPaid, statusFor(newPaid, s.total_amount), s.sale_id]);
      allocations.push({ sale_id: s.sale_id, applied: pay, payment_status: statusFor(newPaid, s.total_amount) });
      remaining = round2(remaining - pay);
    }
    return { vendor_id: vendorId, amount_received: amount, remaining_balance: round2(totalOwed - amount), allocations };
  });

exports.findBySale = async (saleId) =>
  (await pool.query('SELECT payment_id, sale_id, amount, method, reference, paid_at FROM payments WHERE sale_id = ? ORDER BY paid_at', [saleId]))[0];
