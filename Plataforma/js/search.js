/**
 * Intercâmbio Consciente — Search Module
 */

const Search = {
    async searchMentors(query) {
        const sb = window.supabaseClient;
        if (!sb || !query) return [];

        const { data, error } = await sb
            .from('profiles')
            .select('*')
            .eq('role', 'mentor')
            .eq('is_active', true)
            .or(`name.ilike.%${query}%,bio.ilike.%${query}%,specialty.ilike.%${query}%`)
            .limit(20);

        if (error) {
            ErrorHandler.handle('Search.searchMentors', error, { silent: true });
            return [];
        }
        return data || [];
    },

    async searchPosts(query) {
        const sb = window.supabaseClient;
        if (!sb || !query) return [];

        const { data, error } = await sb
            .from('feed_posts')
            .select('*, profiles(name, photo_url)')
            .ilike('content', `%${query}%`)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            ErrorHandler.handle('Search.searchPosts', error, { silent: true });
            return [];
        }
        return data || [];
    },

    async searchEvents(query) {
        const sb = window.supabaseClient;
        if (!sb || !query) return [];

        const { data, error } = await sb
            .from('events')
            .select('*, profiles(name, photo_url)')
            .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
            .gte('event_date', new Date().toISOString())
            .order('event_date', { ascending: true })
            .limit(20);

        if (error) {
            ErrorHandler.handle('Search.searchEvents', error, { silent: true });
            return [];
        }
        return data || [];
    },
};

window.Search = Search;
