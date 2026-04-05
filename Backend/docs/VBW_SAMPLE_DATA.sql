-- VB World demo data pack
-- Run this AFTER the Flyway migrations have completed.
-- Safe to re-run: it clears previously created [DEMO] rows first.

BEGIN;

-- Ensure core demo users exist and stay approved.
INSERT INTO users (id, name, email, phone, password_hash, role, branch_id, is_active, status)
SELECT
    gen_random_uuid(),
    v.name,
    v.email,
    v.phone,
    '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
    v.role::VARCHAR,
    b.id,
    TRUE,
    'APPROVED'
FROM (
    VALUES
        ('Suresh Warehouse', 'suresh@vbworld.in', '+91 90000 00001', 'WAREHOUSE_MANAGER', NULL),
        ('Priya Ops', 'priya.ops@vbworld.in', '+91 90000 00002', 'WAREHOUSE_ADMIN', NULL),
        ('Ravi Anna Nagar', 'ravi.annanagar@vbworld.in', '+91 90000 00003', 'RESTAURANT_STAFF', 'Anna Nagar'),
        ('Priya Saligramam', 'priya.saligramam@vbworld.in', '+91 90000 00004', 'RESTAURANT_STAFF', 'Saligramam'),
        ('Karthik T Nagar', 'karthik.tnagar@vbworld.in', '+91 90000 00005', 'RESTAURANT_STAFF', 'T Nagar')
) AS v(name, email, phone, role, branch_name)
LEFT JOIN branches b ON b.name = v.branch_name
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    branch_id = EXCLUDED.branch_id,
    is_active = TRUE,
    status = 'APPROVED';

-- Ensure demo suppliers exist.
INSERT INTO suppliers (
    id, code, name, contact_person, phone, email, lead_time_days, address, notes, is_active
)
VALUES
    (
        gen_random_uuid(),
        'SUP-DEMO-01',
        'Metro Fresh Traders',
        'Mahesh',
        '+91 98840 11111',
        'metrofresh@demo.in',
        2,
        'Koyambedu Wholesale Market, Chennai',
        '[DEMO] Daily vegetables and oil supplier',
        TRUE
    ),
    (
        gen_random_uuid(),
        'SUP-DEMO-02',
        'Rice & Roots Wholesale',
        'Deepa',
        '+91 98840 22222',
        'rice.roots@demo.in',
        3,
        'Parrys Corner, Chennai',
        '[DEMO] Grocery and staples supplier',
        TRUE
    )
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    contact_person = EXCLUDED.contact_person,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    lead_time_days = EXCLUDED.lead_time_days,
    address = EXCLUDED.address,
    notes = EXCLUDED.notes,
    is_active = TRUE;

DO $$
DECLARE
    anna_branch_id UUID;
    saligramam_branch_id UUID;
    tnagar_branch_id UUID;

    admin_user_id UUID;
    warehouse_manager_id UUID;
    warehouse_admin_id UUID;
    anna_user_id UUID;
    saligramam_user_id UUID;
    tnagar_user_id UUID;

    supplier_one_id UUID;
    supplier_two_id UUID;

    oil_item_id UUID;
    onion_item_id UUID;
    tomato_item_id UUID;
    potato_item_id UUID;
    rice_item_id UUID;

    oil_stock_id UUID;
    onion_stock_id UUID;
    tomato_stock_id UUID;
    potato_stock_id UUID;
    rice_stock_id UUID;

    demo_indent_id UUID;
    po_one_id UUID := gen_random_uuid();
    po_two_id UUID := gen_random_uuid();
    po_one_line_one UUID := gen_random_uuid();
    po_one_line_two UUID := gen_random_uuid();
    po_two_line_one UUID := gen_random_uuid();
    po_two_line_two UUID := gen_random_uuid();
    transfer_in_transit_id UUID := gen_random_uuid();
    transfer_received_id UUID := gen_random_uuid();
BEGIN
    SELECT id INTO anna_branch_id FROM branches WHERE name = 'Anna Nagar';
    SELECT id INTO saligramam_branch_id FROM branches WHERE name = 'Saligramam';
    SELECT id INTO tnagar_branch_id FROM branches WHERE name = 'T Nagar';

    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@vbworld.in';
    SELECT id INTO warehouse_manager_id FROM users WHERE email = 'suresh@vbworld.in';
    SELECT id INTO warehouse_admin_id FROM users WHERE email = 'priya.ops@vbworld.in';
    SELECT id INTO anna_user_id FROM users WHERE email = 'ravi.annanagar@vbworld.in';
    SELECT id INTO saligramam_user_id FROM users WHERE email = 'priya.saligramam@vbworld.in';
    SELECT id INTO tnagar_user_id FROM users WHERE email = 'karthik.tnagar@vbworld.in';

    SELECT id INTO supplier_one_id FROM suppliers WHERE code = 'SUP-DEMO-01';
    SELECT id INTO supplier_two_id FROM suppliers WHERE code = 'SUP-DEMO-02';

    SELECT id INTO oil_item_id FROM items WHERE code = 'PRO-001';
    SELECT id INTO onion_item_id FROM items WHERE code = 'PRO-029';
    SELECT id INTO tomato_item_id FROM items WHERE code = 'PRO-030';
    SELECT id INTO potato_item_id FROM items WHERE code = 'PRO-046';
    SELECT id INTO rice_item_id FROM items WHERE code = 'PRO-008';

    SELECT id INTO oil_stock_id FROM warehouse_stock WHERE item_id = oil_item_id;
    SELECT id INTO onion_stock_id FROM warehouse_stock WHERE item_id = onion_item_id;
    SELECT id INTO tomato_stock_id FROM warehouse_stock WHERE item_id = tomato_item_id;
    SELECT id INTO potato_stock_id FROM warehouse_stock WHERE item_id = potato_item_id;
    SELECT id INTO rice_stock_id FROM warehouse_stock WHERE item_id = rice_item_id;

    -- Clean previous demo rows.
    DELETE FROM app_notifications WHERE title LIKE '[DEMO]%' OR message LIKE '[DEMO]%';
    DELETE FROM audit_logs WHERE summary LIKE '[DEMO]%' OR details LIKE '[DEMO]%';
    DELETE FROM feedback WHERE subject LIKE '[DEMO]%' OR message LIKE '[DEMO]%';
    DELETE FROM branch_transfers WHERE COALESCE(reference_number, '') LIKE 'DEMO-TR-%';
    DELETE FROM warehouse_receipts WHERE COALESCE(reference_number, '') LIKE 'DEMO-GRN-%';
    DELETE FROM purchase_orders WHERE po_number LIKE 'PO-DEMO-%';
    DELETE FROM indent_templates WHERE name LIKE '[DEMO]%';
    DELETE FROM indent_items
    WHERE indent_id IN (
        SELECT id FROM indents WHERE COALESCE(notes, '') LIKE '%[DEMO]%'
    );
    DELETE FROM indents WHERE COALESCE(notes, '') LIKE '%[DEMO]%';

    -- Boost stock so transfers, dashboards, and low-stock indicators behave well in demo mode.
    UPDATE warehouse_stock
    SET quantity = CASE
        WHEN item_id = oil_item_id THEN 420
        WHEN item_id = onion_item_id THEN 650
        WHEN item_id = tomato_item_id THEN 520
        WHEN item_id = potato_item_id THEN 480
        WHEN item_id = rice_item_id THEN 900
        ELSE quantity
    END,
    min_level = CASE
        WHEN item_id = oil_item_id THEN 40
        WHEN item_id = onion_item_id THEN 80
        WHEN item_id = tomato_item_id THEN 70
        WHEN item_id = potato_item_id THEN 60
        WHEN item_id = rice_item_id THEN 120
        ELSE min_level
    END,
    last_updated_at = NOW(),
    updated_by = warehouse_admin_id
    WHERE item_id IN (oil_item_id, onion_item_id, tomato_item_id, potato_item_id, rice_item_id);

    -- Demo templates for quick restaurant ordering.
    INSERT INTO indent_templates (
        id, branch_id, created_by, name, description, items, use_count, last_used_at, created_at, updated_at
    ) VALUES
    (
        gen_random_uuid(),
        anna_branch_id,
        anna_user_id,
        '[DEMO] Weekend Breakfast',
        'High-demand weekend prep list',
        jsonb_build_array(
            jsonb_build_object('itemId', onion_item_id, 'quantity', 28, 'notes', 'Breakfast rush'),
            jsonb_build_object('itemId', tomato_item_id, 'quantity', 22, 'notes', 'Chutney + gravy'),
            jsonb_build_object('itemId', oil_item_id, 'quantity', 16, 'notes', 'Frying stock')
        ),
        7,
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '12 days',
        NOW() - INTERVAL '1 day'
    ),
    (
        gen_random_uuid(),
        saligramam_branch_id,
        saligramam_user_id,
        '[DEMO] Midweek Staples',
        'Balanced branch reorder pack',
        jsonb_build_array(
            jsonb_build_object('itemId', rice_item_id, 'quantity', 40, 'notes', 'Lunch service'),
            jsonb_build_object('itemId', onion_item_id, 'quantity', 20, 'notes', 'Base prep'),
            jsonb_build_object('itemId', potato_item_id, 'quantity', 18, 'notes', 'Snacks')
        ),
        4,
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '3 days'
    );

    -- Historical indents for smart suggestions and trend charts.
    FOR i IN 14..3 LOOP
        INSERT INTO indents (
            id, branch_id, created_by, status, expected_date, notes,
            approved_by, approved_at, dispatched_by, dispatched_at, delivered_by, delivered_at,
            created_at, updated_at
        )
        VALUES (
            gen_random_uuid(),
            anna_branch_id,
            anna_user_id,
            'DELIVERED',
            CURRENT_DATE - i + 1,
            '[DEMO] Smart history seed',
            warehouse_manager_id,
            NOW() - make_interval(days => i) + INTERVAL '1 hour',
            warehouse_manager_id,
            NOW() - make_interval(days => i) + INTERVAL '4 hours',
            anna_user_id,
            NOW() - make_interval(days => i) + INTERVAL '8 hours',
            NOW() - make_interval(days => i) + INTERVAL '30 minutes',
            NOW() - make_interval(days => i) + INTERVAL '8 hours'
        )
        RETURNING id INTO demo_indent_id;

        INSERT INTO indent_items (
            id, indent_id, item_id, requested_qty, approved_qty, delivered_qty, unit, notes, created_at, updated_at
        ) VALUES
        (gen_random_uuid(), demo_indent_id, onion_item_id, 14 + (i % 5), 14 + (i % 5), 14 + (i % 5), 'Kg', '[DEMO] onion history', NOW() - make_interval(days => i), NOW() - make_interval(days => i)),
        (gen_random_uuid(), demo_indent_id, tomato_item_id, 12 + (i % 4), 12 + (i % 4), 12 + (i % 4), 'Kg', '[DEMO] tomato history', NOW() - make_interval(days => i), NOW() - make_interval(days => i)),
        (gen_random_uuid(), demo_indent_id, oil_item_id, 6 + (i % 3), 6 + (i % 3), 6 + (i % 3), 'Ltr', '[DEMO] oil history', NOW() - make_interval(days => i), NOW() - make_interval(days => i));
    END LOOP;

    -- Current operational indents for status dashboards.
    INSERT INTO indents (
        id, branch_id, created_by, status, expected_date, notes, created_at, updated_at
    ) VALUES
    (
        gen_random_uuid(),
        anna_branch_id,
        anna_user_id,
        'SUBMITTED',
        CURRENT_DATE + 1,
        '[DEMO] Pending branch request',
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '2 hours'
    );

    INSERT INTO indents (
        id, branch_id, created_by, status, expected_date, notes,
        approved_by, approved_at, created_at, updated_at
    ) VALUES
    (
        gen_random_uuid(),
        saligramam_branch_id,
        saligramam_user_id,
        'APPROVED',
        CURRENT_DATE + 1,
        '[DEMO] Approved branch request',
        warehouse_manager_id,
        NOW() - INTERVAL '5 hours',
        NOW() - INTERVAL '6 hours',
        NOW() - INTERVAL '5 hours'
    );

    INSERT INTO indents (
        id, branch_id, created_by, status, expected_date, notes,
        approved_by, approved_at, dispatched_by, dispatched_at, created_at, updated_at
    ) VALUES
    (
        gen_random_uuid(),
        tnagar_branch_id,
        tnagar_user_id,
        'DISPATCHED',
        CURRENT_DATE,
        '[DEMO] In transit branch request',
        warehouse_manager_id,
        NOW() - INTERVAL '8 hours',
        warehouse_manager_id,
        NOW() - INTERVAL '4 hours',
        NOW() - INTERVAL '9 hours',
        NOW() - INTERVAL '4 hours'
    );

    -- Add line items to the current operational indents.
    INSERT INTO indent_items (id, indent_id, item_id, requested_qty, approved_qty, delivered_qty, unit, notes, created_at, updated_at)
    SELECT gen_random_uuid(), id, onion_item_id, 20, NULL, NULL, 'Kg', '[DEMO] current pending item', created_at, updated_at
    FROM indents WHERE notes = '[DEMO] Pending branch request';

    INSERT INTO indent_items (id, indent_id, item_id, requested_qty, approved_qty, delivered_qty, unit, notes, created_at, updated_at)
    SELECT gen_random_uuid(), id, rice_item_id, 45, 45, NULL, 'Kg', '[DEMO] current approved item', created_at, updated_at
    FROM indents WHERE notes = '[DEMO] Approved branch request';

    INSERT INTO indent_items (id, indent_id, item_id, requested_qty, approved_qty, delivered_qty, unit, notes, created_at, updated_at)
    SELECT gen_random_uuid(), id, potato_item_id, 30, 28, NULL, 'Kg', '[DEMO] current dispatched item', created_at, updated_at
    FROM indents WHERE notes = '[DEMO] In transit branch request';

    -- Demo purchase orders.
    INSERT INTO purchase_orders (
        id, po_number, supplier_id, po_status, expected_date, reference_number, notes,
        created_at, sent_at, updated_at, created_by, updated_by
    ) VALUES
    (
        po_one_id,
        'PO-DEMO-001',
        supplier_one_id,
        'SENT',
        CURRENT_DATE + 2,
        'DEMO-PO-REF-001',
        '[DEMO] Open PO for upcoming vegetable demand',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '1 day',
        warehouse_admin_id,
        warehouse_admin_id
    ),
    (
        po_two_id,
        'PO-DEMO-002',
        supplier_two_id,
        'PARTIALLY_RECEIVED',
        CURRENT_DATE + 1,
        'DEMO-PO-REF-002',
        '[DEMO] Partially received staples PO',
        NOW() - INTERVAL '4 days',
        NOW() - INTERVAL '4 days',
        NOW() - INTERVAL '1 day',
        warehouse_manager_id,
        warehouse_admin_id
    );

    INSERT INTO purchase_order_items (
        id, purchase_order_id, item_id, ordered_quantity, received_quantity, unit_cost, notes
    ) VALUES
    (po_one_line_one, po_one_id, onion_item_id, 120, 0, 32.00, '[DEMO] Fresh onion restock'),
    (po_one_line_two, po_one_id, tomato_item_id, 100, 0, 28.00, '[DEMO] Fresh tomato restock'),
    (po_two_line_one, po_two_id, rice_item_id, 250, 120, 58.00, '[DEMO] Rice batch one'),
    (po_two_line_two, po_two_id, oil_item_id, 80, 20, 145.00, '[DEMO] Oil batch one');

    -- Linked GRN receipts.
    INSERT INTO warehouse_receipts (
        id, item_id, stock_id, supplier_id, purchase_order_id, purchase_order_item_id,
        reference_number, supplier_name, quantity_received, ordered_quantity, shortage_quantity, damaged_quantity,
        quantity_before, quantity_after, unit_cost, invoice_number, receipt_status, notes,
        received_at, received_by
    ) VALUES
    (
        gen_random_uuid(),
        rice_item_id,
        rice_stock_id,
        supplier_two_id,
        po_two_id,
        po_two_line_one,
        'DEMO-GRN-001',
        'Rice & Roots Wholesale',
        120,
        250,
        0,
        0,
        780,
        900,
        58.00,
        'DEMO-INV-001',
        'RECEIVED_OK',
        '[DEMO] Linked PO receipt',
        NOW() - INTERVAL '1 day',
        warehouse_admin_id
    ),
    (
        gen_random_uuid(),
        oil_item_id,
        oil_stock_id,
        supplier_two_id,
        po_two_id,
        po_two_line_two,
        'DEMO-GRN-002',
        'Rice & Roots Wholesale',
        20,
        80,
        5,
        0,
        400,
        420,
        145.00,
        'DEMO-INV-002',
        'RECEIVED_WITH_DISCREPANCY',
        '[DEMO] Linked PO receipt with shortage',
        NOW() - INTERVAL '12 hours',
        warehouse_admin_id
    );

    -- Demo transfers.
    INSERT INTO branch_transfers (
        id, item_id, stock_id, destination_branch_id, transfer_status, quantity_transferred,
        quantity_before, quantity_after, reference_number, notes,
        transferred_at, transferred_by, received_at, received_by
    ) VALUES
    (
        transfer_in_transit_id,
        potato_item_id,
        potato_stock_id,
        anna_branch_id,
        'IN_TRANSIT',
        25,
        480,
        455,
        'DEMO-TR-001',
        '[DEMO] Potato transfer on the way',
        NOW() - INTERVAL '3 hours',
        warehouse_manager_id,
        NULL,
        NULL
    ),
    (
        transfer_received_id,
        onion_item_id,
        onion_stock_id,
        saligramam_branch_id,
        'RECEIVED',
        18,
        668,
        650,
        'DEMO-TR-002',
        '[DEMO] Onion transfer already received',
        NOW() - INTERVAL '2 days',
        warehouse_manager_id,
        NOW() - INTERVAL '36 hours',
        saligramam_user_id
    );

    -- Demo feedback.
    INSERT INTO feedback (
        id, user_id, user_name, user_email, branch_name, type, subject, message, status, admin_note, created_at, updated_at
    ) VALUES
    (
        gen_random_uuid(),
        anna_user_id,
        'Ravi Anna Nagar',
        'ravi.annanagar@vbworld.in',
        'Anna Nagar',
        'QUERY',
        '[DEMO] Tomato delivery timing',
        '[DEMO] Need confirmation on timing for the next tomato dispatch.',
        'IN_PROGRESS',
        'Warehouse team is coordinating with dispatch.',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '6 hours'
    ),
    (
        gen_random_uuid(),
        saligramam_user_id,
        'Priya Saligramam',
        'priya.saligramam@vbworld.in',
        'Saligramam',
        'FEEDBACK',
        '[DEMO] Smart order helpful',
        '[DEMO] The smart order suggestion matched our weekend demand closely.',
        'RESOLVED',
        'Thanks, keeping the model tuned on your branch trend.',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '1 day'
    );

    -- Demo notifications.
    INSERT INTO app_notifications (
        id, user_id, notification_type, title, message, action_url, related_entity_type, related_entity_id, is_read, created_at, read_at
    ) VALUES
    (gen_random_uuid(), anna_user_id, 'INDENT', '[DEMO] Indent approved', '[DEMO] Your latest indent has been approved and is queued for dispatch.', '/history', 'INDENT', NULL, FALSE, NOW() - INTERVAL '2 hours', NULL),
    (gen_random_uuid(), warehouse_manager_id, 'PURCHASE_ORDER', '[DEMO] Purchase order created', '[DEMO] PO-DEMO-001 was created for Metro Fresh Traders.', '/purchase-orders', 'PURCHASE_ORDER', po_one_id, FALSE, NOW() - INTERVAL '5 hours', NULL),
    (gen_random_uuid(), warehouse_admin_id, 'GRN_DISCREPANCY', '[DEMO] GRN discrepancy recorded', '[DEMO] Oil receipt had a shortage and needs follow-up.', '/grn', 'WAREHOUSE_RECEIPT', NULL, FALSE, NOW() - INTERVAL '10 hours', NULL),
    (gen_random_uuid(), saligramam_user_id, 'TRANSFER', '[DEMO] Transfer received', '[DEMO] Onion transfer was marked received for Saligramam.', '/transfers', 'BRANCH_TRANSFER', transfer_received_id, TRUE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '18 hours');

    -- Demo audit logs.
    INSERT INTO audit_logs (
        id, actor_id, actor_name, actor_role, module_name, action_type, entity_type, entity_id, summary, details, created_at
    ) VALUES
    (gen_random_uuid(), warehouse_manager_id, 'Suresh Warehouse', 'WAREHOUSE_MANAGER', 'INDENTS', 'INDENT_APPROVED', 'INDENT', NULL, '[DEMO] Approved pending branch indent', '[DEMO] Approved Anna Nagar branch demand request.', NOW() - INTERVAL '2 hours'),
    (gen_random_uuid(), warehouse_admin_id, 'Priya Ops', 'WAREHOUSE_ADMIN', 'PROCUREMENT', 'PURCHASE_ORDER_CREATED', 'PURCHASE_ORDER', po_one_id, '[DEMO] Created PO-DEMO-001', '[DEMO] Created supplier PO for Metro Fresh Traders.', NOW() - INTERVAL '5 hours'),
    (gen_random_uuid(), warehouse_admin_id, 'Priya Ops', 'WAREHOUSE_ADMIN', 'WAREHOUSE', 'STOCK_RECEIVED', 'WAREHOUSE_RECEIPT', NULL, '[DEMO] Received linked GRN with discrepancy', '[DEMO] Oil receipt created a shortage follow-up.', NOW() - INTERVAL '10 hours'),
    (gen_random_uuid(), saligramam_user_id, 'Priya Saligramam', 'RESTAURANT_STAFF', 'TRANSFERS', 'TRANSFER_RECEIVED', 'BRANCH_TRANSFER', transfer_received_id, '[DEMO] Confirmed transfer receipt', '[DEMO] Saligramam branch received onion transfer.', NOW() - INTERVAL '36 hours');
END $$;

COMMIT;
