-- ============================================================
-- V4__user_status.sql
-- Add status field to users for approval workflow
-- ============================================================

-- Add status column
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'PENDING';

-- Approve all existing users (admin, seed data users)
UPDATE users SET status = 'APPROVED' WHERE status = 'PENDING';

-- Add index
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
