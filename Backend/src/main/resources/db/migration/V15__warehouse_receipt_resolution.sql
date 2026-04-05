ALTER TABLE warehouse_receipts
    ADD COLUMN resolution_status VARCHAR(40) NOT NULL DEFAULT 'NOT_REQUIRED',
    ADD COLUMN resolution_notes TEXT,
    ADD COLUMN resolved_at TIMESTAMP,
    ADD COLUMN resolved_by UUID REFERENCES users(id),
    ADD COLUMN return_status VARCHAR(40) NOT NULL DEFAULT 'NOT_REQUIRED',
    ADD COLUMN returned_quantity NUMERIC(12, 3),
    ADD COLUMN return_reference VARCHAR(120),
    ADD COLUMN return_notes TEXT,
    ADD COLUMN returned_at TIMESTAMP;
