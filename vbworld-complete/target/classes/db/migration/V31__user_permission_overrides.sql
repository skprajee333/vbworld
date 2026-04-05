CREATE TABLE user_permission_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_key VARCHAR(80) NOT NULL,
    is_enabled BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_permission_override UNIQUE (user_id, permission_key)
);

CREATE INDEX idx_user_permission_overrides_user ON user_permission_overrides(user_id);
