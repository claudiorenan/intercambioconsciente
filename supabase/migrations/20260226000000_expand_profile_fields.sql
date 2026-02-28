-- ============================================================
-- Expand profile fields for matching & community building
-- ============================================================

-- 1. Add new columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS birth_year INT,
  ADD COLUMN IF NOT EXISTS city_origin TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS profession TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS destination_country TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS destination_city TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS planned_departure TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS exchange_objective TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS exchange_duration TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS exchange_status TEXT DEFAULT 'planejando',
  ADD COLUMN IF NOT EXISTS target_language TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS language_level TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS looking_for TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;

-- 2. CHECK constraints for enums
ALTER TABLE profiles
  ADD CONSTRAINT chk_exchange_status
    CHECK (exchange_status IN ('planejando', 'preparando', 'no_exterior', 'retornou'));

ALTER TABLE profiles
  ADD CONSTRAINT chk_language_level
    CHECK (language_level = '' OR language_level IN ('iniciante', 'basico', 'intermediario', 'avancado', 'fluente'));

-- 3. Indexes for matching queries
CREATE INDEX IF NOT EXISTS idx_profiles_destination_country ON profiles (destination_country) WHERE destination_country != '';
CREATE INDEX IF NOT EXISTS idx_profiles_exchange_status ON profiles (exchange_status);
CREATE INDEX IF NOT EXISTS idx_profiles_target_language ON profiles (target_language) WHERE target_language != '';
CREATE INDEX IF NOT EXISTS idx_profiles_city_origin ON profiles (city_origin) WHERE city_origin != '';

-- 4. Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 5. RLS policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
