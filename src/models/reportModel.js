const { pool } = require('../config/db');

/** 1. Five most frequently sold fruits (by boxes). */
exports.topFruits = async () =>
  (await pool.query(
    `SELECT f.fruit_id, f.fruit_name,
            SUM(sd.quantity)                 AS total_boxes_sold,
            SUM(sd.quantity * sd.unit_price) AS revenue
     FROM sales_details sd
     JOIN fruits f ON f.fruit_id = sd.fruit_id
     GROUP BY f.fruit_id, f.fruit_name
     ORDER BY total_boxes_sold DESC, f.fruit_name
     LIMIT 5`
  ))[0];

/** 2. Total sales revenue between two dates (inclusive). */
exports.revenueBetween = async (from, to) =>
  (await pool.query(
    `SELECT COUNT(*) AS number_of_sales, COALESCE(SUM(total_amount), 0) AS total_revenue
     FROM sales
     WHERE sale_date >= ? AND sale_date < DATE_ADD(?, INTERVAL 1 DAY)`,
    [from, to]
  ))[0][0];

/** 3. Vendors ranked by boxes purchased (first row = the highest). */
exports.topVendors = async (limit = 5) =>
  (await pool.query(
    `SELECT v.vendor_id, v.vendor_name, v.phone_number,
            SUM(sd.quantity) AS total_boxes_purchased
     FROM vendors v
     JOIN sales s          ON s.vendor_id = v.vendor_id
     JOIN sales_details sd ON sd.sale_id  = s.sale_id
     GROUP BY v.vendor_id, v.vendor_name, v.phone_number
     ORDER BY total_boxes_purchased DESC, v.vendor_id
     LIMIT ?`,
    [limit]
  ))[0];

/** 4. Current stock level per fruit and packaging size. */
exports.stockLevels = async () =>
  (await pool.query(
    `SELECT f.fruit_name, s.packaging_size, s.available_quantity
     FROM stock s JOIN fruits f ON f.fruit_id = s.fruit_id
     ORDER BY f.fruit_name, FIELD(s.packaging_size, 'SMALL', 'MEDIUM', 'LARGE')`
  ))[0];

/** Dashboard numbers. */
exports.summary = async (lowThreshold) => {
  const [[k]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM suppliers)                              AS suppliers,
       (SELECT COUNT(*) FROM vendors)                                AS vendors,
       (SELECT COUNT(*) FROM fruits WHERE status = 'ACTIVE')         AS active_fruits,
       (SELECT COALESCE(SUM(available_quantity), 0) FROM stock)      AS boxes_in_stock,
       (SELECT COALESCE(SUM(total_amount), 0) FROM purchases)        AS total_purchases,
       (SELECT COALESCE(SUM(total_amount), 0) FROM sales)            AS total_sales,
       (SELECT COALESCE(SUM(total_amount - amount_paid), 0) FROM sales) AS total_outstanding,
       (SELECT COUNT(DISTINCT vendor_id) FROM sales WHERE payment_status <> 'PAID') AS vendors_owing,
       (SELECT COUNT(*) FROM stock s JOIN fruits f ON f.fruit_id = s.fruit_id
         WHERE s.available_quantity <= ? AND f.status = 'ACTIVE')   AS low_stock_lines`,
    [lowThreshold]
  );
  return k;
};
