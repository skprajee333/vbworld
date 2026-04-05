CREATE TABLE aggregator_integrations (
    id UUID PRIMARY KEY,
    branch_id UUID NOT NULL REFERENCES branches(id),
    source VARCHAR(30) NOT NULL,
    store_code VARCHAR(80) NOT NULL,
    outlet_name VARCHAR(120),
    integration_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    auto_sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sync_interval_minutes INTEGER NOT NULL DEFAULT 15,
    last_sync_at TIMESTAMP,
    last_sync_status VARCHAR(20),
    last_sync_message TEXT,
    last_order_imported_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_aggregator_integration_branch_source_store UNIQUE (branch_id, source, store_code)
);
