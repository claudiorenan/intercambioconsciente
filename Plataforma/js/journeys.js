/**
 * Intercambio Consciente — Journeys Module
 * Uses events table with event_type = 'jornada' + event_registrations
 */

const Journeys = {
    async loadAvailable() {
        const sb = window.supabaseClient;
        if (!sb) return [];

        const { data, error } = await sb
            .from('events')
            .select('*, profiles(name, photo_url)')
            .eq('event_type', 'jornada')
            .gte('event_date', new Date().toISOString())
            .order('event_date', { ascending: true });

        if (error) {
            console.error('Journeys.loadAvailable error:', error);
            return [];
        }
        return data || [];
    },

    async loadMyJourneys(userId) {
        const sb = window.supabaseClient;
        if (!sb || !userId) return [];

        const { data, error } = await sb
            .from('event_registrations')
            .select('*, events(*, profiles(name, photo_url))')
            .eq('user_id', userId)
            .not('events', 'is', null);

        if (error) {
            console.error('Journeys.loadMyJourneys error:', error);
            return [];
        }

        // Filter only jornada type
        return (data || []).filter(r => r.events?.event_type === 'jornada');
    },

    async registerForJourney(eventId, userId) {
        const sb = window.supabaseClient;
        if (!sb) return { error: 'Supabase não inicializado' };

        // Check if already registered
        const { data: existing } = await sb
            .from('event_registrations')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .maybeSingle();

        if (existing) {
            return { error: 'Você já está inscrito nesta jornada' };
        }

        const { data, error } = await sb
            .from('event_registrations')
            .insert({ event_id: eventId, user_id: userId })
            .select()
            .single();

        if (error) {
            console.error('Journeys.registerForJourney error:', error);
            return { error: error.message };
        }
        return { data };
    },
};

window.Journeys = Journeys;
