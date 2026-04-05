CREATE TABLE warehouse_stock_adjustments (
    id UUID PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES items(id),
    stock_id UUID NOT NULL REFERENCES warehouse_stock(id),
    adjustment_type VARCHAR(30) NOT NULL,
    quantity_delta NUMERIC(12,3) NOT NULL,
    quantity_before NUMERIC(12,3) NOT NULL,
    quantity_after NUMERIC(12,3) NOT NULL,
    reason VARCHAR(200) NOT NULL,
    notes TEXT,
    adjusted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    adjusted_by UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX idx_stock_adjustments_item_id
    ON warehouse_stock_adjustments(item_id);

CREATE INDEX idx_stock_adjustments_adjusted_at
    ON warehouse_stock_adjustments(adjusted_at DESC);
