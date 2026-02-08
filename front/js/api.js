var API = {
    _timeout: 15000,

    async request(endpoint, options = {}) {
        var controller = new AbortController();
        var timeoutId = setTimeout(function() { controller.abort(); }, API._timeout);

        var headers = { 'Content-Type': 'application/json', ...options.headers };

        try {
            var res = await fetch('/api' + endpoint, {
                ...options,
                headers,
                credentials: 'same-origin',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (res.status === 401) {
                window.showAuth();
                throw new Error('Session expired');
            }

            var data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Request failed');
            return data;
        } catch (err) {
            clearTimeout(timeoutId);

            if (err.name === 'AbortError') {
                Toast.error('Request timed out. Please try again.');
                throw new Error('Request timed out');
            }

            if (err instanceof TypeError && err.message === 'Failed to fetch') {
                Toast.error('You appear to be offline. Check your connection.');
                throw new Error('Network error');
            }

            throw err;
        }
    },

    // Auth
    signin(email, password) {
        return this.request('/signin', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    },

    signup(name, email, password) {
        return this.request('/signup', {
            method: 'POST',
            body: JSON.stringify({ name, email, password }),
        });
    },

    signout() {
        return this.request('/signout', { method: 'POST' });
    },

    // Profile
    getProfile() {
        return this.request('/me');
    },

    updateProfile(data) {
        return this.request('/me', {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    changePassword(currentPassword, newPassword) {
        return this.request('/me/password', {
            method: 'PATCH',
            body: JSON.stringify({ currentPassword, newPassword }),
        });
    },

    // Weight
    logWeight(weight, date) {
        return this.request('/weight', {
            method: 'POST',
            body: JSON.stringify({ weight, date }),
        });
    },

    getWeightHistory(from, to) {
        var params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        var qs = params.toString();
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
            body: JSON.stringify(data),
        });
    },

    getHabits() {
        return this.request('/habits');
    },

    updateHabit(id, data) {
        return this.request('/habits/' + encodeURIComponent(id), {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    archiveHabit(id) {
        return this.request('/habits/' + encodeURIComponent(id), { method: 'DELETE' });
    },

    // Habit entries
    logHabitEntry(habitId, date) {
        return this.request('/habits/' + encodeURIComponent(habitId) + '/entries', {
            method: 'POST',
            body: JSON.stringify({ date }),
        });
    },

    deleteHabitEntry(habitId, date) {
        return this.request(
            '/habits/' + encodeURIComponent(habitId) + '/entries/' + date,
            { method: 'DELETE' },
        );
    },

    getHabitEntries(habitId, from, to) {
        var params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        var qs = params.toString();
        return this.request(
            '/habits/' + encodeURIComponent(habitId) + '/entries' + (qs ? '?' + qs : ''),
        );
    },

    getAllHabitEntries(from, to) {
        var params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        var qs = params.toString();
        return this.request('/habits/entries/all' + (qs ? '?' + qs : ''));
    },

    getHabitStats(habitId, weeks) {
        var params = new URLSearchParams();
        if (weeks) params.set('weeks', weeks);
        var qs = params.toString();
        return this.request(
            '/habits/' + encodeURIComponent(habitId) + '/stats' + (qs ? '?' + qs : ''),
        );
    },

    // Friends
    sendFriendRequest(email) {
        return this.request('/friends/request', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    },

    respondToRequest(email, accept) {
        return this.request('/friends/respond', {
            method: 'POST',
            body: JSON.stringify({ email, accept }),
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
    },
};
