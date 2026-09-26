-- =========================================================
-- StockSense - Inventory Management System
-- MySQL Schema (MySQL Workbench compatible)
-- =========================================================

CREATE DATABASE IF NOT EXISTS stocksense;
USE stocksense;

-- ---------------------------------------------------------
-- 1. USERS  (Authentication)
-- ---------------------------------------------------------
CREATE TABLE users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100)  NOT NULL,
    login_id        VARCHAR(50)   NOT NULL UNIQUE,
    email           VARCHAR(150)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255)  NOT NULL,
    role            ENUM('inventory_manager','warehouse_staff') DEFAULT 'warehouse_staff',
    otp_code        VARCHAR(10)   NULL,
    otp_expires_at  DATETIME      NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- 2. WAREHOUSES  (Settings > Warehouse)
-- ---------------------------------------------------------
CREATE TABLE warehouses (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    short_code  VARCHAR(20)  NOT NULL UNIQUE,
    address     VARCHAR(255),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- 3. LOCATIONS  (rooms / racks / stock areas inside a warehouse)
-- ---------------------------------------------------------
CREATE TABLE locations (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    warehouse_id  INT NOT NULL,
    name          VARCHAR(100) NOT NULL,
    short_code    VARCHAR(30)  NOT NULL UNIQUE,   -- e.g. WH/Stock1
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- 4. PRODUCTS
-- ---------------------------------------------------------
CREATE TABLE products (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    sku            VARCHAR(30)  NOT NULL UNIQUE,   -- e.g. DESK001
    name           VARCHAR(150) NOT NULL,
    category       VARCHAR(100),
    uom            VARCHAR(30)  DEFAULT 'Unit',    -- unit of measure
    per_unit_cost  DECIMAL(12,2) DEFAULT 0,
    reorder_min    INT DEFAULT 0,                  -- reordering rule threshold
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- 5. STOCK  (quantity per product per location)
-- ---------------------------------------------------------
CREATE TABLE stock (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    product_id    INT NOT NULL,
    location_id   INT NOT NULL,
    qty_on_hand   DECIMAL(12,2) DEFAULT 0,
    qty_reserved  DECIMAL(12,2) DEFAULT 0,        -- reserved for pending deliveries
    UNIQUE KEY uniq_product_location (product_id, location_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- 6. RECEIPTS  (Incoming stock - WH/IN/xxxx)
-- ---------------------------------------------------------
CREATE TABLE receipts (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    reference      VARCHAR(30) NOT NULL UNIQUE,     -- WH/IN/0001
    receive_from   VARCHAR(150),                    -- vendor / partner
    to_location_id INT NOT NULL,
    contact        VARCHAR(150),
    schedule_date  DATE,
    responsible    VARCHAR(100),
    status         ENUM('draft','ready','done','canceled') DEFAULT 'draft',
    created_by     INT,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validated_at   TIMESTAMP NULL,
    FOREIGN KEY (to_location_id) REFERENCES locations(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE receipt_lines (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    receipt_id  INT NOT NULL,
    product_id  INT NOT NULL,
    quantity    DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ---------------------------------------------------------
-- 7. DELIVERIES  (Outgoing stock - WH/OUT/xxxx)
-- ---------------------------------------------------------
CREATE TABLE deliveries (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    reference        VARCHAR(30) NOT NULL UNIQUE,   -- WH/OUT/0001
    from_location_id INT NOT NULL,
    delivery_address VARCHAR(255),
    contact          VARCHAR(150),
    schedule_date    DATE,
    responsible      VARCHAR(100),
    operation_type   VARCHAR(50) DEFAULT 'Delivery',
    status           ENUM('draft','waiting','ready','done','canceled') DEFAULT 'draft',
    created_by       INT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validated_at     TIMESTAMP NULL,
    FOREIGN KEY (from_location_id) REFERENCES locations(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE delivery_lines (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    delivery_id   INT NOT NULL,
    product_id    INT NOT NULL,
    quantity      DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ---------------------------------------------------------
-- 8. INTERNAL TRANSFERS  (WH/INT/xxxx)
-- ---------------------------------------------------------
CREATE TABLE transfers (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    reference         VARCHAR(30) NOT NULL UNIQUE,
    from_location_id  INT NOT NULL,
    to_location_id    INT NOT NULL,
    schedule_date     DATE,
    responsible       VARCHAR(100),
    status            ENUM('draft','ready','done','canceled') DEFAULT 'draft',
    created_by        INT,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validated_at      TIMESTAMP NULL,
    FOREIGN KEY (from_location_id) REFERENCES locations(id),
    FOREIGN KEY (to_location_id) REFERENCES locations(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE transfer_lines (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    transfer_id  INT NOT NULL,
    product_id   INT NOT NULL,
    quantity     DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (transfer_id) REFERENCES transfers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ---------------------------------------------------------
-- 9. STOCK ADJUSTMENTS
-- ---------------------------------------------------------
CREATE TABLE adjustments (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    product_id     INT NOT NULL,
    location_id    INT NOT NULL,
    recorded_qty   DECIMAL(12,2) NOT NULL,
    counted_qty    DECIMAL(12,2) NOT NULL,
    difference     DECIMAL(12,2) NOT NULL,
    reason         VARCHAR(255),
    created_by     INT,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ---------------------------------------------------------
-- 10. MOVE HISTORY  (Stock ledger - every validated movement)
-- ---------------------------------------------------------
CREATE TABLE moves (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    reference       VARCHAR(30) NOT NULL,          -- WH/IN/0001, WH/OUT/0001, WH/INT/0001
    move_type       ENUM('in','out','internal','adjustment') NOT NULL,
    product_id      INT NOT NULL,
    from_label      VARCHAR(150),                  -- vendor name or location name
    to_label        VARCHAR(150),
    contact         VARCHAR(150),
    quantity        DECIMAL(12,2) NOT NULL,
    move_date       DATE,
    status          VARCHAR(30) DEFAULT 'done',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ---------------------------------------------------------
-- Seed: default warehouse/location so the app works out of the box
-- ---------------------------------------------------------
INSERT INTO warehouses (name, short_code, address) VALUES ('Main Warehouse', 'WH', 'Default Address');
INSERT INTO locations (warehouse_id, name, short_code) VALUES
    (1, 'Stock 1', 'WH/Stock1'),
    (1, 'Stock 2', 'WH/Stock2');

-- ---------------------------------------------------------
-- Seed: sample products + opening stock so Product dropdowns
-- (Receipts, Deliveries, Transfers, Adjustments) are populated
-- out of the box instead of showing an empty list.
-- ---------------------------------------------------------
INSERT INTO products (sku, name, category, uom, per_unit_cost, reorder_min) VALUES
    ('DESK001', 'Office Desk',      'Furniture',  'Unit', 4500.00, 5),
    ('CHAIR01', 'Ergonomic Chair',  'Furniture',  'Unit', 3200.00, 5),
    ('LAP001',  'Laptop 14-inch',   'Electronics','Unit', 55000.00, 3),
    ('MON001',  'Monitor 24-inch',  'Electronics','Unit', 9500.00, 4),
    ('STA001',  'A4 Paper Ream',    'Stationery', 'Unit', 250.00, 20);

INSERT INTO stock (product_id, location_id, qty_on_hand, qty_reserved) VALUES
    (1, 1, 20, 0),
    (2, 1, 30, 0),
    (3, 2, 15, 0),
    (4, 2, 25, 0),
    (5, 1, 100, 0);
