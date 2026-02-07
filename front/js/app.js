// View management
function isTokenExpired(token) {
    try {
        var payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 < Date.now();
    } catch (e) {
        return true;
    }
}

window.showAuth = function() {
    document.getElementById('auth-view').style.display = 'flex';
    document.getElementById('dashboard-view').style.display = 'none';
    localStorage.removeItem('token');
    localStorage.removeItem('userName');

    // Clear forms
    document.getElementById('signin-form').reset();
    document.getElementById('signup-form').reset();
    var errors = document.querySelectorAll('.auth-error');
    errors.forEach(function(el) { el.style.display = 'none'; });

    Navigation.reset();
};

window.showDashboard = function(name) {
    document.getElementById('auth-view').style.display = 'none';
    document.getElementById('dashboard-view').style.display = 'block';
    document.getElementById('user-name').textContent = name || 'User';

    Navigation.init();
    Navigation.loaded.weight = true;
    loadDashboardData();

    // Sync dark mode from server
    API.getProfile().then(function(profile) {
        var serverDark = profile.darkMode || false;
        document.body.classList.toggle('dark', serverDark);
        localStorage.setItem('darkMode', serverDark ? 'true' : 'false');
    }).catch(function() {
        // Ignore — localStorage value already applied
    });
};

// On page load — check for existing session
(function init() {
    Toast.init();

    // Apply dark mode from localStorage immediately (no flash)
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark');
    }

    var token = localStorage.getItem('token');
    var userName = localStorage.getItem('userName');

    if (token && !isTokenExpired(token)) {
        window.showDashboard(userName);
    } else {
        window.showAuth();
    }
})();
