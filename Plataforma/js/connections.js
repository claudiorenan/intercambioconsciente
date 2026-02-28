/**
 * Intercâmbio Consciente — Connections Module
 * Matching entre intercambistas
 */

const Connections = {
    _channel: null,
    _pendingCount: 0,
    _userId: null,

    async init(userId) {
        this._userId = userId;
        try {
            await this._loadPendingCount();
        } catch (e) {
            console.warn('Failed to load connections pending count:', e);
        }
        this._setupRealtime(userId);
    },

    destroy() {
        if (this._channel) {
            const sb = window.supabaseClient;
            if (sb) sb.removeChannel(this._channel);
            this._channel = null;
        }
        this._userId = null;
        this._pendingCount = 0;
        this._updateBadge();
    },

    _setupRealtime(userId) {
        const sb = window.supabaseClient;
        if (!sb) return;
        if (this._channel) sb.removeChannel(this._channel);

        this._channel = sb
            .channel('connections_' + userId)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'connections',
            }, (payload) => {
                const row = payload.new || payload.old;
                if (!row) return;
                if (row.addressee_id === userId || row.requester_id === userId) {
                    this._loadPendingCount();
                    if (window.icApp && typeof window.icApp._onRealtimeConnection === 'function') {
                        window.icApp._onRealtimeConnection(payload);
                    }
                }
            })
            .subscribe();
    },

    _updateBadge() {
        const badge = document.getElementById('connectionsBadge');
        if (!badge) return;
        if (this._pendingCount > 0) {
            badge.textContent = this._pendingCount > 99 ? '99+' : this._pendingCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    },

    async _loadPendingCount() {
        const sb = window.supabaseClient;
        if (!sb || !this._userId) return;

        const { count, error } = await sb
            .from('connections')
            .select('*', { count: 'exact', head: true })
            .eq('addressee_id', this._userId)
            .eq('status', 'pending');

        if (!error && count !== null) {
            this._pendingCount = count;
            this._updateBadge();
        }
    },

    async getMatchingProfiles(limit = 20, offset = 0) {
        const sb = window.supabaseClient;
        if (!sb || !this._userId) return [];

        const { data, error } = await sb.rpc('get_matching_profiles', {
            p_user_id: this._userId,
            p_limit: limit,
            p_offset: offset,
        });

        if (error) {
            ErrorHandler.handle('Connections.getMatchingProfiles', error, { silent: true });
            return [];
        }
        return data || [];
    },

    async sendRequest(addresseeId, score) {
        const sb = window.supabaseClient;
        if (!sb) return null;

        const { data, error } = await sb.rpc('send_connection_request', {
            p_addressee_id: addresseeId,
            p_score: score || 0,
        });

        if (error) {
            ErrorHandler.handle('Connections.sendRequest', error);
            return null;
        }
        return data;
    },

    async respondRequest(connectionId, accept) {
        const sb = window.supabaseClient;
        if (!sb) return false;

        const { error } = await sb.rpc('respond_connection_request', {
            p_connection_id: connectionId,
            p_accept: accept,
        });

        if (error) {
            ErrorHandler.handle('Connections.respondRequest', error);
            return false;
        }
        return true;
    },

    async getPendingReceived() {
        const sb = window.supabaseClient;
        if (!sb || !this._userId) return [];

        const { data, error } = await sb
            .from('connections')
            .select('*, requester:profiles!connections_requester_id_fkey(id, name, photo_url, destination_country, target_language, exchange_status)')
            .eq('addressee_id', this._userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            ErrorHandler.handle('Connections.getPendingReceived', error, { silent: true });
            return [];
        }
        return data || [];
    },

    async getPendingSent() {
        const sb = window.supabaseClient;
        if (!sb || !this._userId) return [];

        const { data, error } = await sb
            .from('connections')
            .select('*, addressee:profiles!connections_addressee_id_fkey(id, name, photo_url, destination_country, target_language, exchange_status)')
            .eq('requester_id', this._userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            ErrorHandler.handle('Connections.getPendingSent', error, { silent: true });
            return [];
        }
        return data || [];
    },

    async getAccepted() {
        const sb = window.supabaseClient;
        if (!sb || !this._userId) return [];

        const { data, error } = await sb
            .from('connections')
            .select('*, requester:profiles!connections_requester_id_fkey(id, name, photo_url, destination_country, target_language, exchange_status), addressee:profiles!connections_addressee_id_fkey(id, name, photo_url, destination_country, target_language, exchange_status)')
            .or(`requester_id.eq.${this._userId},addressee_id.eq.${this._userId}`)
            .eq('status', 'accepted')
            .order('updated_at', { ascending: false });

        if (error) {
            ErrorHandler.handle('Connections.getAccepted', error, { silent: true });
            return [];
        }
        return data || [];
    },
};

window.Connections = Connections;
