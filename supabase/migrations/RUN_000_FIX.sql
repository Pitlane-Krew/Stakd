-- ============================================================
-- STAKD: PRE-FIX — Run this FIRST before the other RUN scripts
-- Creates the set_updated_at() function alias that new migrations expect
-- ============================================================

-- The original schema created update_updated_at() as the function
-- and "set_updated_at" as the trigger name. New migrations reference
-- set_updated_at() as a function. This creates the missing function.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also ensure the is_admin() function exists (used by RLS policies)
-- If it already exists from migration 013, this will just replace it safely
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = user_uuid
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
