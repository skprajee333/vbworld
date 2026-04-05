ALTER TABLE warehouse_receipts
    ADD COLUMN supplier_id UUID REFERENCES suppliers(id),
    ADD COLUMN ordered_quantity NUMERIC(12,3),
    ADD COLUMN shortage_quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
    ADD COLUMN damaged_quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
    ADD COLUMN invoice_number VARCHAR(120),
    ADD COLUMN receipt_status VARCHAR(40) NOT NULL DEFAULT 'RECEIVED_OK';

UPDATE warehouse_receipts
SET shortage_quantity = 0,
    damaged_quantity = 0,
    receipt_status = 'RECEIVED_OK'
WHERE shortage_quantity IS NULL
   OR damaged_quantity IS NULL
   OR receipt_status IS NULL;

CREATE INDEX idx_warehouse_receipts_supplier_time
    ON warehouse_receipts(supplier_id, received_at DESC);
