ALTER TABLE warehouse_receipts
    ADD COLUMN batch_number VARCHAR(120),
    ADD COLUMN expiry_date DATE,
    ADD COLUMN received_uom VARCHAR(40),
    ADD COLUMN units_per_pack NUMERIC(12,3) NOT NULL DEFAULT 1,
    ADD COLUMN base_quantity_received NUMERIC(12,3) NOT NULL DEFAULT 0;

UPDATE warehouse_receipts
SET units_per_pack = 1,
    base_quantity_received = quantity_received
WHERE base_quantity_received = 0;

CREATE TABLE warehouse_stock_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id UUID NOT NULL REFERENCES warehouse_stock(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id),
    supplier_id UUID REFERENCES suppliers(id),
    source_receipt_id UUID REFERENCES warehouse_receipts(id) ON DELETE SET NULL,
    batch_number VARCHAR(120),
    expiry_date DATE,
    received_uom VARCHAR(40),
    units_per_pack NUMERIC(12,3) NOT NULL DEFAULT 1,
    quantity_received NUMERIC(12,3) NOT NULL,
    base_quantity_received NUMERIC(12,3) NOT NULL,
    remaining_quantity NUMERIC(12,3) NOT NULL,
    unit_cost NUMERIC(12,2),
    reference_number VARCHAR(50),
    invoice_number VARCHAR(120),
    notes TEXT,
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    received_by UUID REFERENCES users(id)
);

CREATE INDEX idx_warehouse_stock_lots_stock_id ON warehouse_stock_lots(stock_id);
CREATE INDEX idx_warehouse_stock_lots_item_id ON warehouse_stock_lots(item_id);
CREATE INDEX idx_warehouse_stock_lots_expiry_date ON warehouse_stock_lots(expiry_date);
