-- ============================================================
-- Migration: Admin Groups + Admin RLS
-- Date: 2026-02-24
-- Description: Creates groups table, admin RLS policies, and is_admin() helper
-- ============================================================

-- Helper function: is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- ============================================================
-- Table: groups
-- ============================================================
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    country_code TEXT,
    continent TEXT,
    platform TEXT NOT NULL DEFAULT 'whatsapp' CHECK (platform IN ('whatsapp', 'telegram', 'discord', 'other')),
    invite_link TEXT,
    emoji TEXT DEFAULT '🌍',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Groups RLS: anyone can read active groups
CREATE POLICY "groups_select_active" ON public.groups
    FOR SELECT USING (is_active = true);

-- Groups RLS: only admin can insert
CREATE POLICY "groups_insert_admin" ON public.groups
    FOR INSERT WITH CHECK (public.is_admin());

-- Groups RLS: only admin can update
CREATE POLICY "groups_update_admin" ON public.groups
    FOR UPDATE USING (public.is_admin());

-- Groups RLS: only admin can delete
CREATE POLICY "groups_delete_admin" ON public.groups
    FOR DELETE USING (public.is_admin());

-- ============================================================
-- Events: Add admin policies (alongside existing mentor policies)
-- ============================================================

-- Admin can insert events
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'events_insert_admin' AND tablename = 'events'
    ) THEN
        CREATE POLICY "events_insert_admin" ON public.events
            FOR INSERT WITH CHECK (public.is_admin());
    END IF;
END
$$;

-- Admin can update any event
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'events_update_admin' AND tablename = 'events'
    ) THEN
        CREATE POLICY "events_update_admin" ON public.events
            FOR UPDATE USING (public.is_admin());
    END IF;
END
$$;

-- Admin can delete any event
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'events_delete_admin' AND tablename = 'events'
    ) THEN
        CREATE POLICY "events_delete_admin" ON public.events
            FOR DELETE USING (public.is_admin());
    END IF;
END
$$;

-- ============================================================
-- Set admin role for claudiorenan1@gmail.com
-- ============================================================
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'claudiorenan1@gmail.com';

-- Also try by auth.users email in case profiles.email is not populated
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'claudiorenan1@gmail.com'
);

-- Updated_at trigger for groups
CREATE OR REPLACE FUNCTION public.update_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER groups_updated_at
    BEFORE UPDATE ON public.groups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_groups_updated_at();
