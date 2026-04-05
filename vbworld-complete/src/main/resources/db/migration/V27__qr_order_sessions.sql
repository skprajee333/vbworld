CREATE TABLE qr_order_sessions (
    id UUID PRIMARY KEY,
    branch_id UUID NOT NULL REFERENCES branches(id),
    table_id UUID NOT NULL REFERENCES restaurant_tables(id),
    session_token VARCHAR(80) NOT NULL UNIQUE,
    session_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    customer_name VARCHAR(120),
    customer_phone VARCHAR(20),
    notes TEXT,
    expires_at TIMESTAMP NOT NULL,
    last_ordered_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_qr_order_sessions_table_status
    ON qr_order_sessions(table_id, session_status, expires_at DESC);

CREATE INDEX idx_qr_order_sessions_token_status
    ON qr_order_sessions(session_token, session_status);
