-- ============================================================
-- V3__smart_features.sql
-- Indent Templates + Smart Suggestion tracking
-- ============================================================

-- ─── ENSURE set_updated_at function exists ──────────────────
-- (already created in V1, but re-declaring safely)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ─── INDENT TEMPLATES ───────────────────────────────────────
CREATE TABLE indent_templates (
    id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id    UUID         NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    created_by   UUID         NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    description  TEXT,
    items        JSONB        NOT NULL DEFAULT '[]',
    use_count    INT          NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_branch     ON indent_templates(branch_id);
CREATE INDEX idx_templates_created_by ON indent_templates(created_by);

CREATE TRIGGER trg_templates_updated_at
    BEFORE UPDATE ON indent_templates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── SUGGESTION FEEDBACK ────────────────────────────────────
CREATE TABLE suggestion_feedback (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id       UUID        NOT NULL REFERENCES branches(id),
    user_id         UUID        NOT NULL REFERENCES users(id),
    target_date     DATE        NOT NULL,
    day_of_week     INT         NOT NULL,
    suggestion_data JSONB       NOT NULL DEFAULT '[]',
    acted_on        BOOLEAN     NOT NULL DEFAULT FALSE,
    indent_id       UUID        REFERENCES indents(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suggestion_branch ON suggestion_feedback(branch_id);
CREATE INDEX idx_suggestion_date   ON suggestion_feedback(target_date DESC);

-- ─── EXTRA INDEX ON USERS ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
