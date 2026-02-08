// View management

window.showAuth = function () {
    document.getElementById('auth-view').style.display = 'flex';
    document.getElementById('dashboard-view').style.display = 'none';
    localStorage.removeItem('userName');

    // Clear forms
    document.getElementById('signin-form').reset();
    document.getElementById('signup-form').reset();
    var errors = document.querySelectorAll('.auth-error');
    errors.forEach(function (el) {
        el.style.display = 'none';
    });

    Navigation.reset();
};

window.showDashboard = function (name) {
    document.getElementById('auth-view').style.display = 'none';
    document.getElementById('dashboard-view').style.display = 'block';
    document.getElementById('user-name').textContent = name || 'User';

    Navigation.init();
    Navigation.loaded.weight = true;
    loadDashboardData();

    // Sync dark mode from server
    API.getProfile()
        .then(function (profile) {
            var serverDark = profile.darkMode || false;
            document.body.classList.toggle('dark', serverDark);
            localStorage.setItem('darkMode', serverDark ? 'true' : 'false');
        })
        .catch(function () {
            // Ignore — localStorage value already applied
        });
};

// On page load — check for existing session via /api/me
(function init() {
    Toast.init();

    // Apply dark mode from localStorage immediately (no flash)
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark');
    }

    var userName = localStorage.getItem('userName');

    // Try to verify session with the server (cookie-based auth)
    if (userName) {
        // Optimistically show dashboard, verify in background
        window.showDashboard(userName);
    } else {
        // No stored user name — try /api/me in case cookie exists
        API.getProfile()
            .then(function (profile) {
                localStorage.setItem('userName', profile.name);
                window.showDashboard(profile.name);
            })
            .catch(function () {
                window.showAuth();
            });
    }
})();
