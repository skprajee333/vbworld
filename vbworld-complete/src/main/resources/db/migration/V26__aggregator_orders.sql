CREATE TABLE aggregator_orders (
    id UUID PRIMARY KEY,
    branch_id UUID NOT NULL REFERENCES branches(id),
    source VARCHAR(30) NOT NULL,
    external_order_id VARCHAR(80) NOT NULL,
    customer_name VARCHAR(120),
    customer_phone VARCHAR(20),
    delivery_address TEXT,
    items_json TEXT NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    packaging_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
    delivery_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    aggregator_status VARCHAR(30) NOT NULL DEFAULT 'NEW',
    payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    reconciliation_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    payout_reference VARCHAR(80),
    payout_amount NUMERIC(12,2),
    notes TEXT,
    ordered_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    delivered_at TIMESTAMP,
    reconciled_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_aggregator_order UNIQUE (source, external_order_id)
);

CREATE INDEX idx_aggregator_orders_branch_ordered_at ON aggregator_orders(branch_id, ordered_at DESC);
CREATE INDEX idx_aggregator_orders_statuses ON aggregator_orders(aggregator_status, payment_status, reconciliation_status);
