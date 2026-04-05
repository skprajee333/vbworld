CREATE TABLE customers (
    id UUID PRIMARY KEY,
    branch_id UUID REFERENCES branches(id),
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(150),
    total_visits INTEGER NOT NULL DEFAULT 0,
    total_spend NUMERIC(12,2) NOT NULL DEFAULT 0,
    points_balance INTEGER NOT NULL DEFAULT 0,
    lifetime_points_earned INTEGER NOT NULL DEFAULT 0,
    lifetime_points_redeemed INTEGER NOT NULL DEFAULT 0,
    last_visit_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_loyalty_transactions (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    order_id UUID REFERENCES pos_orders(id),
    transaction_type VARCHAR(30) NOT NULL,
    points INTEGER NOT NULL,
    amount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE pos_orders
    ADD COLUMN customer_id UUID REFERENCES customers(id),
    ADD COLUMN loyalty_redeemed_points INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN loyalty_discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE INDEX idx_customers_branch_last_visit ON customers(branch_id, last_visit_at DESC);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customer_loyalty_customer ON customer_loyalty_transactions(customer_id, created_at DESC);
