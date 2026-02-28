-- ============================================================
-- Admin Engagement Metrics RPCs
-- 6 SECURITY DEFINER functions for the admin metrics dashboard
-- ============================================================

-- 1. admin_get_engagement_overview(p_days) → JSONB
-- Returns global KPIs: active users, temperature, content counts, etc.
CREATE OR REPLACE FUNCTION admin_get_engagement_overview(p_days INT DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_result JSONB;
    v_since TIMESTAMPTZ := now() - (p_days || ' days')::INTERVAL;
    v_total_users BIGINT;
    v_active_users BIGINT;
    v_new_users BIGINT;
    v_total_checkins BIGINT;
    v_total_posts BIGINT;
    v_total_reactions BIGINT;
    v_total_replies BIGINT;
    v_total_connections_accepted BIGINT;
    v_total_connections BIGINT;
    v_total_event_regs BIGINT;
    v_total_messages BIGINT;
    v_profiles_completed BIGINT;
    v_notif_total BIGINT;
    v_notif_read BIGINT;
    v_global_temp NUMERIC;
BEGIN
    SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
    IF v_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Forbidden';
    END IF;

    SELECT count(*) INTO v_total_users FROM profiles;

    -- Active = has any activity (checkin, post, reaction, reply, message, connection) in period
    SELECT count(DISTINCT u) INTO v_active_users FROM (
        SELECT user_id AS u FROM checkins WHERE created_at >= v_since
        UNION SELECT user_id FROM feed_posts WHERE created_at >= v_since
        UNION SELECT user_id FROM post_reactions WHERE created_at >= v_since
        UNION SELECT user_id FROM post_replies WHERE created_at >= v_since
        UNION SELECT sender_id FROM messages WHERE created_at >= v_since
        UNION SELECT requester_id FROM connections WHERE created_at >= v_since
    ) sub;

    SELECT count(*) INTO v_new_users FROM profiles WHERE created_at >= v_since;
    SELECT count(*) INTO v_total_checkins FROM checkins WHERE created_at >= v_since;
    SELECT count(*) INTO v_total_posts FROM feed_posts WHERE created_at >= v_since;
    SELECT count(*) INTO v_total_reactions FROM post_reactions WHERE created_at >= v_since;
    SELECT count(*) INTO v_total_replies FROM post_replies WHERE created_at >= v_since;
    SELECT count(*) INTO v_total_connections_accepted FROM connections WHERE status = 'accepted' AND updated_at >= v_since;
    SELECT count(*) INTO v_total_connections FROM connections WHERE created_at >= v_since;
    SELECT count(*) INTO v_total_event_regs FROM event_registrations WHERE created_at >= v_since;
    SELECT count(*) INTO v_total_messages FROM messages WHERE created_at >= v_since;
    SELECT count(*) INTO v_profiles_completed FROM profiles WHERE profile_completed_at IS NOT NULL;
    SELECT count(*) INTO v_notif_total FROM notifications WHERE created_at >= v_since;
    SELECT count(*) INTO v_notif_read FROM notifications WHERE created_at >= v_since AND read_at IS NOT NULL;

    -- Global temperature: average of per-user temperatures (simplified for overview)
    -- Uses same formula as user list but averaged
    IF v_total_users > 0 THEN
        WITH user_scores AS (
            SELECT
                p.id,
                LEAST(COALESCE(ck.cnt, 0)::NUMERIC / 15, 1) * 25 +
                LEAST(COALESCE(fp.cnt, 0)::NUMERIC / 4, 1) * 20 +
                LEAST((COALESCE(pr.cnt, 0) + COALESCE(rp.cnt, 0))::NUMERIC / 10, 1) * 15 +
                LEAST(COALESCE(cn.cnt, 0)::NUMERIC / 3, 1) * 15 +
                LEAST(COALESCE(ev.cnt, 0)::NUMERIC / 2, 1) * 10 +
                LEAST(COALESCE(ms.cnt, 0)::NUMERIC / 10, 1) * 10 +
                CASE WHEN p.profile_completed_at IS NOT NULL THEN 5 ELSE 0 END AS temp
            FROM profiles p
            LEFT JOIN (SELECT user_id, count(*) cnt FROM checkins WHERE created_at >= v_since GROUP BY user_id) ck ON ck.user_id = p.id
            LEFT JOIN (SELECT user_id, count(*) cnt FROM feed_posts WHERE created_at >= v_since GROUP BY user_id) fp ON fp.user_id = p.id
            LEFT JOIN (SELECT user_id, count(*) cnt FROM post_reactions WHERE created_at >= v_since GROUP BY user_id) pr ON pr.user_id = p.id
            LEFT JOIN (SELECT user_id, count(*) cnt FROM post_replies WHERE created_at >= v_since GROUP BY user_id) rp ON rp.user_id = p.id
            LEFT JOIN (SELECT requester_id AS user_id, count(*) cnt FROM connections WHERE status = 'accepted' AND updated_at >= v_since GROUP BY requester_id) cn ON cn.user_id = p.id
            LEFT JOIN (SELECT user_id, count(*) cnt FROM event_registrations WHERE created_at >= v_since GROUP BY user_id) ev ON ev.user_id = p.id
            LEFT JOIN (SELECT sender_id AS user_id, count(*) cnt FROM messages WHERE created_at >= v_since GROUP BY sender_id) ms ON ms.user_id = p.id
        )
        SELECT ROUND(AVG(temp), 1) INTO v_global_temp FROM user_scores;
    ELSE
        v_global_temp := 0;
    END IF;

    v_result := jsonb_build_object(
        'total_users', v_total_users,
        'active_users_period', v_active_users,
        'new_users_period', v_new_users,
        'global_temperature', COALESCE(v_global_temp, 0),
        'total_checkins', v_total_checkins,
        'total_posts', v_total_posts,
        'total_reactions', v_total_reactions,
        'total_replies', v_total_replies,
        'total_connections_accepted', v_total_connections_accepted,
        'connection_accept_rate', CASE WHEN v_total_connections > 0 THEN ROUND(v_total_connections_accepted::NUMERIC / v_total_connections * 100, 1) ELSE 0 END,
        'total_event_registrations', v_total_event_regs,
        'total_messages', v_total_messages,
        'profiles_completed_pct', CASE WHEN v_total_users > 0 THEN ROUND(v_profiles_completed::NUMERIC / v_total_users * 100, 1) ELSE 0 END,
        'notification_read_rate', CASE WHEN v_notif_total > 0 THEN ROUND(v_notif_read::NUMERIC / v_notif_total * 100, 1) ELSE 0 END
    );

    RETURN v_result;
END;
$$;


-- 2. admin_get_mood_distribution(p_days) → TABLE
-- Groups checkins by mood with percentages
CREATE OR REPLACE FUNCTION admin_get_mood_distribution(p_days INT DEFAULT 30)
RETURNS TABLE(mood TEXT, count BIGINT, pct NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_since TIMESTAMPTZ := now() - (p_days || ' days')::INTERVAL;
    v_total BIGINT;
BEGIN
    SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
    IF v_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Forbidden';
    END IF;

    SELECT count(*) INTO v_total FROM checkins WHERE created_at >= v_since;

    RETURN QUERY
    SELECT
        c.mood,
        count(*)::BIGINT AS count,
        CASE WHEN v_total > 0 THEN ROUND(count(*)::NUMERIC / v_total * 100, 1) ELSE 0 END AS pct
    FROM checkins c
    WHERE c.created_at >= v_since
    GROUP BY c.mood
    ORDER BY count DESC;
END;
$$;


-- 3. admin_get_content_activity(p_days) → TABLE
-- Daily content activity (posts, reactions, replies) using generate_series
CREATE OR REPLACE FUNCTION admin_get_content_activity(p_days INT DEFAULT 14)
RETURNS TABLE(day DATE, posts BIGINT, reactions BIGINT, replies BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
    IF v_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Forbidden';
    END IF;

    RETURN QUERY
    SELECT
        d.day::DATE,
        COALESCE(fp.cnt, 0)::BIGINT AS posts,
        COALESCE(pr.cnt, 0)::BIGINT AS reactions,
        COALESCE(rp.cnt, 0)::BIGINT AS replies
    FROM generate_series(
        (now() - (p_days || ' days')::INTERVAL)::DATE,
        now()::DATE,
        '1 day'::INTERVAL
    ) AS d(day)
    LEFT JOIN (
        SELECT created_at::DATE AS dt, count(*) AS cnt
        FROM feed_posts
        WHERE created_at >= now() - (p_days || ' days')::INTERVAL
        GROUP BY dt
    ) fp ON fp.dt = d.day::DATE
    LEFT JOIN (
        SELECT created_at::DATE AS dt, count(*) AS cnt
        FROM post_reactions
        WHERE created_at >= now() - (p_days || ' days')::INTERVAL
        GROUP BY dt
    ) pr ON pr.dt = d.day::DATE
    LEFT JOIN (
        SELECT created_at::DATE AS dt, count(*) AS cnt
        FROM post_replies
        WHERE created_at >= now() - (p_days || ' days')::INTERVAL
        GROUP BY dt
    ) rp ON rp.dt = d.day::DATE
    ORDER BY d.day;
END;
$$;


-- 4. admin_get_user_engagement_list(p_days, p_limit, p_offset, p_sort) → TABLE
-- Paginated user list with individual engagement temperature
CREATE OR REPLACE FUNCTION admin_get_user_engagement_list(
    p_days INT DEFAULT 30,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0,
    p_sort TEXT DEFAULT 'temp_desc'
)
RETURNS TABLE(
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    user_photo TEXT,
    checkins_count BIGINT,
    posts_count BIGINT,
    social_count BIGINT,
    connections_count BIGINT,
    events_count BIGINT,
    messages_count BIGINT,
    profile_complete BOOLEAN,
    temperature NUMERIC,
    total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_since TIMESTAMPTZ := now() - (p_days || ' days')::INTERVAL;
    v_total BIGINT;
BEGIN
    SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
    IF v_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Forbidden';
    END IF;

    SELECT count(*) INTO v_total FROM profiles;

    RETURN QUERY
    WITH scores AS (
        SELECT
            p.id AS uid,
            p.name AS uname,
            p.email AS uemail,
            p.photo_url AS uphoto,
            COALESCE(ck.cnt, 0)::BIGINT AS ck_cnt,
            COALESCE(fp.cnt, 0)::BIGINT AS fp_cnt,
            (COALESCE(pr.cnt, 0) + COALESCE(rp.cnt, 0))::BIGINT AS social_cnt,
            COALESCE(cn.cnt, 0)::BIGINT AS cn_cnt,
            COALESCE(ev.cnt, 0)::BIGINT AS ev_cnt,
            COALESCE(ms.cnt, 0)::BIGINT AS ms_cnt,
            (p.profile_completed_at IS NOT NULL) AS prof_complete,
            ROUND(
                LEAST(COALESCE(ck.cnt, 0)::NUMERIC / 15, 1) * 25 +
                LEAST(COALESCE(fp.cnt, 0)::NUMERIC / 4, 1) * 20 +
                LEAST((COALESCE(pr.cnt, 0) + COALESCE(rp.cnt, 0))::NUMERIC / 10, 1) * 15 +
                LEAST(COALESCE(cn.cnt, 0)::NUMERIC / 3, 1) * 15 +
                LEAST(COALESCE(ev.cnt, 0)::NUMERIC / 2, 1) * 10 +
                LEAST(COALESCE(ms.cnt, 0)::NUMERIC / 10, 1) * 10 +
                CASE WHEN p.profile_completed_at IS NOT NULL THEN 5 ELSE 0 END
            , 1) AS temp
        FROM profiles p
        LEFT JOIN (SELECT user_id, count(*) cnt FROM checkins WHERE created_at >= v_since GROUP BY user_id) ck ON ck.user_id = p.id
        LEFT JOIN (SELECT user_id, count(*) cnt FROM feed_posts WHERE created_at >= v_since GROUP BY user_id) fp ON fp.user_id = p.id
        LEFT JOIN (SELECT user_id, count(*) cnt FROM post_reactions WHERE created_at >= v_since GROUP BY user_id) pr ON pr.user_id = p.id
        LEFT JOIN (SELECT user_id, count(*) cnt FROM post_replies WHERE created_at >= v_since GROUP BY user_id) rp ON rp.user_id = p.id
        LEFT JOIN (SELECT requester_id AS user_id, count(*) cnt FROM connections WHERE status = 'accepted' AND updated_at >= v_since GROUP BY requester_id) cn ON cn.user_id = p.id
        LEFT JOIN (SELECT user_id, count(*) cnt FROM event_registrations WHERE created_at >= v_since GROUP BY user_id) ev ON ev.user_id = p.id
        LEFT JOIN (SELECT sender_id AS user_id, count(*) cnt FROM messages WHERE created_at >= v_since GROUP BY sender_id) ms ON ms.user_id = p.id
    )
    SELECT
        s.uid,
        s.uname,
        s.uemail,
        s.uphoto,
        s.ck_cnt,
        s.fp_cnt,
        s.social_cnt,
        s.cn_cnt,
        s.ev_cnt,
        s.ms_cnt,
        s.prof_complete,
        s.temp,
        v_total
    FROM scores s
    ORDER BY
        CASE WHEN p_sort = 'temp_desc' THEN s.temp END DESC NULLS LAST,
        CASE WHEN p_sort = 'temp_asc' THEN s.temp END ASC NULLS LAST,
        CASE WHEN p_sort = 'name_asc' THEN s.uname END ASC NULLS LAST,
        CASE WHEN p_sort = 'name_desc' THEN s.uname END DESC NULLS LAST,
        s.temp DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


-- 5. admin_get_journey_progress_summary() → JSONB
-- Distribution by phase, diagnostic classification, readiness averages
CREATE OR REPLACE FUNCTION admin_get_journey_progress_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_result JSONB;
    v_phase_dist JSONB;
    v_class_dist JSONB;
    v_avg_readiness JSONB;
    v_tasks_completed BIGINT;
    v_tasks_total BIGINT;
    v_exercises_completed BIGINT;
    v_exercises_total BIGINT;
BEGIN
    SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
    IF v_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Forbidden';
    END IF;

    -- Phase distribution
    SELECT COALESCE(jsonb_agg(jsonb_build_object('phase', phase, 'count', cnt)), '[]'::JSONB)
    INTO v_phase_dist
    FROM (
        SELECT current_phase AS phase, count(*) AS cnt
        FROM journey_progress
        GROUP BY current_phase
        ORDER BY current_phase
    ) sub;

    -- Diagnostic classification distribution
    SELECT COALESCE(jsonb_agg(jsonb_build_object('classification', cls, 'count', cnt)), '[]'::JSONB)
    INTO v_class_dist
    FROM (
        SELECT classification AS cls, count(*) AS cnt
        FROM diagnostic_results
        WHERE classification IS NOT NULL AND classification <> 'pending'
        GROUP BY classification
        ORDER BY cnt DESC
    ) sub;

    -- Average readiness scores
    SELECT jsonb_build_object(
        'cultural', ROUND(AVG(cultural_readiness)::NUMERIC, 1),
        'financial', ROUND(AVG(financial_readiness)::NUMERIC, 1),
        'overall', ROUND(AVG(overall_readiness)::NUMERIC, 1)
    ) INTO v_avg_readiness
    FROM diagnostic_results
    WHERE overall_readiness IS NOT NULL;

    -- Preparation tasks completed
    SELECT count(*) FILTER (WHERE is_completed), count(*)
    INTO v_tasks_completed, v_tasks_total
    FROM preparation_tasks;

    -- Exercises completed
    SELECT count(*) FILTER (WHERE is_completed), count(*)
    INTO v_exercises_completed, v_exercises_total
    FROM preparation_weekly_exercises;

    v_result := jsonb_build_object(
        'phase_distribution', v_phase_dist,
        'classification_distribution', v_class_dist,
        'avg_readiness', COALESCE(v_avg_readiness, '{}'::JSONB),
        'tasks_completed', v_tasks_completed,
        'tasks_total', v_tasks_total,
        'exercises_completed', v_exercises_completed,
        'exercises_total', v_exercises_total,
        'total_journeys', (SELECT count(*) FROM journey_progress),
        'total_diagnostics', (SELECT count(*) FROM diagnostic_results)
    );

    RETURN v_result;
END;
$$;


-- 6. admin_get_connection_metrics(p_days) → JSONB
-- Connection funnel: sent, accepted, rejected, pending, rates, top countries
CREATE OR REPLACE FUNCTION admin_get_connection_metrics(p_days INT DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_since TIMESTAMPTZ := now() - (p_days || ' days')::INTERVAL;
    v_result JSONB;
    v_sent BIGINT;
    v_accepted BIGINT;
    v_rejected BIGINT;
    v_pending BIGINT;
    v_avg_score NUMERIC;
    v_top_countries JSONB;
BEGIN
    SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
    IF v_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Forbidden';
    END IF;

    SELECT count(*) INTO v_sent FROM connections WHERE created_at >= v_since;
    SELECT count(*) INTO v_accepted FROM connections WHERE status = 'accepted' AND updated_at >= v_since;
    SELECT count(*) INTO v_rejected FROM connections WHERE status = 'rejected' AND updated_at >= v_since;
    SELECT count(*) INTO v_pending FROM connections WHERE status = 'pending' AND created_at >= v_since;
    SELECT ROUND(AVG(compatibility_score)::NUMERIC, 1) INTO v_avg_score FROM connections WHERE created_at >= v_since AND compatibility_score > 0;

    -- Top destination countries from connected users
    SELECT COALESCE(jsonb_agg(jsonb_build_object('country', country, 'count', cnt)), '[]'::JSONB)
    INTO v_top_countries
    FROM (
        SELECT p.destination_country AS country, count(*) AS cnt
        FROM connections c
        JOIN profiles p ON p.id = c.requester_id OR p.id = c.addressee_id
        WHERE c.status = 'accepted' AND c.updated_at >= v_since
            AND p.destination_country IS NOT NULL AND p.destination_country <> ''
        GROUP BY p.destination_country
        ORDER BY cnt DESC
        LIMIT 5
    ) sub;

    v_result := jsonb_build_object(
        'sent', v_sent,
        'accepted', v_accepted,
        'rejected', v_rejected,
        'pending', v_pending,
        'accept_rate', CASE WHEN v_sent > 0 THEN ROUND(v_accepted::NUMERIC / v_sent * 100, 1) ELSE 0 END,
        'avg_compatibility_score', COALESCE(v_avg_score, 0),
        'top_countries', v_top_countries
    );

    RETURN v_result;
END;
$$;
