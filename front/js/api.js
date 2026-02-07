const API = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const res = await fetch('/api' + endpoint, { ...options, headers });

        if (res.status === 401 && token) {
            // Token expired or invalid — force re-login
            window.showAuth();
            throw new Error('Session expired');
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    },

    signin(email, password) {
        return this.request('/signin', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },

    signup(name, email, password) {
        return this.request('/signup', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
    },

    logWeight(weight, date) {
        return this.request('/weight', {
            method: 'POST',
            body: JSON.stringify({ weight, date })
        });
    },

    getWeightHistory(from, to) {
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const qs = params.toString();
        return this.request('/weight' + (qs ? '?' + qs : ''));
    },

    getLatestWeight() {
        return this.request('/weight/latest');
    },

    deleteWeight(date) {
        return this.request('/weight/' + date, { method: 'DELETE' });
    }
};
