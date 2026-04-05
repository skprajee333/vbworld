ALTER TABLE branches
    ADD COLUMN forecast_horizon_days INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN safety_stock_days INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN auto_replenish_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN auto_replenish_min_confidence_pct INTEGER NOT NULL DEFAULT 55;
