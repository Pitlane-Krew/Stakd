-- ============================================================
-- 013_admin_security_cms.sql
-- Admin panel, RBAC, audit logging, CMS, moderation tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- ─── USER STATUS COLUMNS ────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'banned')),
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS ban_reason text,
  ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS flagged_count int NOT NULL DEFAULT 0;

-- ─── ADMIN ROLES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('super_admin', 'admin', 'moderator', 'support')),
  granted_by uuid REFERENCES profiles(id),
  expires_at timestamptz,              -- null = permanent
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id)                     -- one role per user
);

-- ─── AUDIT LOGS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES profiles(id),
  actor_role text,
  action text NOT NULL,                -- e.g. 'user.suspend', 'role.grant'
  target_type text,                    -- 'user', 'post', 'plan', 'setting'
  target_id text,                      -- UUID or slug as string
  payload jsonb DEFAULT '{}',          -- { before, after, meta }
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- ─── REPORTS (community-flagged content) ────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  target_type text NOT NULL CHECK (target_type IN ('post', 'comment', 'restock', 'item', 'user', 'trade')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewed', 'dismissed', 'actioned')),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ─── ANNOUNCEMENTS / BANNERS ────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info'
    CHECK (type IN ('info', 'warning', 'maintenance', 'feature')),
  cta_label text,
  cta_url text,
  is_active boolean NOT NULL DEFAULT false,
  show_from timestamptz,
  show_until timestamptz,
  target_tier text,                    -- null = all users
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ─── CMS PAGES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,           -- 'about', 'faq', 'terms', 'privacy'
  title text NOT NULL,
  content jsonb DEFAULT '[]',          -- array of content blocks
  meta_title text,
  meta_description text,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed default CMS pages
INSERT INTO cms_pages (slug, title, is_published) VALUES
  ('about', 'About STAKD', false),
  ('faq', 'Frequently Asked Questions', false),
  ('terms', 'Terms of Service', false),
  ('privacy', 'Privacy Policy', false),
  ('home', 'Home Page', false)
ON CONFLICT (slug) DO NOTHING;

-- ─── MEMBERSHIP PLANS (DB-driven, replaces config/tiers.ts as source of truth) ──
CREATE TABLE IF NOT EXISTS membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,           -- 'free', 'pro', 'elite'
  tagline text,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  price_annual numeric(10,2) NOT NULL DEFAULT 0,
  color text,
  features jsonb DEFAULT '[]',         -- feature list for display
  limits jsonb DEFAULT '{}',           -- { maxCollections, priceAlerts, ... }
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  stripe_price_id_monthly text,        -- null until Stripe integration
  stripe_price_id_annual text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed initial plans
INSERT INTO membership_plans (name, slug, tagline, price_monthly, price_annual, color, sort_order) VALUES
  ('Starter', 'free', 'Everything you need to start tracking', 0, 0, '#6b7280', 0),
  ('Pro', 'pro', 'For serious collectors who want an edge', 7.99, 69.99, '#7c3aed', 1),
  ('Elite', 'elite', 'Unlimited power for top-tier collectors', 14.99, 129.99, '#f59e0b', 2)
ON CONFLICT (slug) DO NOTHING;

-- ─── COUPONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric(10,2) NOT NULL,
  applies_to_plan text,                -- null = any plan
  max_uses int,                        -- null = unlimited
  used_count int NOT NULL DEFAULT 0,
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Coupon redemption tracking
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  redeemed_at timestamptz DEFAULT now(),
  UNIQUE (coupon_id, user_id)          -- one use per user per coupon
);

-- ─── SYSTEM SETTINGS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now()
);

-- Seed default settings
INSERT INTO system_settings (key, value, description) VALUES
  ('beta_mode', 'true', 'When true, all features are free (pre-launch)'),
  ('maintenance_mode', 'false', 'When true, show maintenance page'),
  ('signups_enabled', 'true', 'Allow new user registrations'),
  ('ai_grading_enabled', 'true', 'Enable Claude grading features'),
  ('valuation_enabled', 'true', 'Enable real-time price fetching'),
  ('max_free_collections', '5', 'Max collections for free tier'),
  ('max_free_items', '50', 'Max items per collection for free tier')
ON CONFLICT (key) DO NOTHING;

-- ─── PRICE SOURCE CONFIGS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS price_source_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL UNIQUE,    -- 'ebay', 'psa', 'goldin', 'stockx'
  display_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  priority int NOT NULL DEFAULT 0,     -- lower = higher priority
  refresh_interval_hours int NOT NULL DEFAULT 24,
  last_refresh_at timestamptz,
  last_error text,
  error_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO price_source_configs (source_name, display_name, is_enabled, priority, refresh_interval_hours) VALUES
  ('ebay', 'eBay', true, 1, 12),
  ('psa', 'PSA Marketplace', true, 2, 24),
  ('goldin', 'Goldin Auctions', true, 3, 24),
  ('stockx', 'StockX', false, 4, 24),
  ('manual', 'Manual Entry', true, 99, 0)
ON CONFLICT (source_name) DO NOTHING;

-- ─── RATE LIMIT EVENTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,            -- IP or user_id
  endpoint text NOT NULL,
  event_count int NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ─── INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_admin_roles_user ON admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, show_from, show_until);
CREATE INDEX IF NOT EXISTS idx_rate_limit ON rate_limit_events(identifier, endpoint, window_start DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────

-- Admin roles: only service role can read/write (all checks via API)
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_roles_deny_all ON admin_roles FOR ALL TO authenticated USING (false);

-- Audit logs: admins can read via API (no direct client access)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_deny_all ON audit_logs FOR ALL TO authenticated USING (false);

-- Reports: authenticated users can create + read their own
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY reports_insert ON reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY reports_select_own ON reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

-- Announcements: public readable when active
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY announcements_public_read ON announcements FOR SELECT
  USING (
    is_active = true
    AND (show_from IS NULL OR show_from <= now())
    AND (show_until IS NULL OR show_until > now())
  );

-- CMS pages: public readable when published
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY cms_pages_public_read ON cms_pages FOR SELECT
  USING (is_published = true);

-- Membership plans: public readable when active and public
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY plans_public_read ON membership_plans FOR SELECT
  USING (is_active = true AND is_public = true);

-- System settings: no direct client access
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY system_settings_deny_all ON system_settings FOR ALL TO authenticated USING (false);

-- Coupons: no direct client access
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY coupons_deny_all ON coupons FOR ALL TO authenticated USING (false);

-- Price source configs: public readable
ALTER TABLE price_source_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY price_sources_public_read ON price_source_configs FOR SELECT USING (true);

-- Rate limit events: no direct client access
ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY rate_limit_deny_all ON rate_limit_events FOR ALL TO authenticated USING (false);

-- ─── HELPER FUNCTION: check if user is admin ─────────────────
CREATE OR REPLACE FUNCTION is_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = user_uuid
      AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: get user's admin role
CREATE OR REPLACE FUNCTION get_admin_role(user_uuid uuid)
RETURNS text AS $$
  SELECT role FROM admin_roles
  WHERE user_id = user_uuid
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
