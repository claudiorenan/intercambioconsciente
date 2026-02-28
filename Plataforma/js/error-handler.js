/**
 * Intercâmbio Consciente — Error Handler
 */

const ErrorHandler = {
    handle(context, error, opts = {}) {
        const msg = error?.message || String(error);
        console.error(`[${context}]`, msg, error);

        // Send to monitoring
        if (window.Monitoring && window.Monitoring._initialized) {
            Monitoring.captureError({ type: 'handled_error', context, message: msg, stack: error?.stack });
        }

        if (!opts.silent) {
            this.showToast(msg, 'error');
        }
    },

    showToast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            toast.style.transition = 'all 300ms ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },
};

window.ErrorHandler = ErrorHandler;
