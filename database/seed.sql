-- =====================================================================
-- Sample data for Batloung Farm (run AFTER schema.sql)
-- Stock is derived from the purchase/sale rows below so that every
-- figure in the system is consistent (stock = purchased - sold).
-- =====================================================================
USE batloung_farm;

-- Suppliers: one per South African province (coordinates are approximate map pins) --
INSERT INTO suppliers (business_name, contact_person, phone, province, address, latitude, longitude) VALUES
 ('Joburg Fresh Produce Market',  'Thandi Mokoena',   '+27 11 555 0101', 'Gauteng',       'Fresh Produce Market, City Deep, Johannesburg', -26.2342000, 28.0794000),
 ('Bethlehem Oranje Orchard Co-Op','Pieter van Wyk',  '+27 58 555 0102', 'Free State',    'Farm 14, R26, Bethlehem', -28.2308000, 28.3070000),
 ('Pongola Valley Growers',       'Sipho Dlamini',    '+27 34 555 0103', 'KwaZulu-Natal', 'Plot 7, Pongola Valley, Pongola', -27.3812000, 31.6206000),
 ('Hex River Table Grapes',       'Johan van der Merwe','+27 23 555 0104','Western Cape', 'Packhouse 3, Hex River Valley, De Doorns', -33.4833000, 19.6667000),
 ('Sundays River Citrus',         'Mandla Gcaba',     '+27 42 555 0105', 'Eastern Cape',  'Addo Road, Sundays River Valley, Kirkwood', -33.4000000, 25.4333000),
 ('Letaba Citrus Estates',        'Kagiso Baloyi',    '+27 15 555 0106', 'Limpopo',       'Tzaneen Orchards, Letsitele Road, Tzaneen', -23.8330000, 30.1630000),
 ('Lowveld Tropical Fruit',       'Thabo Khumalo',    '+27 13 555 0107', 'Mpumalanga',    'Nelspruit Valley, Kiepersol, Mbombela', -25.4753000, 30.9694000),
 ('Rustenburg Citrus Co-Op',      'Pule Molefe',      '+27 14 555 0108', 'North West',    'Brits Road, Rustenburg', -25.6676000, 27.2421000);

-- Fruits ----------------------------------------------------------------
INSERT INTO fruits (fruit_name, description, status) VALUES
 ('Apples',  'Royal Gala and Cripps Pink apples',        'ACTIVE'),
 ('Bananas', 'Cavendish bananas, ethylene ripened',      'ACTIVE'),
 ('Oranges', 'Valencia and Navel oranges',               'ACTIVE'),
 ('Mangoes', 'Tommy Atkins mangoes',                     'ACTIVE'),
 ('Grapes',  'Crimson Seedless table grapes',            'ACTIVE');

-- Selling price per packaging size -------------------------------------
INSERT INTO packaging_prices (packaging_size, selling_price) VALUES
 ('SMALL', 140.00), ('MEDIUM', 220.00), ('LARGE', 320.00);

-- Vendors ---------------------------------------------------------------
INSERT INTO vendors (vendor_name, phone_number, location, registration_date, latitude, longitude) VALUES
 ('Ntate Thabo',        '+266 5800 0101', 'Sefika Market Stall 401, Maseru',  '2026-01-12', -29.3167000, 27.4833000),
 ('Me Mpho Stores',     '+266 5800 0102', 'Pitso Ground Stall 12, Maseru',    '2026-02-03', -29.3060000, 27.4830000),
 ('Tsepo Corner',       '+266 5800 0103', 'Cathedral Area Stall 8, Maseru',   '2026-02-20', -29.3103000, 27.4806000),
 ('Lerato Fresh',       '+266 5800 0104', 'Ha Thetsane Stall 19, Maseru',     '2026-03-15', -29.3430000, 27.4560000),
 ('Likotsi Traders',    '+266 5800 0105', 'Ha Thetsane Block C, Maseru',      '2026-04-01', -29.3375000, 27.5019000),
 ('Kabelo Veg Stall',   '+266 5800 0106', 'Maseru Bus Rank, Maseru',          '2026-05-18', -29.3139000, 27.4797000),
 ('Maseru Fresh Hub',   '+266 5800 0107', 'Moshoeshoe Road, Maseru',          '2026-06-09', -29.3170000, 27.4900000),
 ('Peka Farm Depot',    '+266 5800 0108', 'Peka Road, Maseru West',           '2026-07-22', -29.3022000, 27.4528000);

-- Stock rows: every fruit x every packaging size, starting at zero ----------
INSERT INTO stock (fruit_id, packaging_size, available_quantity)
SELECT f.fruit_id, p.packaging_size, 0
FROM fruits f CROSS JOIN packaging_prices p;

-- Purchases (totals are calculated below from the detail rows) -------------
INSERT INTO purchases (supplier_id, purchase_date, total_amount) VALUES
 (4, '2026-10-01', 0), (6, '2026-10-03', 0), (3, '2026-10-06', 0),
 (2, '2026-10-10', 0), (7, '2026-10-14', 0), (5, '2026-10-20', 0);

-- fruit ids: 1 Apples, 2 Bananas, 3 Oranges, 4 Mangoes, 5 Grapes
INSERT INTO purchase_details (purchase_id, fruit_id, quantity, unit_cost, packaging_size) VALUES
 (1,1,200, 88.00,'SMALL'), (1,1,300,122.50,'MEDIUM'), (1,1,150,165.00,'LARGE'),
 (1,5,100, 95.00,'SMALL'), (1,5,150,130.00,'MEDIUM'), (1,5, 80,170.00,'LARGE'),
 (2,3,250, 70.00,'SMALL'), (2,3,400,100.00,'MEDIUM'), (2,3,200,135.00,'LARGE'),
 (2,4,120,110.00,'SMALL'), (2,4,180,150.00,'MEDIUM'), (2,4, 90,200.00,'LARGE'),
 (3,2,300, 60.00,'SMALL'), (3,2,450, 90.00,'MEDIUM'), (3,2,220,120.00,'LARGE'),
 (4,1,150, 85.00,'SMALL'), (4,1,250,120.00,'MEDIUM'), (4,1,100,160.00,'LARGE'),
 (5,4,150,148.00,'MEDIUM'),(5,4, 60,198.00,'LARGE'), (5,2,100, 92.00,'MEDIUM'),
 (6,3,100, 72.00,'SMALL'), (6,3,150,102.00,'MEDIUM'),(6,3, 80,138.00,'LARGE');

UPDATE purchases p
SET p.total_amount = (SELECT COALESCE(SUM(d.quantity * d.unit_cost),0)
                      FROM purchase_details d WHERE d.purchase_id = p.purchase_id);

-- Sales (unit_price = selling price of the packaging size) ----------------
INSERT INTO sales (vendor_id, sale_date) VALUES
 (1,'2026-10-12 09:15:00'), (2,'2026-10-13 10:30:00'), (3,'2026-10-15 08:45:00'),
 (4,'2026-10-18 11:20:00'), (5,'2026-10-22 09:50:00'), (6,'2026-10-25 14:05:00'),
 (1,'2026-11-02 08:30:00'), (7,'2026-11-05 13:10:00'), (3,'2026-11-08 10:00:00');

INSERT INTO sales_details (sale_id, fruit_id, packaging_size, quantity, unit_price) VALUES
 (1,1,'SMALL', 50,140.00),(1,1,'MEDIUM', 80,220.00),(1,3,'MEDIUM', 60,220.00),
 (2,2,'SMALL',100,140.00),(2,2,'MEDIUM',120,220.00),(2,5,'MEDIUM', 40,220.00),
 (3,4,'MEDIUM', 60,220.00),(3,3,'LARGE', 50,320.00),
 (4,1,'LARGE', 40,320.00),(4,5,'LARGE', 20,320.00),(4,2,'LARGE', 60,320.00),
 (5,3,'SMALL', 90,140.00),(5,4,'SMALL', 40,140.00),(5,1,'MEDIUM',100,220.00),
 (6,2,'MEDIUM',150,220.00),(6,1,'SMALL', 70,140.00),
 (7,3,'MEDIUM',110,220.00),(7,4,'LARGE', 30,320.00),(7,5,'SMALL', 30,140.00),
 (8,1,'MEDIUM', 60,220.00),(8,2,'SMALL', 80,140.00),
 (9,3,'MEDIUM', 90,220.00),(9,1,'LARGE', 30,320.00);

UPDATE sales s
SET s.total_amount = (SELECT COALESCE(SUM(d.quantity * d.unit_price),0)
                      FROM sales_details d WHERE d.sale_id = s.sale_id);

-- Payments: cash (1,6), mobile money (4,9), part-payments (2,5,7); 3 and 8 stay on credit
INSERT INTO payments (sale_id, amount, method, reference, paid_at)
SELECT sale_id, total_amount, 'CASH', NULL, sale_date FROM sales WHERE sale_id IN (1,6);
INSERT INTO payments (sale_id, amount, method, reference, paid_at)
SELECT sale_id, total_amount, 'MOBILE_MONEY', CONCAT('MPESA-', 7000 + sale_id), sale_date FROM sales WHERE sale_id IN (4,9);
INSERT INTO payments (sale_id, amount, method, reference, paid_at)
SELECT sale_id, ROUND(total_amount * 0.5, 2), 'CASH', NULL, sale_date FROM sales WHERE sale_id IN (2,7);
INSERT INTO payments (sale_id, amount, method, reference, paid_at)
SELECT sale_id, ROUND(total_amount * 0.4, 2), 'MOBILE_MONEY', CONCAT('MPESA-', 7000 + sale_id), sale_date FROM sales WHERE sale_id = 5;

UPDATE sales s
SET s.amount_paid = (SELECT COALESCE(SUM(p.amount),0) FROM payments p WHERE p.sale_id = s.sale_id);
UPDATE sales
SET payment_status = CASE WHEN amount_paid >= total_amount THEN 'PAID'
                          WHEN amount_paid > 0             THEN 'PARTIALLY_PAID'
                          ELSE 'UNPAID' END;

-- Stock = purchased - sold, per fruit and per packaging size --------------
UPDATE stock st
SET st.available_quantity =
      COALESCE((SELECT SUM(pd.quantity) FROM purchase_details pd
                WHERE pd.fruit_id = st.fruit_id AND pd.packaging_size = st.packaging_size), 0)
    - COALESCE((SELECT SUM(sd.quantity) FROM sales_details sd
                WHERE sd.fruit_id = st.fruit_id AND sd.packaging_size = st.packaging_size), 0);
