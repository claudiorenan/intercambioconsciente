/**
 * Intercâmbio Consciente — Auth Module
 */

const Auth = {
    currentUser: null,
    _listeners: [],
    _recoveryListeners: [],

    async init() {
        const sb = window.supabaseClient;
        if (!sb) return;

        const { data: { session } } = await sb.auth.getSession();
        if (session?.user) {
            this.currentUser = session.user;
            this._notify();
        }

        sb.auth.onAuthStateChange((event, session) => {
            this.currentUser = session?.user || null;

            if (event === 'PASSWORD_RECOVERY') {
                this._notifyRecovery();
                return;
            }

            this._notify();
        });
    },

    onAuthChange(fn) {
        this._listeners.push(fn);
    },

    onPasswordRecovery(fn) {
        this._recoveryListeners.push(fn);
    },

    _notify() {
        this._listeners.forEach(fn => fn(this.currentUser));
    },

    _notifyRecovery() {
        this._recoveryListeners.forEach(fn => fn(this.currentUser));
    },

    async signIn(email, password) {
        const sb = window.supabaseClient;
        if (!sb) return { error: { message: 'Supabase não configurado' } };

        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        return { data, error };
    },

    async signUp(email, password, metadata = {}) {
        const sb = window.supabaseClient;
        if (!sb) return { error: { message: 'Supabase não configurado' } };

        const { data, error } = await sb.auth.signUp({
            email,
            password,
            options: { data: metadata },
        });
        return { data, error };
    },

    async resetPassword(email) {
        const sb = window.supabaseClient;
        if (!sb) return { error: { message: 'Supabase não configurado' } };

        const { data, error } = await sb.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.href.split('#')[0],
        });
        return { data, error };
    },

    async updatePassword(newPassword) {
        const sb = window.supabaseClient;
        if (!sb) return { error: { message: 'Supabase não configurado' } };

        const { data, error } = await sb.auth.updateUser({ password: newPassword });
        return { data, error };
    },

    async signOut() {
        const sb = window.supabaseClient;
        if (!sb) return;

        await sb.auth.signOut();
        this.currentUser = null;
        this._notify();
    },
};

window.Auth = Auth;
