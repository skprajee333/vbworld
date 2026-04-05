-- ============================================================
-- V2__seed_data.sql
-- ============================================================
SET search_path TO public;

-- ─── CATEGORIES ──────────────────────────────────────────
INSERT INTO categories (name, sort_order) VALUES
('Provision',        1),
('Packing Material', 2),
('Cold Beverages',   3),
('Production',       4),
('Printing',         5);

-- ─── BRANCHES ────────────────────────────────────────────
INSERT INTO branches (name, address, city) VALUES
('Anna Nagar',   'Anna Nagar, Chennai',   'Chennai'),
('Saligramam',   'Saligramam, Chennai',   'Chennai'),
('T Nagar',      'T Nagar, Chennai',      'Chennai'),
('Velachery',    'Velachery, Chennai',    'Chennai');

-- ─── ADMIN USER ──────────────────────────────────────────
-- Password: Admin@123  (bcrypt $2a$12$...)
INSERT INTO users (name, email, password_hash, role) VALUES
(
    'VB Admin',
    'admin@vbworld.in',
    '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
    'ADMIN'
);

-- ─── ITEMS (Provision) ────────────────────────────────────
INSERT INTO items (code, name, category_id, unit, reorder_level) VALUES
('PRO-001', 'Oil Refined Sunflower',         (SELECT id FROM categories WHERE name='Provision'), 'Ltr',  10),
('PRO-002', 'Toor Dhall',                    (SELECT id FROM categories WHERE name='Provision'), 'Kg',   10),
('PRO-003', 'Moong Dhall',                   (SELECT id FROM categories WHERE name='Provision'), 'Kg',   10),
('PRO-004', 'Urad Dhall',                    (SELECT id FROM categories WHERE name='Provision'), 'Kg',   10),
('PRO-005', 'Channa Dhall',                  (SELECT id FROM categories WHERE name='Provision'), 'Kg',   10),
('PRO-006', 'Maida',                         (SELECT id FROM categories WHERE name='Provision'), 'Kg',   20),
('PRO-007', 'Atta',                          (SELECT id FROM categories WHERE name='Provision'), 'Kg',   20),
('PRO-008', 'Rice Sona Masoori',             (SELECT id FROM categories WHERE name='Provision'), 'Kg',   50),
('PRO-009', 'Basmati Rice',                  (SELECT id FROM categories WHERE name='Provision'), 'Kg',   25),
('PRO-010', 'Semiya',                        (SELECT id FROM categories WHERE name='Provision'), 'Kg',   10),
('PRO-011', 'Rava Sooji',                    (SELECT id FROM categories WHERE name='Provision'), 'Kg',   10),
('PRO-012', 'Sugar',                         (SELECT id FROM categories WHERE name='Provision'), 'Kg',   20),
('PRO-013', 'Salt Tata',                     (SELECT id FROM categories WHERE name='Provision'), 'Kg',   10),
('PRO-014', 'Turmeric Powder',               (SELECT id FROM categories WHERE name='Provision'), 'Kg',   5),
('PRO-015', 'Chilli Powder Red',             (SELECT id FROM categories WHERE name='Provision'), 'Kg',   5),
('PRO-016', 'Coriander Powder',              (SELECT id FROM categories WHERE name='Provision'), 'Kg',   5),
('PRO-017', 'Cumin Powder',                  (SELECT id FROM categories WHERE name='Provision'), 'Kg',   5),
('PRO-018', 'Garam Masala',                  (SELECT id FROM categories WHERE name='Provision'), 'Kg',   3),
('PRO-019', 'Sambar Powder',                 (SELECT id FROM categories WHERE name='Provision'), 'Kg',   5),
('PRO-020', 'Rasam Powder',                  (SELECT id FROM categories WHERE name='Provision'), 'Kg',   5),
('PRO-021', 'Tomato Paste',                  (SELECT id FROM categories WHERE name='Provision'), 'Kg',   10),
('PRO-022', 'Tamarind',                      (SELECT id FROM categories WHERE name='Provision'), 'Kg',   5),
('PRO-023', 'Mustard Seeds',                 (SELECT id FROM categories WHERE name='Provision'), 'Kg',   3),
('PRO-024', 'Cumin Seeds',                   (SELECT id FROM categories WHERE name='Provision'), 'Kg',   3),
('PRO-025', 'Fenugreek Seeds',               (SELECT id FROM categories WHERE name='Provision'), 'Kg',   2),
('PRO-026', 'Curry Leaves',                  (SELECT id FROM categories WHERE name='Provision'), 'Kg',   2),
('PRO-027', 'Garlic',                        (SELECT id FROM categories WHERE name='Provision'), 'Kg',   5),
('PRO-028', 'Ginger',                        (SELECT id FROM categories WHERE name='Provision'), 'Kg',   5),
('PRO-029', 'Onion',                         (SELECT id FROM categories WHERE name='Provision'), 'Kg',   20),
('PRO-030', 'Tomato',                        (SELECT id FROM categories WHERE name='Provision'), 'Kg',   20),
('PRO-031', 'Green Chilli',                  (SELECT id FROM categories WHERE name='Provision'), 'Kg',   5),
('PRO-032', 'Paneer Indiska',                (SELECT id FROM categories WHERE name='Provision'), 'Kg',   5),
('PRO-033', 'Fresh Cream Amul',              (SELECT id FROM categories WHERE name='Provision'), 'Kg',   5),
('PRO-034', 'Butter Amul',                   (SELECT id FROM categories WHERE name='Provision'), 'Kg',   5),
('PRO-035', 'Ghee',                          (SELECT id FROM categories WHERE name='Provision'), 'Kg',   3),
('PRO-036', 'Curd',                          (SELECT id FROM categories WHERE name='Provision'), 'Kg',   10),
('PRO-037', 'Milk',                          (SELECT id FROM categories WHERE name='Provision'), 'Ltr',  20),
('PRO-038', 'Coconut',                       (SELECT id FROM categories WHERE name='Provision'), 'Nos',  20),
('PRO-039', 'Coconut Oil',                   (SELECT id FROM categories WHERE name='Provision'), 'Ltr',  5),
('PRO-040', 'Groundnut Oil',                 (SELECT id FROM categories WHERE name='Provision'), 'Ltr',  10),
('PRO-041', 'Sesame Oil',                    (SELECT id FROM categories WHERE name='Provision'), 'Ltr',  5),
('PRO-042', 'Vinegar',                       (SELECT id FROM categories WHERE name='Provision'), 'Ltr',  3),
('PRO-043', 'Soya Sauce',                    (SELECT id FROM categories WHERE name='Provision'), 'Ltr',  3),
('PRO-044', 'Tomato Sauce',                  (SELECT id FROM categories WHERE name='Provision'), 'Kg',   5),
('PRO-045', 'Green Peas',                    (SELECT id FROM categories WHERE name='Provision'), 'Kg',   5),
('PRO-046', 'Potato',                        (SELECT id FROM categories WHERE name='Provision'), 'Kg',   20),
('PRO-047', 'Carrot',                        (SELECT id FROM categories WHERE name='Provision'), 'Kg',   10),
('PRO-048', 'Beans',                         (SELECT id FROM categories WHERE name='Provision'), 'Kg',   5),
('PRO-049', 'Cauliflower',                   (SELECT id FROM categories WHERE name='Provision'), 'Kg',   5),
('PRO-050', 'Cabbage',                       (SELECT id FROM categories WHERE name='Provision'), 'Kg',   5),
('PRO-051', 'Coffee Powder Cothas',          (SELECT id FROM categories WHERE name='Provision'), 'Kg',   3),
('PRO-052', 'Tea Powder',                    (SELECT id FROM categories WHERE name='Provision'), 'Kg',   3),
('PRO-053', 'Cardamom',                      (SELECT id FROM categories WHERE name='Provision'), 'Kg',   1),
('PRO-054', 'Cloves',                        (SELECT id FROM categories WHERE name='Provision'), 'Kg',   1),
('PRO-055', 'Cinnamon',                      (SELECT id FROM categories WHERE name='Provision'), 'Kg',   1),
('PRO-056', 'Bay Leaves',                    (SELECT id FROM categories WHERE name='Provision'), 'Kg',   1),
('PRO-057', 'Black Pepper',                  (SELECT id FROM categories WHERE name='Provision'), 'Kg',   2),
('PRO-058', 'Mozzarella Cheese',             (SELECT id FROM categories WHERE name='Provision'), 'Kg',   5),
('PRO-059', 'Cheddar Cheese',                (SELECT id FROM categories WHERE name='Provision'), 'Kg',   3),
('PRO-060', 'Bread Slices',                  (SELECT id FROM categories WHERE name='Provision'), 'Pkt',  10),
('PRO-061', 'Corn Flour',                    (SELECT id FROM categories WHERE name='Provision'), 'Kg',   5),
('PRO-062', 'Baking Powder',                 (SELECT id FROM categories WHERE name='Provision'), 'Kg',   2),
('PRO-063', 'Baking Soda',                   (SELECT id FROM categories WHERE name='Provision'), 'Kg',   2),
('PRO-064', 'Food Colour Red',               (SELECT id FROM categories WHERE name='Provision'), 'Nos',  5),
('PRO-065', 'Food Colour Yellow',            (SELECT id FROM categories WHERE name='Provision'), 'Nos',  5),
('PRO-066', 'Rose Water',                    (SELECT id FROM categories WHERE name='Provision'), 'Ltr',  2),
('PRO-067', 'Kewra Water',                   (SELECT id FROM categories WHERE name='Provision'), 'Ltr',  2),
('PRO-068', 'Cashew Nuts',                   (SELECT id FROM categories WHERE name='Provision'), 'Kg',   3),
('PRO-069', 'Raisins',                       (SELECT id FROM categories WHERE name='Provision'), 'Kg',   2),
('PRO-070', 'Almonds',                       (SELECT id FROM categories WHERE name='Provision'), 'Kg',   2);

-- ─── ITEMS (Packing Material) ─────────────────────────────
INSERT INTO items (code, name, category_id, unit, reorder_level) VALUES
('PKG-001', 'Bio Cup 110ml',                 (SELECT id FROM categories WHERE name='Packing Material'), 'Nos',  500),
('PKG-002', 'Bio Cup 200ml',                 (SELECT id FROM categories WHERE name='Packing Material'), 'Nos',  500),
('PKG-003', 'Parcel Cover Small',            (SELECT id FROM categories WHERE name='Packing Material'), 'Nos',  200),
('PKG-004', 'Parcel Cover Medium',           (SELECT id FROM categories WHERE name='Packing Material'), 'Nos',  200),
('PKG-005', 'Parcel Cover Large',            (SELECT id FROM categories WHERE name='Packing Material'), 'Nos',  100),
('PKG-006', 'Tissue Paper',                  (SELECT id FROM categories WHERE name='Packing Material'), 'Pkt',  50),
('PKG-007', 'Aluminium Foil',                (SELECT id FROM categories WHERE name='Packing Material'), 'Roll', 10),
('PKG-008', 'Cling Wrap',                    (SELECT id FROM categories WHERE name='Packing Material'), 'Roll', 5),
('PKG-009', 'Plastic Spoon',                 (SELECT id FROM categories WHERE name='Packing Material'), 'Nos',  500),
('PKG-010', 'Paper Plate',                   (SELECT id FROM categories WHERE name='Packing Material'), 'Nos',  200),
('PKG-011', 'Straw',                         (SELECT id FROM categories WHERE name='Packing Material'), 'Nos',  500),
('PKG-012', 'Carry Bag Small',               (SELECT id FROM categories WHERE name='Packing Material'), 'Nos',  200),
('PKG-013', 'Carry Bag Large',               (SELECT id FROM categories WHERE name='Packing Material'), 'Nos',  100),
('PKG-014', 'Sealing Machine Roll',          (SELECT id FROM categories WHERE name='Packing Material'), 'Roll', 5),
('PKG-015', 'Food Box Small',                (SELECT id FROM categories WHERE name='Packing Material'), 'Nos',  100),
('PKG-016', 'Food Box Large',                (SELECT id FROM categories WHERE name='Packing Material'), 'Nos',  100),
('PKG-017', 'Butter Paper',                  (SELECT id FROM categories WHERE name='Packing Material'), 'Sheet',200),
('PKG-018', 'Zip Lock Bag',                  (SELECT id FROM categories WHERE name='Packing Material'), 'Nos',  100),
('PKG-019', 'Label Sticker',                 (SELECT id FROM categories WHERE name='Packing Material'), 'Nos',  200),
('PKG-020', 'Rubber Band',                   (SELECT id FROM categories WHERE name='Packing Material'), 'Nos',  100);

-- ─── ITEMS (Cold Beverages) ───────────────────────────────
INSERT INTO items (code, name, category_id, unit, reorder_level) VALUES
('BEV-001', 'Pepsi 250ml',                   (SELECT id FROM categories WHERE name='Cold Beverages'), 'Nos',  24),
('BEV-002', 'Pepsi 600ml',                   (SELECT id FROM categories WHERE name='Cold Beverages'), 'Nos',  24),
('BEV-003', '7UP 250ml',                     (SELECT id FROM categories WHERE name='Cold Beverages'), 'Nos',  24),
('BEV-004', 'Mirinda 250ml',                 (SELECT id FROM categories WHERE name='Cold Beverages'), 'Nos',  24),
('BEV-005', 'Mountain Dew 250ml',            (SELECT id FROM categories WHERE name='Cold Beverages'), 'Nos',  24),
('BEV-006', 'Slice 200ml',                   (SELECT id FROM categories WHERE name='Cold Beverages'), 'Nos',  24),
('BEV-007', 'Tropicana Orange 200ml',        (SELECT id FROM categories WHERE name='Cold Beverages'), 'Nos',  24),
('BEV-008', 'Mineral Water 500ml',           (SELECT id FROM categories WHERE name='Cold Beverages'), 'Nos',  48),
('BEV-009', 'Mineral Water 1L',              (SELECT id FROM categories WHERE name='Cold Beverages'), 'Nos',  24),
('BEV-010', 'Soda Water 250ml',              (SELECT id FROM categories WHERE name='Cold Beverages'), 'Nos',  24);

-- ─── ITEMS (Production) ───────────────────────────────────
INSERT INTO items (code, name, category_id, unit, reorder_level) VALUES
('PRD-001', 'Gas Cylinder Commercial',       (SELECT id FROM categories WHERE name='Production'), 'Nos',  2),
('PRD-002', 'Washing Liquid',                (SELECT id FROM categories WHERE name='Production'), 'Ltr',  5),
('PRD-003', 'Dish Wash Bar',                 (SELECT id FROM categories WHERE name='Production'), 'Nos',  10),
('PRD-004', 'Hand Wash',                     (SELECT id FROM categories WHERE name='Production'), 'Nos',  5),
('PRD-005', 'Sanitizer',                     (SELECT id FROM categories WHERE name='Production'), 'Nos',  5),
('PRD-006', 'Gloves Disposable',             (SELECT id FROM categories WHERE name='Production'), 'Box',  5),
('PRD-007', 'Mask Disposable',               (SELECT id FROM categories WHERE name='Production'), 'Box',  3),
('PRD-008', 'Apron',                         (SELECT id FROM categories WHERE name='Production'), 'Nos',  5),
('PRD-009', 'Scouring Pad',                  (SELECT id FROM categories WHERE name='Production'), 'Nos',  10),
('PRD-010', 'Floor Cleaner',                 (SELECT id FROM categories WHERE name='Production'), 'Ltr',  5);

-- ─── ITEMS (Printing) ────────────────────────────────────
INSERT INTO items (code, name, category_id, unit, reorder_level) VALUES
('PRT-001', 'Bill Roll 3 inch',              (SELECT id FROM categories WHERE name='Printing'), 'Roll', 10),
('PRT-002', 'Bill Roll 2 inch',              (SELECT id FROM categories WHERE name='Printing'), 'Roll', 10),
('PRT-003', 'Ink Cartridge Black',           (SELECT id FROM categories WHERE name='Printing'), 'Nos',  3),
('PRT-004', 'Ink Cartridge Color',           (SELECT id FROM categories WHERE name='Printing'), 'Nos',  3),
('PRT-005', 'A4 Paper Ream',                 (SELECT id FROM categories WHERE name='Printing'), 'Nos',  5);

-- ─── WAREHOUSE STOCK (initial stock for all items) ────────
INSERT INTO warehouse_stock (item_id, quantity, min_level)
SELECT id,
    CASE
        WHEN unit = 'Ltr' THEN 50
        WHEN unit = 'Kg'  THEN 50
        WHEN unit = 'Nos' THEN 200
        ELSE 20
    END,
    reorder_level
FROM items;
