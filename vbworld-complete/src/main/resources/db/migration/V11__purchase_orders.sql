CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY,
    po_number VARCHAR(60) NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    po_status VARCHAR(40) NOT NULL,
    expected_date DATE,
    reference_number VARCHAR(120),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY,
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id),
    ordered_quantity NUMERIC(12,3) NOT NULL,
    received_quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
    unit_cost NUMERIC(12,2),
    notes TEXT
);

CREATE INDEX idx_purchase_orders_supplier_status
    ON purchase_orders(supplier_id, po_status, created_at DESC);

CREATE INDEX idx_purchase_order_items_po
    ON purchase_order_items(purchase_order_id);
