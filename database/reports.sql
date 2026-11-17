-- =====================================================================
-- PART D: SQL reporting queries (these exact queries are used by the API)
-- =====================================================================
USE batloung_farm;

-- 1. The five most frequently sold fruits (by boxes sold) ---------------
SELECT f.fruit_id, f.fruit_name,
       SUM(sd.quantity)                  AS total_boxes_sold,
       SUM(sd.quantity * sd.unit_price)  AS revenue
FROM sales_details sd
JOIN fruits f ON f.fruit_id = sd.fruit_id
GROUP BY f.fruit_id, f.fruit_name
ORDER BY total_boxes_sold DESC, f.fruit_name
LIMIT 5;

-- 2. Total sales revenue in a date range (inclusive of both dates) --------
SET @from_date = '2026-10-01', @to_date = '2026-10-31';
SELECT COUNT(*)                        AS number_of_sales,
       COALESCE(SUM(total_amount), 0)  AS total_revenue
FROM sales
WHERE sale_date >= @from_date
  AND sale_date <  DATE_ADD(@to_date, INTERVAL 1 DAY);

-- 3. The vendor who has purchased the highest number of boxes ----------
SELECT v.vendor_id, v.vendor_name, v.phone_number,
       SUM(sd.quantity) AS total_boxes_purchased
FROM vendors v
JOIN sales s          ON s.vendor_id = v.vendor_id
JOIN sales_details sd ON sd.sale_id  = s.sale_id
GROUP BY v.vendor_id, v.vendor_name, v.phone_number
ORDER BY total_boxes_purchased DESC, v.vendor_id
LIMIT 1;

-- 4. Current stock level for each fruit and packaging size ---------------
SELECT f.fruit_name, s.packaging_size, s.available_quantity
FROM stock s
JOIN fruits f ON f.fruit_id = s.fruit_id
ORDER BY f.fruit_name, FIELD(s.packaging_size, 'SMALL', 'MEDIUM', 'LARGE');

-- Bonus: outstanding balance for each vendor ------------------------------
SELECT v.vendor_id, v.vendor_name,
       COALESCE(SUM(s.total_amount), 0)                       AS total_billed,
       COALESCE(SUM(s.amount_paid), 0)                        AS total_paid,
       COALESCE(SUM(s.total_amount - s.amount_paid), 0)       AS outstanding_balance
FROM vendors v
LEFT JOIN sales s ON s.vendor_id = v.vendor_id
GROUP BY v.vendor_id, v.vendor_name
ORDER BY outstanding_balance DESC;

-- =====================================================================
-- Transaction demonstration (raw SQL). Run line by line in a SQL client.
-- A sale of 1 SMALL apple (valid) + 99999 LARGE apples (not in stock).
-- The second line fails the stock check, so we ROLLBACK and nothing changes.
-- =====================================================================
-- SELECT * FROM stock WHERE fruit_id = 1;                -- note quantities
-- BEGIN;
--   INSERT INTO sales (vendor_id) VALUES (1);
--   SET @sid = LAST_INSERT_ID();
--   INSERT INTO sales_details (sale_id, fruit_id, packaging_size, quantity, unit_price) VALUES (@sid, 1, 'SMALL', 1, 140.00);
--   UPDATE stock SET available_quantity = available_quantity - 1 WHERE fruit_id = 1 AND packaging_size = 'SMALL';
--   -- Second item: stock check fails (available < 99999) -> abort
--   SELECT available_quantity FROM stock WHERE fruit_id = 1 AND packaging_size = 'LARGE' FOR UPDATE;
-- ROLLBACK;                                              -- undo everything
-- SELECT * FROM stock WHERE fruit_id = 1;                -- identical to before
