-- ============================================
-- Cleanup: Remove ALL test/fictitious data
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Remove all event registrations (depends on events)
DELETE FROM event_registrations;

-- 2. Remove all events (the "encontros" fictícios)
DELETE FROM events;

-- 3. Remove all feed data (test posts, reactions, replies)
DELETE FROM post_reactions;
DELETE FROM post_replies;
DELETE FROM feed_posts;

-- 4. Remove all messages and conversations (test DMs)
DELETE FROM messages;
DELETE FROM conversation_participants;
DELETE FROM conversations;

-- 5. Remove all notifications (test broadcasts)
DELETE FROM notifications;

-- 6. Remove all checkins (test mood checkins)
DELETE FROM checkins;

-- 7. Remove all connections (test connection requests)
DELETE FROM connections;

-- 8. Remove all rate limit entries
DELETE FROM rate_limits;

-- 9. Remove all diagnostic results and journey progress (test diagnostics)
DELETE FROM diagnostic_results;
DELETE FROM journey_progress;

-- 10. Remove preparation tasks and exercises (test preparation data)
DELETE FROM preparation_weekly_exercises;
DELETE FROM preparation_tasks;

-- 11. Remove all groups (test WhatsApp groups)
DELETE FROM groups;

-- 12. Reset event spots counter
-- (not needed since events were deleted, but just in case)

-- ============================================
-- NOTE: This does NOT delete user profiles.
-- Profiles are auto-created on auth signup.
-- To remove test users, delete them from
-- Supabase Auth Dashboard > Users.
-- ============================================

-- Verify cleanup
SELECT 'events' AS table_name, COUNT(*) AS remaining FROM events
UNION ALL SELECT 'event_registrations', COUNT(*) FROM event_registrations
UNION ALL SELECT 'feed_posts', COUNT(*) FROM feed_posts
UNION ALL SELECT 'post_reactions', COUNT(*) FROM post_reactions
UNION ALL SELECT 'post_replies', COUNT(*) FROM post_replies
UNION ALL SELECT 'messages', COUNT(*) FROM messages
UNION ALL SELECT 'conversations', COUNT(*) FROM conversations
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'checkins', COUNT(*) FROM checkins
UNION ALL SELECT 'connections', COUNT(*) FROM connections
UNION ALL SELECT 'groups', COUNT(*) FROM groups
UNION ALL SELECT 'diagnostic_results', COUNT(*) FROM diagnostic_results
UNION ALL SELECT 'journey_progress', COUNT(*) FROM journey_progress
UNION ALL SELECT 'preparation_tasks', COUNT(*) FROM preparation_tasks;
