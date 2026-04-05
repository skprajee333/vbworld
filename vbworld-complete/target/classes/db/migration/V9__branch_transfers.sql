CREATE TABLE branch_transfers (
    id UUID PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES items(id),
    stock_id UUID NOT NULL REFERENCES warehouse_stock(id),
    destination_branch_id UUID NOT NULL REFERENCES branches(id),
    transfer_status VARCHAR(30) NOT NULL,
    quantity_transferred NUMERIC(12,3) NOT NULL,
    quantity_before NUMERIC(12,3) NOT NULL,
    quantity_after NUMERIC(12,3) NOT NULL,
    reference_number VARCHAR(120),
    notes TEXT,
    transferred_at TIMESTAMP NOT NULL DEFAULT NOW(),
    transferred_by UUID REFERENCES users(id),
    received_at TIMESTAMP,
    received_by UUID REFERENCES users(id)
);

CREATE INDEX idx_branch_transfers_branch_status
    ON branch_transfers(destination_branch_id, transfer_status, transferred_at DESC);

CREATE INDEX idx_branch_transfers_item_time
    ON branch_transfers(item_id, transferred_at DESC);
