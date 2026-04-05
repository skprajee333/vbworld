ALTER TABLE pos_orders
    ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(60),
    ADD COLUMN IF NOT EXISTS split_count INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS pos_order_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES pos_orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(30) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    reference_number VARCHAR(80),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
