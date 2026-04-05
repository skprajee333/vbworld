ALTER TABLE warehouse_stock_adjustments
    ADD COLUMN lot_id UUID REFERENCES warehouse_stock_lots(id),
    ADD COLUMN reason_type VARCHAR(40) NOT NULL DEFAULT 'GENERAL',
    ADD COLUMN impact_type VARCHAR(40) NOT NULL DEFAULT 'GENERAL';

CREATE INDEX idx_warehouse_stock_adjustments_lot_id ON warehouse_stock_adjustments(lot_id);
