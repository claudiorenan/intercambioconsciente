/**
 * Intercâmbio Consciente — Error Monitoring
 *
 * Lightweight error tracking that captures:
 * - Unhandled exceptions (window.onerror)
 * - Unhandled promise rejections
 * - Manual error reports from ErrorHandler
 *
 * Configure via config.json: SENTRY_DSN or MONITORING_ENDPOINT
 * Falls back to console-only when no endpoint configured.
 */

const Monitoring = {
    _initialized: false,
    _endpoint: null,
    _dsn: null,
    _buffer: [],
    _maxBuffer: 50,
    _environment: 'production',

    init(options = {}) {
        if (this._initialized) return;

        this._endpoint = options.endpoint || null;
        this._dsn = options.dsn || null;
        this._environment = options.environment || this._detectEnvironment();

        // Global error handler
        window.addEventListener('error', (event) => {
            this.captureError({
                type: 'unhandled_error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack || null,
            });
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.captureError({
                type: 'unhandled_rejection',
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack || null,
            });
        });

        this._initialized = true;
        console.info('[Monitoring] Initialized', {
            environment: this._environment,
            hasEndpoint: !!this._endpoint,
            hasDsn: !!this._dsn,
        });
    },

    captureError(errorData) {
        const entry = {
            ...errorData,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            environment: this._environment,
            sessionId: this._getSessionId(),
        };

        // Always log locally
        console.warn('[Monitoring] Error captured:', entry);

        // Buffer for batch sending
        this._buffer.push(entry);
        if (this._buffer.length > this._maxBuffer) {
            this._buffer.shift(); // Drop oldest
        }

        // Send if endpoint configured
        if (this._endpoint) {
            this._sendToEndpoint(entry);
        }

        if (this._dsn) {
            this._sendToSentry(entry);
        }
    },

    captureMessage(message, level = 'info', context = {}) {
        const entry = {
            type: 'message',
            level,
            message,
            context,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            environment: this._environment,
            sessionId: this._getSessionId(),
        };

        if (level === 'error' || level === 'warning') {
            console.warn('[Monitoring]', message, context);
        }

        this._buffer.push(entry);

        if (this._endpoint) {
            this._sendToEndpoint(entry);
        }
    },

    getErrorLog() {
        return [...this._buffer];
    },

    _sendToEndpoint(entry) {
        try {
            fetch(this._endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry),
                keepalive: true,
            }).catch(() => {});
        } catch {
            // Silently fail - monitoring should never break the app
        }
    },

    _sendToSentry(entry) {
        // Sentry envelope format (lightweight, no SDK needed)
        try {
            const dsnUrl = new URL(this._dsn);
            const projectId = dsnUrl.pathname.replace('/', '');
            const sentryKey = dsnUrl.username;
            const sentryHost = dsnUrl.hostname;

            const envelopeUrl = `https://${sentryHost}/api/${projectId}/envelope/?sentry_key=${sentryKey}&sentry_version=7`;

            const header = JSON.stringify({
                event_id: this._uuid(),
                sent_at: new Date().toISOString(),
                dsn: this._dsn,
            });

            const itemHeader = JSON.stringify({ type: 'event' });

            const eventPayload = JSON.stringify({
                event_id: this._uuid(),
                timestamp: entry.timestamp,
                platform: 'javascript',
                level: entry.type === 'message' ? (entry.level || 'info') : 'error',
                environment: this._environment,
                message: { formatted: entry.message },
                request: { url: entry.url },
                tags: { type: entry.type },
                extra: entry.context || {},
                exception: entry.stack ? {
                    values: [{
                        type: entry.type,
                        value: entry.message,
                        stacktrace: { frames: this._parseStack(entry.stack) },
                    }],
                } : undefined,
            });

            const envelope = `${header}\n${itemHeader}\n${eventPayload}`;

            fetch(envelopeUrl, {
                method: 'POST',
                body: envelope,
                keepalive: true,
            }).catch(() => {});
        } catch {
            // Silently fail
        }
    },

    _detectEnvironment() {
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1') return 'development';
        if (host.includes('staging') || host.includes('preview')) return 'staging';
        return 'production';
    },

    _getSessionId() {
        if (!this._sessionId) {
            this._sessionId = sessionStorage.getItem('ic_session_id') || this._uuid();
            sessionStorage.setItem('ic_session_id', this._sessionId);
        }
        return this._sessionId;
    },

    _uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    },

    _parseStack(stack) {
        if (!stack) return [];
        return stack.split('\n').slice(1).map(line => {
            const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
            if (match) {
                return { function: match[1], filename: match[2], lineno: parseInt(match[3]), colno: parseInt(match[4]) };
            }
            return { function: '?', filename: line.trim() };
        }).filter(f => f.filename);
    },
};

window.Monitoring = Monitoring;
