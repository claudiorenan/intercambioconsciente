-- ============================================================
-- Intercâmbio Consciente — Initial Schema
-- Tables: profiles, checkins, feed_posts, post_reactions,
--         post_replies, events, event_registrations,
--         follows, notifications, content_filters
-- ============================================================

-- 1. Profiles
-- ------------------------------------------------------------

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    email TEXT,
    bio TEXT DEFAULT '',
    photo_url TEXT,
    profile_type TEXT NOT NULL DEFAULT 'intercambista'
        CHECK (profile_type IN ('intercambista', 'futuro', 'familiar', 'profissional')),
    role TEXT NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'mentor', 'admin')),
    specialty TEXT,
    crp TEXT,
    languages TEXT[] DEFAULT ARRAY['pt']::TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO profiles (id, name, email, profile_type)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'profile_type', 'intercambista')
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- 2. Checkins (emotional check-ins)
-- ------------------------------------------------------------

CREATE TABLE checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    mood TEXT NOT NULL CHECK (mood IN ('otimo', 'bem', 'neutro', 'ansioso', 'triste', 'saudade')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checkins_user ON checkins(user_id, created_at DESC);

ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins"
    ON checkins FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own checkins"
    ON checkins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Feed Posts
-- ------------------------------------------------------------

CREATE TABLE feed_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
    topic TEXT CHECK (topic IN ('adaptacao', 'saudade', 'cultura', 'idioma', 'financeiro', 'dicas', 'volta')),
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_created ON feed_posts(created_at DESC);
CREATE INDEX idx_posts_topic ON feed_posts(topic, created_at DESC);

ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts are viewable by everyone"
    ON feed_posts FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts"
    ON feed_posts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
    ON feed_posts FOR DELETE USING (auth.uid() = user_id);

-- 4. Post Reactions
-- ------------------------------------------------------------

CREATE TABLE post_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reaction TEXT NOT NULL DEFAULT 'apoio',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (post_id, user_id)
);

ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions are viewable by everyone"
    ON post_reactions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can react"
    ON post_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
    ON post_reactions FOR DELETE USING (auth.uid() = user_id);

-- 5. Post Replies
-- ------------------------------------------------------------

CREATE TABLE post_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_replies_post ON post_replies(post_id, created_at);

ALTER TABLE post_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Replies are viewable by everyone"
    ON post_replies FOR SELECT USING (true);

CREATE POLICY "Authenticated users can reply"
    ON post_replies FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Events
-- ------------------------------------------------------------

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    description TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN ('roda', 'workshop', 'jornada', 'live')),
    event_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    max_spots INTEGER,
    current_spots INTEGER NOT NULL DEFAULT 0,
    payment_link TEXT,
    meeting_link TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_date ON events(event_date) WHERE is_active = true;
CREATE INDEX idx_events_host ON events(host_id);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by everyone"
    ON events FOR SELECT USING (true);

CREATE POLICY "Mentors can create events"
    ON events FOR INSERT
    WITH CHECK (
        auth.uid() = host_id
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'mentor')
    );

CREATE POLICY "Mentors can update own events"
    ON events FOR UPDATE
    USING (auth.uid() = host_id);

-- 7. Event Registrations
-- ------------------------------------------------------------

CREATE TABLE event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_id, user_id)
);

ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own registrations"
    ON event_registrations FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Event hosts can view registrations"
    ON event_registrations FOR SELECT
    USING (EXISTS (SELECT 1 FROM events WHERE id = event_id AND host_id = auth.uid()));

CREATE POLICY "Users can register for events"
    ON event_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. Follows
-- ------------------------------------------------------------

CREATE TABLE follows (
    follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id <> following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are viewable by everyone"
    ON follows FOR SELECT USING (true);

CREATE POLICY "Users can follow"
    ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
    ON follows FOR DELETE USING (auth.uid() = follower_id);

-- 9. Notifications
-- ------------------------------------------------------------

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- 10. Content Filter (contact info detection)
-- ------------------------------------------------------------

CREATE TABLE content_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO content_filters (name, enabled) VALUES
    ('dm_feature', true),
    ('events_feature', true),
    ('community_feature', true);

-- Content filter function
CREATE OR REPLACE FUNCTION check_content_contact_info()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check for phone numbers
    IF NEW.content ~ '\+?\d{1,3}[\s.-]?\(?\d{2,3}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}' THEN
        RAISE EXCEPTION 'Conteúdo bloqueado: contém número de telefone';
    END IF;

    -- Check for emails
    IF NEW.content ~ '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' THEN
        RAISE EXCEPTION 'Conteúdo bloqueado: contém endereço de email';
    END IF;

    -- Check for URLs
    IF NEW.content ~ 'https?://[^\s]+' THEN
        RAISE EXCEPTION 'Conteúdo bloqueado: contém link externo';
    END IF;

    RETURN NEW;
END;
$$;

-- Apply to feed_posts
CREATE TRIGGER check_posts_contact_info
    BEFORE INSERT OR UPDATE ON feed_posts
    FOR EACH ROW
    EXECUTE FUNCTION check_content_contact_info();

-- Apply to post_replies
CREATE TRIGGER check_replies_contact_info
    BEFORE INSERT OR UPDATE ON post_replies
    FOR EACH ROW
    EXECUTE FUNCTION check_content_contact_info();

-- 11. Rate Limiting
-- ------------------------------------------------------------

CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limits_lookup ON rate_limits(user_id, action, created_at DESC);

CREATE OR REPLACE FUNCTION check_rate_limit(p_action TEXT, p_max INTEGER, p_window_seconds INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN RETURN false; END IF;

    SELECT COUNT(*) INTO v_count
    FROM rate_limits
    WHERE user_id = v_user_id
      AND action = p_action
      AND created_at > now() - (p_window_seconds || ' seconds')::INTERVAL;

    IF v_count >= p_max THEN
        RETURN false;
    END IF;

    INSERT INTO rate_limits (user_id, action) VALUES (v_user_id, p_action);
    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated;
