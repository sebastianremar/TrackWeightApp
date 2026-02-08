var Navigation = {
    currentScreen: 'weight',
    loaded: { weight: false, habits: false, friends: false, settings: false },
    _initialized: false,

    init: function() {
        if (this._initialized) return;
        this._initialized = true;

        var self = this;
        document.querySelectorAll('.nav-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                self.switchTo(tab.dataset.screen);
            });
        });

        // Set date input max to today
        var dateInput = document.getElementById('weight-date');
        if (dateInput) {
            var today = new Date().toISOString().split('T')[0];
            dateInput.max = today;
            dateInput.value = today;
        }
    },

    switchTo: function(screen) {
        if (screen === this.currentScreen) return;

        // Update tabs
        document.querySelectorAll('.nav-tab').forEach(function(tab) {
            var isActive = tab.dataset.screen === screen;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-current', isActive ? 'true' : 'false');
        });

        // Update screens
        document.querySelectorAll('.screen').forEach(function(s) {
            s.classList.remove('active');
        });
        var target = document.getElementById('screen-' + screen);
        if (target) target.classList.add('active');

        this.currentScreen = screen;

        // Lazy load data on first visit
        if (!this.loaded[screen]) {
            this.loaded[screen] = true;
            this.loadScreen(screen);
        }
    },

    loadScreen: function(screen) {
        switch (screen) {
            case 'weight':
                loadDashboardData();
                break;
            case 'habits':
                if (typeof Habits !== 'undefined') Habits.load();
                break;
            case 'friends':
                if (typeof Friends !== 'undefined') Friends.load();
                break;
            case 'settings':
                if (typeof Settings !== 'undefined') Settings.load();
                break;
        }
    },

    reset: function() {
        this.currentScreen = 'weight';
        this.loaded = { weight: false, habits: false, friends: false, settings: false };

        document.querySelectorAll('.nav-tab').forEach(function(tab) {
            tab.classList.toggle('active', tab.dataset.screen === 'weight');
        });
        document.querySelectorAll('.screen').forEach(function(s) {
            s.classList.remove('active');
        });
        var weightScreen = document.getElementById('screen-weight');
        if (weightScreen) weightScreen.classList.add('active');
    }
};
