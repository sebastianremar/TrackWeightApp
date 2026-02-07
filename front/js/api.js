const API = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const res = await fetch('/api' + endpoint, { ...options, headers });

        if (res.status === 401 && token) {
            window.showAuth();
            throw new Error('Session expired');
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    },

    // Auth
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

    // Profile
    getProfile() {
        return this.request('/me');
    },

    updateProfile(data) {
        return this.request('/me', {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    // Weight
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
    },

    // Habits
    createHabit(data) {
        return this.request('/habits', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    getHabits() {
        return this.request('/habits');
    },

    updateHabit(id, data) {
        return this.request('/habits/' + id, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    archiveHabit(id) {
        return this.request('/habits/' + id, { method: 'DELETE' });
    },

    // Habit entries
    logHabitEntry(habitId, date) {
        return this.request('/habits/' + habitId + '/entries', {
            method: 'POST',
            body: JSON.stringify({ date })
        });
    },

    deleteHabitEntry(habitId, date) {
        return this.request('/habits/' + habitId + '/entries/' + date, { method: 'DELETE' });
    },

    getHabitEntries(habitId, from, to) {
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const qs = params.toString();
        return this.request('/habits/' + habitId + '/entries' + (qs ? '?' + qs : ''));
    },

    getAllHabitEntries(from, to) {
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const qs = params.toString();
        return this.request('/habits/entries/all' + (qs ? '?' + qs : ''));
    },

    getHabitStats(habitId, weeks) {
        const params = new URLSearchParams();
        if (weeks) params.set('weeks', weeks);
        const qs = params.toString();
        return this.request('/habits/' + habitId + '/stats' + (qs ? '?' + qs : ''));
    },

    // Friends
    sendFriendRequest(email) {
        return this.request('/friends/request', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    },

    respondToRequest(email, accept) {
        return this.request('/friends/respond', {
            method: 'POST',
            body: JSON.stringify({ email, accept })
        });
    },

    getFriends() {
        return this.request('/friends');
    },

    getFriendRequests() {
        return this.request('/friends/requests');
    },

    removeFriend(email) {
        return this.request('/friends/' + encodeURIComponent(email), { method: 'DELETE' });
    },

    getFriendWeight(email) {
        return this.request('/friends/' + encodeURIComponent(email) + '/weight');
    }
};
