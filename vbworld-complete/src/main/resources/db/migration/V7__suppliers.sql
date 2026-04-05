CREATE TABLE suppliers (
    id UUID PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(120),
    phone VARCHAR(30),
    email VARCHAR(150),
    lead_time_days INTEGER NOT NULL DEFAULT 2,
    address TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_suppliers_name
    ON suppliers(name);
