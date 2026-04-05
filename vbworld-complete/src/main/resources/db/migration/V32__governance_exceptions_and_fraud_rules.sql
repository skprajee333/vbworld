CREATE TABLE fraud_control_rules (
    id UUID PRIMARY KEY,
    rule_code VARCHAR(80) NOT NULL UNIQUE,
    rule_name VARCHAR(150) NOT NULL,
    module_scope VARCHAR(80) NOT NULL,
    risk_level VARCHAR(30) NOT NULL,
    threshold_value NUMERIC(14,2),
    threshold_unit VARCHAR(40),
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    auto_create_exception BOOLEAN NOT NULL DEFAULT TRUE,
    escalation_roles TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE governance_exceptions (
    id UUID PRIMARY KEY,
    rule_id UUID REFERENCES fraud_control_rules(id),
    title VARCHAR(180) NOT NULL,
    module_name VARCHAR(80) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id UUID,
    risk_level VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    summary VARCHAR(255) NOT NULL,
    details TEXT,
    triggered_by UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    triggered_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP,
    resolution_note TEXT
);

CREATE INDEX idx_fraud_control_rules_code ON fraud_control_rules(rule_code);
CREATE INDEX idx_governance_exceptions_status ON governance_exceptions(status, risk_level, triggered_at DESC);

INSERT INTO fraud_control_rules (
    id, rule_code, rule_name, module_scope, risk_level, threshold_value, threshold_unit,
    is_enabled, auto_create_exception, escalation_roles
) VALUES
(
    'cdb17f43-f4e4-4c9c-8d76-bfcb0dfe0001',
    'IMPERSONATION_SESSION',
    'Impersonation Session Started',
    'AUTH',
    'HIGH',
    NULL,
    NULL,
    TRUE,
    TRUE,
    'ADMIN,WAREHOUSE_ADMIN'
),
(
    'cdb17f43-f4e4-4c9c-8d76-bfcb0dfe0002',
    'GRN_DISCREPANCY',
    'GRN Discrepancy Detected',
    'WAREHOUSE',
    'MEDIUM',
    1,
    'units',
    TRUE,
    TRUE,
    'ADMIN,WAREHOUSE_ADMIN,WAREHOUSE_MANAGER'
),
(
    'cdb17f43-f4e4-4c9c-8d76-bfcb0dfe0003',
    'LARGE_STOCK_ADJUSTMENT',
    'Large Stock Adjustment',
    'WAREHOUSE',
    'HIGH',
    50,
    'base_units',
    TRUE,
    TRUE,
    'ADMIN,WAREHOUSE_ADMIN'
),
(
    'cdb17f43-f4e4-4c9c-8d76-bfcb0dfe0004',
    'VENDOR_RETURN',
    'Vendor Return Triggered',
    'WAREHOUSE',
    'HIGH',
    10,
    'base_units',
    TRUE,
    TRUE,
    'ADMIN,WAREHOUSE_ADMIN,WAREHOUSE_MANAGER'
)
ON CONFLICT (rule_code) DO NOTHING;
