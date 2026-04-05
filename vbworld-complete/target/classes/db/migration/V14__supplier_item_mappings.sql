CREATE TABLE supplier_item_mappings (
    id UUID PRIMARY KEY,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    supplier_sku VARCHAR(60),
    last_unit_cost NUMERIC(12, 2),
    min_order_quantity NUMERIC(12, 3),
    lead_time_days INTEGER,
    is_preferred BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_supplier_item_mapping UNIQUE (supplier_id, item_id)
);

CREATE INDEX idx_supplier_item_mappings_supplier ON supplier_item_mappings(supplier_id);
CREATE INDEX idx_supplier_item_mappings_item ON supplier_item_mappings(item_id);
CREATE UNIQUE INDEX uq_supplier_item_preferred_active
    ON supplier_item_mappings(item_id)
    WHERE is_preferred = TRUE AND is_active = TRUE;
