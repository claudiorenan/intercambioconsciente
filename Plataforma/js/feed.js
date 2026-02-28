/**
 * Intercâmbio Consciente — Feed Module
 */

const RATE_LIMITS = {
    create_post: { max: 10, window: 3600 },
    create_reply: { max: 30, window: 3600 },
    send_message: { max: 50, window: 3600 },
};

async function checkRateLimit(action) {
    const sb = window.supabaseClient;
    if (!sb) return { allowed: true };

    const limit = RATE_LIMITS[action];
    if (!limit) return { allowed: true };

    try {
        const { data, error } = await sb.rpc('check_rate_limit', {
            p_action: action,
            p_max: limit.max,
            p_window_seconds: limit.window,
        });
        if (error) return { allowed: true };
        return { allowed: data, max: limit.max };
    } catch {
        return { allowed: true };
    }
}

window.checkRateLimit = checkRateLimit;

const Feed = {
    _currentTopic: 'all',

    async loadPosts(topic = 'all', limit = 20, offset = 0) {
        const sb = window.supabaseClient;
        if (!sb) return [];

        let query = sb
            .from('feed_posts')
            .select('*, profiles(name, photo_url)')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (topic !== 'all') {
            query = query.eq('topic', topic);
        }

        const { data, error } = await query;
        if (error) {
            ErrorHandler.handle('Feed.loadPosts', error, { silent: true });
            return [];
        }
        return data || [];
    },

    async createPost(content, topic, anonymous = false) {
        const rl = await checkRateLimit('create_post');
        if (!rl.allowed) {
            return { error: `Limite de ${rl.max} posts por hora atingido.` };
        }

        const filter = ContentFilter.check(content);
        if (filter.blocked) {
            return { error: `Conteúdo bloqueado: contém ${filter.type}. Para sua segurança, não compartilhe dados de contato.` };
        }

        const sb = window.supabaseClient;
        const { data, error } = await sb
            .from('feed_posts')
            .insert({
                content: content.trim(),
                topic,
                is_anonymous: anonymous,
                user_id: Auth.currentUser?.id,
            })
            .select()
            .single();

        if (error) {
            ErrorHandler.handle('Feed.createPost', error);
            return { error: error.message };
        }
        return { post: data, error: null };
    },

    async reactToPost(postId, reaction = 'apoio') {
        const sb = window.supabaseClient;
        if (!sb) return;

        const { error } = await sb
            .from('post_reactions')
            .upsert({
                post_id: postId,
                user_id: Auth.currentUser?.id,
                reaction,
            });

        if (error) ErrorHandler.handle('Feed.reactToPost', error, { silent: true });
    },

    async loadReplies(postId) {
        const sb = window.supabaseClient;
        if (!sb) return [];

        const { data, error } = await sb
            .from('post_replies')
            .select('*, profiles(name, photo_url)')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) {
            ErrorHandler.handle('Feed.loadReplies', error, { silent: true });
            return [];
        }
        return data || [];
    },

    async createReply(postId, content) {
        const rl = await checkRateLimit('create_reply');
        if (!rl.allowed) {
            return { error: `Limite de ${rl.max} respostas por hora atingido.` };
        }

        const filter = ContentFilter.check(content);
        if (filter.blocked) {
            return { error: `Conteúdo bloqueado: contém ${filter.type}.` };
        }

        const sb = window.supabaseClient;
        const { data, error } = await sb
            .from('post_replies')
            .insert({
                post_id: postId,
                content: content.trim(),
                user_id: Auth.currentUser?.id,
            })
            .select()
            .single();

        if (error) {
            ErrorHandler.handle('Feed.createReply', error);
            return { error: error.message };
        }
        return { reply: data, error: null };
    },
};

window.Feed = Feed;
