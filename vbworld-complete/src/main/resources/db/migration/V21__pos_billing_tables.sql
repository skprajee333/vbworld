ALTER TABLE items
    ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS restaurant_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    table_number VARCHAR(30) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 4,
    table_status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_restaurant_table_branch_number UNIQUE (branch_id, table_number)
);

CREATE TABLE IF NOT EXISTS pos_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    table_id UUID REFERENCES restaurant_tables(id),
    order_number VARCHAR(40) NOT NULL UNIQUE,
    order_type VARCHAR(20) NOT NULL,
    order_status VARCHAR(20) NOT NULL,
    customer_name VARCHAR(120),
    customer_phone VARCHAR(20),
    notes TEXT,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    kot_sent_at TIMESTAMP,
    billed_at TIMESTAMP,
    paid_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pos_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES pos_orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id),
    quantity NUMERIC(10,3) NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    line_total NUMERIC(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

INSERT INTO restaurant_tables (branch_id, table_number, capacity, table_status, is_active)
SELECT b.id, 'T' || gs.n, CASE WHEN gs.n <= 4 THEN 2 ELSE 4 END, 'AVAILABLE', TRUE
FROM branches b
CROSS JOIN generate_series(1, 8) AS gs(n)
WHERE NOT EXISTS (
    SELECT 1
    FROM restaurant_tables rt
    WHERE rt.branch_id = b.id
);
