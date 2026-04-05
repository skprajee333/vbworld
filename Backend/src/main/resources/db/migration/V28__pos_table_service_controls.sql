ALTER TABLE pos_orders
    ADD COLUMN assigned_staff_name VARCHAR(120),
    ADD COLUMN guest_count INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN service_status VARCHAR(30) NOT NULL DEFAULT 'SEATED',
    ADD COLUMN served_at TIMESTAMP,
    ADD COLUMN bill_requested_at TIMESTAMP;
