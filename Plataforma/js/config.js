/**
 * Intercâmbio Consciente — Runtime Configuration
 *
 * Production: Deploy with config.json containing env-specific values
 * Development: Uses fallback defaults below
 */

const AppConfig = {
    _loaded: false,

    // Defaults (development) - overridden by config.json in production
    supabaseUrl: '',
    supabaseAnonKey: '',
    sentryDsn: '',
    monitoringEndpoint: '',

    async load() {
        if (this._loaded) return this;

        try {
            const response = await fetch('/config.json');
            if (response.ok) {
                const config = await response.json();
                this.supabaseUrl = config.SUPABASE_URL || this.supabaseUrl;
                this.supabaseAnonKey = config.SUPABASE_ANON_KEY || this.supabaseAnonKey;
                this.sentryDsn = config.SENTRY_DSN || this.sentryDsn;
                this.monitoringEndpoint = config.MONITORING_ENDPOINT || this.monitoringEndpoint;
            }
        } catch (e) {
            // config.json not found - use inline defaults
        }

        // Fallback: check if globals were set via script tag
        if (!this.supabaseUrl && window.__IC_CONFIG__) {
            this.supabaseUrl = window.__IC_CONFIG__.SUPABASE_URL || '';
            this.supabaseAnonKey = window.__IC_CONFIG__.SUPABASE_ANON_KEY || '';
            this.sentryDsn = window.__IC_CONFIG__.SENTRY_DSN || '';
            this.monitoringEndpoint = window.__IC_CONFIG__.MONITORING_ENDPOINT || '';
        }

        this._loaded = true;
        return this;
    }
};

window.AppConfig = AppConfig;
