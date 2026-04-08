-- Migration 024: Add email preferences and verification status
-- Adds email preference settings and email verification tracking to profiles table

BEGIN;

-- Add email_preferences jsonb column to profiles
ALTER TABLE profiles
ADD COLUMN email_preferences jsonb DEFAULT '{
  "marketing": true,
  "price_alerts": true,
  "trade_updates": true,
  "weekly_digest": true
}'::jsonb;

-- Add email_verified boolean column to profiles
ALTER TABLE profiles
ADD COLUMN email_verified boolean DEFAULT false;

-- Create index for email preference queries
CREATE INDEX idx_profiles_email_verified ON profiles(email_verified);

-- Add comment for documentation
COMMENT ON COLUMN profiles.email_preferences IS 'User email notification preferences';
COMMENT ON COLUMN profiles.email_verified IS 'Whether user has verified their email address';

COMMIT;
