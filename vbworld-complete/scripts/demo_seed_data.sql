-- Demo seed data for client walkthroughs.
-- Run this only on a demo/UAT database, not on production.

SET search_path TO public;

-- Demo restaurant users
INSERT INTO users (name, email, phone, password_hash, role, branch_id, is_active, status)
SELECT
    'Ravi Kumar',
    'ravi@vbworld.in',
    '9876543210',
    '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
    'RESTAURANT_STAFF',
    b.id,
    true,
    'APPROVED'
FROM branches b
WHERE b.name = 'Anna Nagar'
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.email = 'ravi@vbworld.in');

INSERT INTO users (name, email, phone, password_hash, role, is_active, status)
SELECT
    'Warehouse Lead',
    'warehouse@vbworld.in',
    '9876543211',
    '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
    'WAREHOUSE_ADMIN',
    true,
    'APPROVED'
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.email = 'warehouse@vbworld.in');

-- Demo suppliers
INSERT INTO suppliers (id, code, name, contact_person, phone, email, lead_time_days, address, notes, is_active)
SELECT
    gen_random_uuid(),
    'SUP-ANN-001',
    'Fresh Farms Traders',
    'Muthu',
    '9000000001',
    'freshfarms@demo.local',
    2,
    'Koyambedu, Chennai',
    'Vegetable and dairy supplier',
    true
WHERE NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.code = 'SUP-ANN-001');

INSERT INTO suppliers (id, code, name, contact_person, phone, email, lead_time_days, address, notes, is_active)
SELECT
    gen_random_uuid(),
    'SUP-ANN-002',
    'South Provisions Co',
    'Saravanan',
    '9000000002',
    'provisions@demo.local',
    3,
    'Parrys, Chennai',
    'Dry goods and staples supplier',
    true
WHERE NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.code = 'SUP-ANN-002');

-- Map a handful of items to suppliers for procurement demos
INSERT INTO supplier_item_mappings (id, supplier_id, item_id, supplier_sku, last_unit_cost, min_order_quantity, lead_time_days, is_preferred, is_active, notes)
SELECT gen_random_uuid(), s.id, i.id, CONCAT(s.code, '-', i.code), 42.50, 5, 2, true, true, 'Demo preferred supplier mapping'
FROM suppliers s
JOIN items i ON i.code IN ('PRO-006', 'PRO-008', 'PRO-029', 'PRO-030', 'PKG-001', 'PRT-001')
WHERE s.code = 'SUP-ANN-001'
  AND NOT EXISTS (
      SELECT 1 FROM supplier_item_mappings m
      WHERE m.supplier_id = s.id AND m.item_id = i.id
  );

-- Demo feedback items
INSERT INTO feedback (user_id, user_name, user_email, branch_name, type, subject, message, status, admin_note)
SELECT
    u.id,
    u.name,
    u.email,
    'Anna Nagar',
    'BUG',
    'Printer issue at counter',
    'Thermal printer skipped two bills during lunch rush.',
    'OPEN',
    'Reproduce during UAT and verify printer settings.'
FROM users u
WHERE u.email = 'ravi@vbworld.in'
  AND NOT EXISTS (
      SELECT 1 FROM feedback f WHERE f.subject = 'Printer issue at counter'
  );

INSERT INTO feedback (user_id, user_name, user_email, branch_name, type, subject, message, status, admin_note)
SELECT
    u.id,
    u.name,
    u.email,
    'Anna Nagar',
    'QUERY',
    'Need reorder suggestion explanation',
    'Please explain why tomato reorder quantity is higher this week.',
    'IN_PROGRESS',
    'Will review forecast logic with branch manager.'
FROM users u
WHERE u.email = 'ravi@vbworld.in'
  AND NOT EXISTS (
      SELECT 1 FROM feedback f WHERE f.subject = 'Need reorder suggestion explanation'
  );

-- Demo customer
INSERT INTO customers (id, branch_id, name, phone, email, points_balance, lifetime_points_earned, lifetime_points_redeemed, total_visits, total_spend, last_visit_at)
SELECT
    gen_random_uuid(),
    b.id,
    'Anitha Customer',
    '9000012345',
    'anitha.customer@demo.local',
    120,
    240,
    120,
    8,
    4850.00,
    NOW() - INTERVAL '1 day'
FROM branches b
WHERE b.name = 'Anna Nagar'
  AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.phone = '9000012345');

-- Demo supplier-backed warehouse lots for analytics / stock aging
INSERT INTO warehouse_stock_lots (
    stock_id, item_id, supplier_id, batch_number, received_uom, units_per_pack,
    quantity_received, base_quantity_received, remaining_quantity,
    received_at, expiry_date, unit_cost, reference_number, invoice_number, notes
)
SELECT
    ws.id,
    i.id,
    s.id,
    CONCAT('DEMO-', i.code, '-A'),
    i.unit,
    1,
    40,
    40,
    28,
    NOW() - INTERVAL '18 days',
    CURRENT_DATE + INTERVAL '20 days',
    55.00,
    CONCAT('REF-', i.code, '-A'),
    CONCAT('INV-', i.code, '-A'),
    'Demo lot for analytics screens'
FROM warehouse_stock ws
JOIN items i ON i.id = ws.item_id
JOIN suppliers s ON s.code = 'SUP-ANN-001'
WHERE i.code IN ('PRO-029', 'PRO-030', 'PRO-032')
  AND NOT EXISTS (
      SELECT 1 FROM warehouse_stock_lots l
      WHERE l.stock_id = ws.id AND l.batch_number = CONCAT('DEMO-', i.code, '-A')
  );

INSERT INTO warehouse_stock_lots (
    stock_id, item_id, supplier_id, batch_number, received_uom, units_per_pack,
    quantity_received, base_quantity_received, remaining_quantity,
    received_at, expiry_date, unit_cost, reference_number, invoice_number, notes
)
SELECT
    ws.id,
    i.id,
    s.id,
    CONCAT('DEMO-', i.code, '-B'),
    i.unit,
    1,
    25,
    25,
    9,
    NOW() - INTERVAL '52 days',
    CURRENT_DATE - INTERVAL '2 days',
    48.00,
    CONCAT('REF-', i.code, '-B'),
    CONCAT('INV-', i.code, '-B'),
    'Older demo lot for aging and wastage stories'
FROM warehouse_stock ws
JOIN items i ON i.id = ws.item_id
JOIN suppliers s ON s.code = 'SUP-ANN-002'
WHERE i.code IN ('PRO-006', 'PRO-008')
  AND NOT EXISTS (
      SELECT 1 FROM warehouse_stock_lots l
      WHERE l.stock_id = ws.id AND l.batch_number = CONCAT('DEMO-', i.code, '-B')
  );
