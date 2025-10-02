-- Migration to add trial and test account fields to users table
-- Run this after deploying the updated schema

-- Add trial period management fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS trial_status TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS trial_starts_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS trial_granted_by TEXT,
ADD COLUMN IF NOT EXISTS trial_granted_at TIMESTAMP;

-- Add test account flag
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN DEFAULT FALSE;

-- Create index for faster trial lookups
CREATE INDEX IF NOT EXISTS idx_users_trial_status ON users(trial_status);
CREATE INDEX IF NOT EXISTS idx_users_trial_ends_at ON users(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_is_test_account ON users(is_test_account);

-- Update any existing demo/test users if needed
-- UPDATE users SET is_test_account = TRUE WHERE username = 'demo' OR email LIKE '%demo%';

-- Add check constraints for data integrity
ALTER TABLE users 
ADD CONSTRAINT chk_trial_status 
CHECK (trial_status IN ('none', 'active', 'expired', 'used'));

ALTER TABLE users 
ADD CONSTRAINT chk_subscription_status 
CHECK (subscription_status IN ('inactive', 'active', 'canceled', 'past_due', 'demo'));

-- Add comment for documentation
COMMENT ON COLUMN users.trial_status IS 'Trial status: none, active, expired, used';
COMMENT ON COLUMN users.trial_starts_at IS 'When the trial period started';
COMMENT ON COLUMN users.trial_ends_at IS 'When the trial period ends';
COMMENT ON COLUMN users.trial_granted_by IS 'Admin username who granted the trial';
COMMENT ON COLUMN users.trial_granted_at IS 'When the trial was granted';
COMMENT ON COLUMN users.is_test_account IS 'Flag for test accounts that bypass subscription checks in non-production';

-- Create a view for easy subscription status checking
CREATE OR REPLACE VIEW user_access_status AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.subscription_status,
    u.subscription_plan,
    u.subscription_ends_at,
    u.trial_status,
    u.trial_ends_at,
    u.is_test_account,
    CASE 
        WHEN u.is_test_account = TRUE AND current_setting('app.environment', true) != 'production' THEN 'test'
        WHEN u.subscription_status = 'active' AND (u.subscription_ends_at IS NULL OR u.subscription_ends_at > NOW()) THEN 'subscription'
        WHEN u.trial_status = 'active' AND u.trial_ends_at > NOW() THEN 'trial'
        WHEN u.subscription_status = 'demo' THEN 'demo'
        ELSE 'none'
    END as access_type,
    CASE 
        WHEN u.is_test_account = TRUE AND current_setting('app.environment', true) != 'production' THEN TRUE
        WHEN u.subscription_status = 'active' AND (u.subscription_ends_at IS NULL OR u.subscription_ends_at > NOW()) THEN TRUE
        WHEN u.trial_status = 'active' AND u.trial_ends_at > NOW() THEN TRUE
        ELSE FALSE
    END as has_access,
    CASE 
        WHEN u.subscription_ends_at IS NOT NULL AND u.subscription_ends_at > NOW() THEN 
            CEIL(EXTRACT(EPOCH FROM (u.subscription_ends_at - NOW())) / 86400)
        WHEN u.trial_ends_at IS NOT NULL AND u.trial_ends_at > NOW() THEN 
            CEIL(EXTRACT(EPOCH FROM (u.trial_ends_at - NOW())) / 86400)
        ELSE 0
    END as days_remaining
FROM users u;

-- Grant access to the view
GRANT SELECT ON user_access_status TO PUBLIC;

COMMENT ON VIEW user_access_status IS 'Consolidated view of user access permissions and subscription status';
