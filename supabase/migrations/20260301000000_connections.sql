-- ============================================================
-- Connections (matching entre intercambistas)
-- ============================================================

-- Table
CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','blocked')),
    compatibility_score INTEGER NOT NULL DEFAULT 0 CHECK (compatibility_score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (requester_id, addressee_id),
    CHECK (requester_id <> addressee_id)
);

-- Indices
CREATE INDEX idx_connections_requester_status ON connections (requester_id, status);
CREATE INDEX idx_connections_addressee_status ON connections (addressee_id, status);
CREATE INDEX idx_connections_pair ON connections (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
CREATE INDEX idx_connections_pending ON connections (status) WHERE status = 'pending';

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_connection_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_connection_updated
    BEFORE UPDATE ON connections
    FOR EACH ROW
    EXECUTE FUNCTION update_connection_timestamp();

-- RLS
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "connections_select" ON connections
    FOR SELECT USING (
        auth.uid() = requester_id OR auth.uid() = addressee_id
    );

-- INSERT/UPDATE handled via SECURITY DEFINER RPCs below

-- ============================================================
-- RPC: get_matching_profiles
-- Returns profiles ranked by compatibility score
-- ============================================================
CREATE OR REPLACE FUNCTION get_matching_profiles(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    photo_url TEXT,
    destination_country TEXT,
    destination_city TEXT,
    target_language TEXT,
    language_level TEXT,
    exchange_status TEXT,
    interests TEXT[],
    bio TEXT,
    city_origin TEXT,
    score INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_country TEXT;
    v_language TEXT;
    v_status TEXT;
    v_interests TEXT[];
BEGIN
    -- Get current user's profile fields
    SELECT p.destination_country, p.target_language, p.exchange_status, p.interests
    INTO v_country, v_language, v_status, v_interests
    FROM profiles p
    WHERE p.id = p_user_id;

    RETURN QUERY
    SELECT
        pr.id,
        pr.name,
        pr.photo_url,
        pr.destination_country,
        pr.destination_city,
        pr.target_language,
        pr.language_level,
        pr.exchange_status,
        pr.interests,
        pr.bio,
        pr.city_origin,
        (
            -- Country match: 40 pts
            CASE WHEN v_country IS NOT NULL AND pr.destination_country = v_country THEN 40 ELSE 0 END
            +
            -- Phase/status match: 25 pts
            CASE WHEN v_status IS NOT NULL AND pr.exchange_status = v_status THEN 25 ELSE 0 END
            +
            -- Language match: 20 pts
            CASE WHEN v_language IS NOT NULL AND pr.target_language = v_language THEN 20 ELSE 0 END
            +
            -- Interests overlap: up to 15 pts (3 pts per shared interest, max 5)
            CASE
                WHEN v_interests IS NOT NULL AND pr.interests IS NOT NULL
                THEN LEAST(
                    (SELECT COUNT(*) FROM unnest(v_interests) vi WHERE vi = ANY(pr.interests))::INTEGER * 3,
                    15
                )
                ELSE 0
            END
        )::INTEGER AS score
    FROM profiles pr
    WHERE pr.id <> p_user_id
      AND pr.is_active = true
      AND pr.role = 'user'
      AND NOT EXISTS (
          SELECT 1 FROM connections c
          WHERE (
              (c.requester_id = p_user_id AND c.addressee_id = pr.id)
              OR
              (c.requester_id = pr.id AND c.addressee_id = p_user_id)
          )
      )
    ORDER BY score DESC, pr.name ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- ============================================================
-- RPC: send_connection_request
-- ============================================================
CREATE OR REPLACE FUNCTION send_connection_request(
    p_addressee_id UUID,
    p_score INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_conn_id UUID;
    v_requester_name TEXT;
BEGIN
    -- Prevent duplicates (either direction)
    IF EXISTS (
        SELECT 1 FROM connections
        WHERE (requester_id = auth.uid() AND addressee_id = p_addressee_id)
           OR (requester_id = p_addressee_id AND addressee_id = auth.uid())
    ) THEN
        RAISE EXCEPTION 'Connection already exists between these users';
    END IF;

    INSERT INTO connections (requester_id, addressee_id, compatibility_score, status)
    VALUES (auth.uid(), p_addressee_id, p_score, 'pending')
    RETURNING id INTO v_conn_id;

    -- Create notification for addressee
    SELECT name INTO v_requester_name FROM profiles WHERE profiles.id = auth.uid();

    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        p_addressee_id,
        'connection_request',
        'Nova solicitação de conexão',
        COALESCE(v_requester_name, 'Alguém') || ' quer se conectar com você!',
        jsonb_build_object('connection_id', v_conn_id, 'requester_id', auth.uid())
    );

    RETURN v_conn_id;
END;
$$;

-- ============================================================
-- RPC: respond_connection_request
-- ============================================================
CREATE OR REPLACE FUNCTION respond_connection_request(
    p_connection_id UUID,
    p_accept BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_conn RECORD;
    v_responder_name TEXT;
BEGIN
    SELECT * INTO v_conn FROM connections WHERE id = p_connection_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Connection not found';
    END IF;

    IF v_conn.addressee_id <> auth.uid() THEN
        RAISE EXCEPTION 'Only the addressee can respond to this request';
    END IF;

    IF v_conn.status <> 'pending' THEN
        RAISE EXCEPTION 'Connection is no longer pending';
    END IF;

    UPDATE connections
    SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END
    WHERE id = p_connection_id;

    -- Notify the requester
    SELECT name INTO v_responder_name FROM profiles WHERE profiles.id = auth.uid();

    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        v_conn.requester_id,
        CASE WHEN p_accept THEN 'connection_accepted' ELSE 'connection_rejected' END,
        CASE WHEN p_accept THEN 'Conexão aceita!' ELSE 'Solicitação recusada' END,
        COALESCE(v_responder_name, 'Alguém') || CASE WHEN p_accept THEN ' aceitou sua solicitação de conexão!' ELSE ' recusou sua solicitação.' END,
        jsonb_build_object('connection_id', p_connection_id, 'responder_id', auth.uid())
    );
END;
$$;
