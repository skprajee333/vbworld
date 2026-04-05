-- ============================================================
-- V5__warehouse_admin_and_feedback.sql
-- 1. Add WAREHOUSE_ADMIN role support (no enum change needed — role is VARCHAR)
-- 2. Create feedback table for real backend storage
-- ============================================================

-- ─── UPDATE EXISTING WAREHOUSE_MANAGER users if needed ───────
-- (no schema change needed since role is already VARCHAR(30))

-- ─── FEEDBACK TABLE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
    user_name   VARCHAR(150),
    user_email  VARCHAR(150),
    branch_name VARCHAR(150),
    type        VARCHAR(20) NOT NULL DEFAULT 'FEEDBACK',  -- FEEDBACK | QUERY | BUG | COMPLAINT
    subject     VARCHAR(255) NOT NULL,
    message     TEXT        NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'OPEN',      -- OPEN | IN_PROGRESS | RESOLVED
    admin_note  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_status  ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_user    ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);

CREATE TRIGGER trg_feedback_updated BEFORE UPDATE ON feedback
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
