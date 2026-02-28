/**
 * Intercâmbio Consciente — Validation & Content Filter
 */

const ContentFilter = {
    patterns: {
        phone: /(\+?\d{1,3}[\s.-]?)?\(?\d{2,3}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/g,
        email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        url: /https?:\/\/[^\s]+/gi,
        social: /@[a-zA-Z0-9._]{3,30}/g,
    },

    check(text) {
        if (!text) return { blocked: false };

        for (const [type, regex] of Object.entries(this.patterns)) {
            regex.lastIndex = 0;
            if (regex.test(text)) {
                const labels = {
                    phone: 'numero de telefone',
                    email: 'endereco de email',
                    url: 'link externo',
                    social: 'rede social',
                };
                return { blocked: true, type: labels[type] || type };
            }
        }
        return { blocked: false };
    },
};

window.ContentFilter = ContentFilter;

const Validation = {
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    isValidPassword(password) {
        return password && password.length >= 6;
    },

    sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    sanitizeURL(url) {
        if (!url || typeof url !== 'string') return '';
        const s = Validation.sanitizeHTML(url);
        if (/^https:\/\//i.test(url)) return s;
        return '';
    },
};

window.Validation = Validation;
