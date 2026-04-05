-- ============================================================
-- V1__initial_schema.sql  — matches Java entities exactly
-- ============================================================
SET search_path TO public;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── updated_at trigger function ─────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- ─── BRANCHES ────────────────────────────────────────────
CREATE TABLE branches (
    id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       VARCHAR(100) NOT NULL,
    address    TEXT,
    city       VARCHAR(60)  NOT NULL DEFAULT 'Chennai',
    phone      VARCHAR(20),
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_branches_updated BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── CATEGORIES (INTEGER id — matches CategoryEntity) ────
CREATE TABLE categories (
    id          SERIAL       PRIMARY KEY,
    name        VARCHAR(80)  NOT NULL UNIQUE,
    description TEXT,
    sort_order  INT          NOT NULL DEFAULT 0
);

-- ─── USERS ───────────────────────────────────────────────
CREATE TABLE users (
    id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    phone         VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(30)  NOT NULL,
    branch_id     UUID         REFERENCES branches(id),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_users_email  ON users(email);
CREATE INDEX idx_users_active ON users(is_active);

-- ─── ITEMS ───────────────────────────────────────────────
CREATE TABLE items (
    id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    code          VARCHAR(30)   NOT NULL UNIQUE,
    name          VARCHAR(200)  NOT NULL,
    category_id   INT           REFERENCES categories(id),
    unit          VARCHAR(10)   NOT NULL DEFAULT 'Nos',
    reorder_level NUMERIC(10,3) NOT NULL DEFAULT 10,
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_items_updated BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_items_active   ON items(is_active);

-- ─── WAREHOUSE STOCK ─────────────────────────────────────
CREATE TABLE warehouse_stock (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id         UUID          NOT NULL UNIQUE REFERENCES items(id),
    quantity        NUMERIC(12,3) NOT NULL DEFAULT 0,
    min_level       NUMERIC(10,3) NOT NULL DEFAULT 5,
    max_level       NUMERIC(10,3),
    last_updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_by      UUID          REFERENCES users(id)
);
CREATE INDEX idx_wh_stock_item ON warehouse_stock(item_id);

-- ─── INDENTS ─────────────────────────────────────────────
CREATE TABLE indents (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    indent_number  VARCHAR(30) NOT NULL UNIQUE,
    branch_id      UUID        NOT NULL REFERENCES branches(id),
    created_by     UUID        NOT NULL REFERENCES users(id),
    status         VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    expected_date  DATE,
    notes          TEXT,
    approved_by    UUID        REFERENCES users(id),
    approved_at    TIMESTAMPTZ,
    dispatched_by  UUID        REFERENCES users(id),
    dispatched_at  TIMESTAMPTZ,
    delivered_by   UUID        REFERENCES users(id),
    delivered_at   TIMESTAMPTZ,
    cancelled_at   TIMESTAMPTZ,
    cancel_reason  TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_indents_updated BEFORE UPDATE ON indents
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_indents_branch ON indents(branch_id);
CREATE INDEX idx_indents_status ON indents(status);

-- Auto-generate indent number
CREATE SEQUENCE indent_number_seq START 1;
CREATE OR REPLACE FUNCTION generate_indent_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.indent_number IS NULL OR NEW.indent_number = '' THEN
        NEW.indent_number := 'IND-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                             LPAD(NEXTVAL('indent_number_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_indent_number BEFORE INSERT ON indents
    FOR EACH ROW EXECUTE FUNCTION generate_indent_number();

-- ─── INDENT ITEMS ─────────────────────────────────────────
CREATE TABLE indent_items (
    id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    indent_id     UUID          NOT NULL REFERENCES indents(id) ON DELETE CASCADE,
    item_id       UUID          NOT NULL REFERENCES items(id),
    requested_qty NUMERIC(10,2) NOT NULL,
    approved_qty  NUMERIC(10,2),
    delivered_qty NUMERIC(10,2),
    unit          VARCHAR(10),
    notes         TEXT,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_indent_items_updated BEFORE UPDATE ON indent_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_indent_items_indent ON indent_items(indent_id);
