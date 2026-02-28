/**
 * Intercâmbio Consciente — Notifications Module
 */

const Notifications = {
    _channel: null,
    _unreadCount: 0,
    _userId: null,
    _onNewCallback: null,

    async init(userId) {
        this._userId = userId;
        await this._loadUnreadCount(userId);
        this._setupRealtime(userId);
    },

    destroy() {
        if (this._channel) {
            const sb = window.supabaseClient;
            if (sb) sb.removeChannel(this._channel);
            this._channel = null;
        }
        this._userId = null;
        this._unreadCount = 0;
        this._onNewCallback = null;
        this._updateBadge();
    },

    _setupRealtime(userId) {
        const sb = window.supabaseClient;
        if (!sb) return;

        this._channel = sb
            .channel('notif_' + userId)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`,
            }, (payload) => {
                this._unreadCount++;
                this._updateBadge();
                if (this._onNewCallback) this._onNewCallback(payload.new);
            })
            .subscribe();
    },

    async loadAll() {
        const sb = window.supabaseClient;
        if (!sb || !this._userId) return [];
        const { data } = await sb
            .from('notifications')
            .select('*')
            .eq('user_id', this._userId)
            .order('created_at', { ascending: false })
            .limit(50);
        return data || [];
    },

    async markAsRead(notifId) {
        const sb = window.supabaseClient;
        if (!sb) return;
        const { error } = await sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notifId);
        if (!error) {
            if (this._unreadCount > 0) this._unreadCount--;
            this._updateBadge();
        }
    },

    onNew(callback) {
        this._onNewCallback = callback;
    },

    _updateBadge() {
        const badge = document.getElementById('notifBadge');
        if (!badge) return;
        if (this._unreadCount > 0) {
            badge.textContent = this._unreadCount > 99 ? '99+' : this._unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    },

    async _loadUnreadCount(userId) {
        const sb = window.supabaseClient;
        if (!sb) return;

        const { count, error } = await sb
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .is('read_at', null);

        if (!error) {
            this._unreadCount = count || 0;
            this._updateBadge();
        }
    },

    async markAllRead(userId) {
        const sb = window.supabaseClient;
        if (!sb) return;

        await sb
            .from('notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('user_id', userId)
            .is('read_at', null);

        this._unreadCount = 0;
        this._updateBadge();
    },
};

window.Notifications = Notifications;
