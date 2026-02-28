/**
 * Intercâmbio Consciente — Admin Module
 * CRUD operations for events and groups via Supabase
 */

const Admin = {
    // ── Events ──

    async loadEvents() {
        const sb = window.supabaseClient;
        if (!sb) return [];

        const { data, error } = await sb
            .from('events')
            .select('*, profiles(name, photo_url)')
            .order('event_date', { ascending: false });

        if (error) {
            console.error('Admin.loadEvents error:', error);
            return [];
        }
        return data || [];
    },

    async createEvent(eventData) {
        const sb = window.supabaseClient;
        if (!sb) return { error: 'Supabase não inicializado' };

        const { data, error } = await sb
            .from('events')
            .insert({
                title: eventData.title,
                description: eventData.description,
                event_type: eventData.event_type,
                event_date: eventData.event_date,
                duration_minutes: eventData.duration_minutes || 60,
                price: eventData.price || 0,
                max_spots: eventData.max_spots || 30,
                payment_link: eventData.payment_link || null,
                meeting_link: eventData.meeting_link || null,
                host_id: eventData.host_id || (await sb.auth.getUser()).data?.user?.id,
            })
            .select()
            .single();

        if (error) {
            console.error('Admin.createEvent error:', error);
            return { error: error.message };
        }
        return { data };
    },

    async updateEvent(id, eventData) {
        const sb = window.supabaseClient;
        if (!sb) return { error: 'Supabase não inicializado' };

        const { data, error } = await sb
            .from('events')
            .update(eventData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Admin.updateEvent error:', error);
            return { error: error.message };
        }
        return { data };
    },

    async deleteEvent(id) {
        const sb = window.supabaseClient;
        if (!sb) return { error: 'Supabase não inicializado' };

        const { error } = await sb
            .from('events')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Admin.deleteEvent error:', error);
            return { error: error.message };
        }
        return { success: true };
    },

    // ── Groups ──

    async loadGroups() {
        const sb = window.supabaseClient;
        if (!sb) return [];

        const { data, error } = await sb
            .from('groups')
            .select('*')
            .order('continent', { ascending: true })
            .order('display_order', { ascending: true });

        if (error) {
            console.error('Admin.loadGroups error:', error);
            return [];
        }
        return data || [];
    },

    async createGroup(groupData) {
        const sb = window.supabaseClient;
        if (!sb) return { error: 'Supabase não inicializado' };

        const { data, error } = await sb
            .from('groups')
            .insert({
                name: groupData.name,
                description: groupData.description || null,
                continent: groupData.continent || null,
                country_code: groupData.country_code || null,
                platform: groupData.platform || 'whatsapp',
                invite_link: groupData.invite_link || null,
                emoji: groupData.emoji || '🌍',
                display_order: groupData.display_order || 0,
                is_active: true,
                created_by: (await sb.auth.getUser()).data?.user?.id,
            })
            .select()
            .single();

        if (error) {
            console.error('Admin.createGroup error:', error);
            return { error: error.message };
        }
        return { data };
    },

    async updateGroup(id, groupData) {
        const sb = window.supabaseClient;
        if (!sb) return { error: 'Supabase não inicializado' };

        const { data, error } = await sb
            .from('groups')
            .update(groupData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Admin.updateGroup error:', error);
            return { error: error.message };
        }
        return { data };
    },

    async deleteGroup(id) {
        const sb = window.supabaseClient;
        if (!sb) return { error: 'Supabase não inicializado' };

        const { error } = await sb
            .from('groups')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Admin.deleteGroup error:', error);
            return { error: error.message };
        }
        return { success: true };
    },

    // ── Dashboard Stats ──

    async getStats() {
        const sb = window.supabaseClient;
        if (!sb) return {};

        const [profiles, posts, events, groups, checkins, mentors] = await Promise.all([
            sb.from('profiles').select('id', { count: 'exact', head: true }),
            sb.from('feed_posts').select('id', { count: 'exact', head: true }),
            sb.from('events').select('id', { count: 'exact', head: true }),
            sb.from('groups').select('id', { count: 'exact', head: true }),
            sb.from('checkins').select('id', { count: 'exact', head: true }),
            sb.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'mentor'),
        ]);

        return {
            users: profiles.count || 0,
            posts: posts.count || 0,
            events: events.count || 0,
            groups: groups.count || 0,
            checkins: checkins.count || 0,
            mentors: mentors.count || 0,
        };
    },

    // ── Users ──

    async loadAllProfiles() {
        const sb = window.supabaseClient;
        if (!sb) return [];

        const { data, error } = await sb
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Admin.loadAllProfiles error:', error);
            return [];
        }
        return data || [];
    },

    async updateUserRole(userId, role) {
        const sb = window.supabaseClient;
        if (!sb) return { error: 'Supabase não inicializado' };

        const { data, error } = await sb
            .from('profiles')
            .update({ role })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error('Admin.updateUserRole error:', error);
            return { error: error.message };
        }
        return { data };
    },

    // ── Feed Moderation ──

    async loadAllPosts() {
        const sb = window.supabaseClient;
        if (!sb) return [];

        const { data, error } = await sb
            .from('feed_posts')
            .select('*, profiles(name, photo_url)')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('Admin.loadAllPosts error:', error);
            return [];
        }
        return data || [];
    },

    async deletePost(postId) {
        const sb = window.supabaseClient;
        if (!sb) return { error: 'Supabase não inicializado' };

        // Delete replies first
        await sb.from('post_replies').delete().eq('post_id', postId);
        await sb.from('post_reactions').delete().eq('post_id', postId);

        const { error } = await sb
            .from('feed_posts')
            .delete()
            .eq('id', postId);

        if (error) {
            console.error('Admin.deletePost error:', error);
            return { error: error.message };
        }
        return { success: true };
    },

    // ── Notifications ──

    async sendBroadcastNotification(title, body, target) {
        const sb = window.supabaseClient;
        if (!sb) return { error: 'Supabase não inicializado' };

        let userIds = [];

        if (target === 'all') {
            const { data } = await sb.from('profiles').select('id');
            userIds = (data || []).map(p => p.id);
        } else if (target === 'mentors') {
            const { data } = await sb.from('profiles').select('id').eq('role', 'mentor');
            userIds = (data || []).map(p => p.id);
        } else if (target === 'users') {
            const { data } = await sb.from('profiles').select('id').eq('role', 'user');
            userIds = (data || []).map(p => p.id);
        }

        if (!userIds.length) return { error: 'Nenhum destinatário encontrado' };

        const notifications = userIds.map(uid => ({
            user_id: uid,
            title,
            body,
            type: 'broadcast',
        }));

        const { error } = await sb.from('notifications').insert(notifications);

        if (error) {
            console.error('Admin.sendBroadcastNotification error:', error);
            return { error: error.message };
        }
        return { success: true, count: userIds.length };
    },

    // ── Block/Unblock ──

    async toggleBlockUser(userId, isBlocked) {
        const sb = window.supabaseClient;
        if (!sb) return { error: 'Supabase não inicializado' };

        const { data, error } = await sb
            .from('profiles')
            .update({ is_blocked: isBlocked })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error('Admin.toggleBlockUser error:', error);
            return { error: error.message };
        }
        return { data };
    },

    async loadProfilesWithCounts() {
        const sb = window.supabaseClient;
        if (!sb) return { profiles: [], stats: {} };

        const [profilesRes, postsRes, blockedRes] = await Promise.all([
            sb.from('profiles').select('*').order('created_at', { ascending: false }),
            sb.from('feed_posts').select('user_id'),
            sb.from('profiles').select('id', { count: 'exact', head: true }).eq('is_blocked', true),
        ]);

        const profiles = profilesRes.data || [];
        const posts = postsRes.data || [];

        // Count posts per user
        const postCounts = {};
        posts.forEach(p => {
            postCounts[p.user_id] = (postCounts[p.user_id] || 0) + 1;
        });

        profiles.forEach(p => {
            p._postCount = postCounts[p.id] || 0;
        });

        return {
            profiles,
            stats: {
                total: profiles.length,
                mentors: profiles.filter(p => p.role === 'mentor').length,
                admins: profiles.filter(p => p.role === 'admin').length,
                blocked: blockedRes.count || 0,
            },
        };
    },

    // ── Check-ins ──

    async loadCheckinStats() {
        const sb = window.supabaseClient;
        if (!sb) return [];

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await sb
            .from('checkins')
            .select('mood, created_at')
            .gte('created_at', sevenDaysAgo)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Admin.loadCheckinStats error:', error);
            return [];
        }
        return data || [];
    },

    // ── Engagement Metrics ──

    async getEngagementOverview(days = 30) {
        const sb = window.supabaseClient;
        if (!sb) return null;
        const { data, error } = await sb.rpc('admin_get_engagement_overview', { p_days: days });
        if (error) { console.error('Admin.getEngagementOverview error:', error); return null; }
        return data;
    },

    async getMoodDistribution(days = 30) {
        const sb = window.supabaseClient;
        if (!sb) return [];
        const { data, error } = await sb.rpc('admin_get_mood_distribution', { p_days: days });
        if (error) { console.error('Admin.getMoodDistribution error:', error); return []; }
        return data || [];
    },

    async getContentActivity(days = 14) {
        const sb = window.supabaseClient;
        if (!sb) return [];
        const { data, error } = await sb.rpc('admin_get_content_activity', { p_days: days });
        if (error) { console.error('Admin.getContentActivity error:', error); return []; }
        return data || [];
    },

    async getUserEngagementList(days = 30, limit = 20, offset = 0, sort = 'temp_desc') {
        const sb = window.supabaseClient;
        if (!sb) return [];
        const { data, error } = await sb.rpc('admin_get_user_engagement_list', { p_days: days, p_limit: limit, p_offset: offset, p_sort: sort });
        if (error) { console.error('Admin.getUserEngagementList error:', error); return []; }
        return data || [];
    },

    async getJourneyProgressSummary() {
        const sb = window.supabaseClient;
        if (!sb) return null;
        const { data, error } = await sb.rpc('admin_get_journey_progress_summary');
        if (error) { console.error('Admin.getJourneyProgressSummary error:', error); return null; }
        return data;
    },

    async getConnectionMetrics(days = 30) {
        const sb = window.supabaseClient;
        if (!sb) return null;
        const { data, error } = await sb.rpc('admin_get_connection_metrics', { p_days: days });
        if (error) { console.error('Admin.getConnectionMetrics error:', error); return null; }
        return data;
    },
};

window.Admin = Admin;
