-- =====================================================================
-- Batloung Farm Distribution System  |  DIWA2110 Take-Home Test
-- PART A: MySQL database design and implementation
-- Works on XAMPP (MariaDB 10.2+) and MySQL 8.0.16+ (both enforce CHECK constraints).
-- Import in phpMyAdmin (Import tab) or run: npm run db:setup
-- =====================================================================

CREATE DATABASE IF NOT EXISTS batloung_farm
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE batloung_farm;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS payments, sales_details, sales, stock, purchase_details,
                     purchases, packaging_prices, vendors, fruits, suppliers;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. SUPPLIERS ---------------------------------------------------------
CREATE TABLE suppliers (
  supplier_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  business_name  VARCHAR(120) NOT NULL,
  contact_person VARCHAR(100) NOT NULL,
  phone          VARCHAR(20)  NOT NULL,
  province       ENUM('Gauteng','Free State','KwaZulu-Natal','Western Cape',
                      'Eastern Cape','Limpopo','Mpumalanga','North West') NOT NULL,
  address        VARCHAR(255) NOT NULL,
  latitude       DECIMAL(10,7) NULL,   -- map pin chosen at registration
  longitude      DECIMAL(10,7) NULL,
  PRIMARY KEY (supplier_id),
  UNIQUE KEY uq_supplier_business (business_name),
  UNIQUE KEY uq_supplier_phone (phone),
  KEY idx_supplier_province (province),
  CONSTRAINT chk_supplier_lat CHECK (latitude  IS NULL OR latitude  BETWEEN -90  AND 90),
  CONSTRAINT chk_supplier_lng CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB;

-- 2. FRUITS ------------------------------------------------------------
CREATE TABLE fruits (
  fruit_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  fruit_name  VARCHAR(60)  NOT NULL,
  description VARCHAR(255) NULL,
  category    VARCHAR(60)  NULL DEFAULT NULL,
  status      ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (fruit_id),
  UNIQUE KEY uq_fruit_name (fruit_name)
) ENGINE=InnoDB;

-- 3. VENDORS -----------------------------------------------------------
CREATE TABLE vendors (
  vendor_id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  vendor_name       VARCHAR(120) NOT NULL,
  phone_number      VARCHAR(20)  NOT NULL,
  location          VARCHAR(150) NOT NULL,
  registration_date DATE NOT NULL,            -- set by the API (today) or given explicitly
  latitude          DECIMAL(10,7) NULL,       -- map pin chosen at registration
  longitude         DECIMAL(10,7) NULL,
  PRIMARY KEY (vendor_id),
  UNIQUE KEY uq_vendor_phone (phone_number),
  KEY idx_vendor_name (vendor_name),
  CONSTRAINT chk_vendor_lat CHECK (latitude  IS NULL OR latitude  BETWEEN -90  AND 90),
  CONSTRAINT chk_vendor_lng CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB;

-- Selling price per packaging size (every size has a different price) ----
CREATE TABLE packaging_prices (
  packaging_size ENUM('SMALL','MEDIUM','LARGE') NOT NULL,
  selling_price  DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (packaging_size),
  CONSTRAINT chk_price_positive CHECK (selling_price > 0)
) ENGINE=InnoDB;

-- 4. PURCHASES ---------------------------------------------------------
CREATE TABLE purchases (
  purchase_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  supplier_id   INT UNSIGNED NOT NULL,
  purchase_date DATE NOT NULL,                 -- set by the API (today) or given explicitly
  total_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (purchase_id),
  KEY idx_purchase_date (purchase_date),
  CONSTRAINT fk_purchase_supplier FOREIGN KEY (supplier_id)
    REFERENCES suppliers (supplier_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_purchase_total CHECK (total_amount >= 0)
) ENGINE=InnoDB;

-- 5. PURCHASE DETAILS --------------------------------------------------
CREATE TABLE purchase_details (
  purchase_detail_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  purchase_id        INT UNSIGNED NOT NULL,
  fruit_id           INT UNSIGNED NOT NULL,
  quantity           INT UNSIGNED NOT NULL,
  unit_cost          DECIMAL(10,2) NOT NULL,
  packaging_size     ENUM('SMALL','MEDIUM','LARGE') NOT NULL,
  PRIMARY KEY (purchase_detail_id),
  KEY idx_pd_purchase (purchase_id),
  KEY idx_pd_fruit (fruit_id),
  CONSTRAINT fk_pd_purchase FOREIGN KEY (purchase_id)
    REFERENCES purchases (purchase_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_pd_fruit FOREIGN KEY (fruit_id)
    REFERENCES fruits (fruit_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_pd_quantity CHECK (quantity > 0),
  CONSTRAINT chk_pd_cost CHECK (unit_cost >= 0)
) ENGINE=InnoDB;

-- 6. SALES -------------------------------------------------------------
CREATE TABLE sales (
  sale_id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  vendor_id      INT UNSIGNED NOT NULL,
  sale_date      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payment_status ENUM('PAID','PARTIALLY_PAID','UNPAID') NOT NULL DEFAULT 'UNPAID',
  total_amount   DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount_paid    DECIMAL(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (sale_id),
  KEY idx_sale_date (sale_date),
  KEY idx_sale_vendor (vendor_id),
  KEY idx_sale_status (payment_status),
  CONSTRAINT fk_sale_vendor FOREIGN KEY (vendor_id)
    REFERENCES vendors (vendor_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_sale_total CHECK (total_amount >= 0),
  CONSTRAINT chk_sale_paid  CHECK (amount_paid >= 0 AND amount_paid <= total_amount)
) ENGINE=InnoDB;

-- 7. SALES DETAILS -----------------------------------------------------
CREATE TABLE sales_details (
  sales_detail_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sale_id         INT UNSIGNED NOT NULL,
  fruit_id        INT UNSIGNED NOT NULL,
  packaging_size  ENUM('SMALL','MEDIUM','LARGE') NOT NULL,
  quantity        INT UNSIGNED NOT NULL,
  unit_price      DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (sales_detail_id),
  KEY idx_sd_sale (sale_id),
  KEY idx_sd_fruit (fruit_id),
  CONSTRAINT fk_sd_sale FOREIGN KEY (sale_id)
    REFERENCES sales (sale_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_sd_fruit FOREIGN KEY (fruit_id)
    REFERENCES fruits (fruit_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_sd_quantity CHECK (quantity > 0),
  CONSTRAINT chk_sd_price CHECK (unit_price > 0)
) ENGINE=InnoDB;

-- 8. STOCK  (one row per fruit AND packaging size) ----------------------
CREATE TABLE stock (
  stock_id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  fruit_id           INT UNSIGNED NOT NULL,
  packaging_size     ENUM('SMALL','MEDIUM','LARGE') NOT NULL,
  available_quantity INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (stock_id),
  UNIQUE KEY uq_stock_fruit_size (fruit_id, packaging_size),
  CONSTRAINT fk_stock_fruit FOREIGN KEY (fruit_id)
    REFERENCES fruits (fruit_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_stock_non_negative CHECK (available_quantity >= 0)
) ENGINE=InnoDB;

-- 9. PAYMENTS (supports cash, mobile money; unpaid balance = credit) ----
CREATE TABLE payments (
  payment_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sale_id    INT UNSIGNED NOT NULL,
  amount     DECIMAL(12,2) NOT NULL,
  method     ENUM('CASH','MOBILE_MONEY') NOT NULL,
  reference  VARCHAR(60) NULL,
  paid_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id),
  KEY idx_payment_sale (sale_id),
  CONSTRAINT fk_payment_sale FOREIGN KEY (sale_id)
    REFERENCES sales (sale_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT chk_payment_amount CHECK (amount > 0)
) ENGINE=InnoDB;
