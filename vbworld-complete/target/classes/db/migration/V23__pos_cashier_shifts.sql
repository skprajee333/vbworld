CREATE TABLE IF NOT EXISTS pos_cashier_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    user_id UUID NOT NULL REFERENCES users(id),
    shift_status VARCHAR(20) NOT NULL,
    opening_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
    closing_cash NUMERIC(12,2),
    expected_cash NUMERIC(12,2),
    variance_amount NUMERIC(12,2),
    notes TEXT,
    opened_at TIMESTAMP NOT NULL DEFAULT now(),
    closed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
