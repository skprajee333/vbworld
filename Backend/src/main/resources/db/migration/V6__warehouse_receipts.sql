CREATE TABLE warehouse_receipts (
    id UUID PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES items(id),
    stock_id UUID NOT NULL REFERENCES warehouse_stock(id),
    reference_number VARCHAR(50),
    supplier_name VARCHAR(150),
    quantity_received NUMERIC(12,3) NOT NULL,
    quantity_before NUMERIC(12,3) NOT NULL,
    quantity_after NUMERIC(12,3) NOT NULL,
    unit_cost NUMERIC(12,2),
    notes TEXT,
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    received_by UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX idx_warehouse_receipts_item_id
    ON warehouse_receipts(item_id);

CREATE INDEX idx_warehouse_receipts_received_at
    ON warehouse_receipts(received_at DESC);
