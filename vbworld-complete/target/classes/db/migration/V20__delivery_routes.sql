CREATE TABLE delivery_routes (
    id UUID PRIMARY KEY,
    route_date DATE NOT NULL,
    delivery_slot VARCHAR(20) NOT NULL,
    route_name VARCHAR(120) NOT NULL,
    driver_name VARCHAR(120) NOT NULL,
    driver_phone VARCHAR(20),
    vehicle_number VARCHAR(40) NOT NULL,
    vehicle_type VARCHAR(40),
    route_status VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    notes TEXT,
    assigned_by UUID REFERENCES users(id),
    dispatched_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE delivery_route_indents (
    id UUID PRIMARY KEY,
    route_id UUID NOT NULL REFERENCES delivery_routes(id) ON DELETE CASCADE,
    indent_id UUID NOT NULL REFERENCES indents(id) ON DELETE CASCADE,
    stop_order INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(route_id, indent_id),
    UNIQUE(indent_id)
);
