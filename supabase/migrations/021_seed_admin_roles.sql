-- ============================================================
-- 021_seed_admin_roles.sql
-- Grant super_admin roles to platform founders
-- Run this in Supabase SQL Editor AFTER users have signed up
-- ============================================================

-- Grant super_admin to designermbp@gmail.com
INSERT INTO admin_roles (user_id, role, granted_by)
SELECT au.id, 'super_admin', au.id
FROM auth.users au
WHERE au.email = 'designermbp@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM admin_roles ar WHERE ar.user_id = au.id
  );

-- Grant super_admin to kronoztime@gmail.com
INSERT INTO admin_roles (user_id, role, granted_by)
SELECT au.id, 'super_admin', au.id
FROM auth.users au
WHERE au.email = 'kronoztime@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM admin_roles ar WHERE ar.user_id = au.id
  );

-- Also grant super_admin to bizzysquad@gmail.com (project owner)
INSERT INTO admin_roles (user_id, role, granted_by)
SELECT au.id, 'super_admin', au.id
FROM auth.users au
WHERE au.email = 'bizzysquad@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM admin_roles ar WHERE ar.user_id = au.id
  );

-- ─── Allow users to read their OWN admin role (for UI visibility) ──
-- The original 013 migration denies ALL client access.
-- We need a SELECT policy so the useAdmin() hook can check the role.
DROP POLICY IF EXISTS admin_roles_self_read ON admin_roles;
CREATE POLICY admin_roles_self_read ON admin_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Verify the grants
-- SELECT au.email, ar.role, ar.created_at
-- FROM admin_roles ar
-- JOIN auth.users au ON au.id = ar.user_id
-- ORDER BY ar.created_at;
