var currentRange = '30';

async function loadDashboardData() {
    try {
        var from = null;
        if (currentRange !== 'all') {
            var d = new Date();
            d.setDate(d.getDate() - parseInt(currentRange));
            from = d.toISOString().split('T')[0];
        }

        var result = await API.getWeightHistory(from);
        renderChart(result.entries);
        updateStats(result.entries);
        updateLastEntry(result.entries);
    } catch (err) {
        if (err.message !== 'Session expired') {
            console.error('Failed to load data:', err);
        }
    }
}

function updateLastEntry(entries) {
    var el = document.getElementById('last-entry');
    if (entries && entries.length > 0) {
        var latest = entries[entries.length - 1];
        el.textContent = 'Last entry: ' + latest.weight + ' kg on ' + latest.date;
    } else {
        el.textContent = 'No entries yet';
    }
}

function updateStats(entries) {
    var currentEl = document.getElementById('stat-current');
    var changeEl = document.getElementById('stat-change');
    var lowestEl = document.getElementById('stat-lowest');

    if (!entries || entries.length === 0) {
        currentEl.textContent = '--';
        currentEl.className = 'stat-value';
        changeEl.textContent = '--';
        changeEl.className = 'stat-value';
        lowestEl.textContent = '--';
        return;
    }

    var latest = entries[entries.length - 1];
    currentEl.textContent = latest.weight + ' kg';
    currentEl.className = 'stat-value';

    // Lowest
    var lowest = entries.reduce(function(min, e) {
        return e.weight < min.weight ? e : min;
    }, entries[0]);
    lowestEl.textContent = lowest.weight + ' kg';

    // Change from first to last in current range
    if (entries.length >= 2) {
        var first = entries[0];
        var diff = (latest.weight - first.weight).toFixed(1);
        if (diff > 0) {
            changeEl.textContent = '+' + diff + ' kg';
            changeEl.className = 'stat-value positive';
        } else if (diff < 0) {
            changeEl.textContent = diff + ' kg';
            changeEl.className = 'stat-value negative';
        } else {
            changeEl.textContent = '0 kg';
            changeEl.className = 'stat-value';
        }
    } else {
        changeEl.textContent = '--';
        changeEl.className = 'stat-value';
    }
}

// Weight form submit
document.getElementById('weight-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    var input = document.getElementById('weight-input');
    var weight = parseFloat(input.value);
    var today = new Date().toISOString().split('T')[0];
    var feedback = document.getElementById('weight-feedback');

    feedback.className = 'weight-feedback';
    feedback.style.display = 'none';

    try {
        await API.logWeight(weight, today);
        input.value = '';
        feedback.textContent = 'Weight logged successfully!';
        feedback.className = 'weight-feedback success';
        loadDashboardData();
    } catch (err) {
        feedback.textContent = err.message;
        feedback.className = 'weight-feedback error';
    }
});

// Date range buttons
document.querySelectorAll('.chart-controls button').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.chart-controls button').forEach(function(b) {
            b.classList.remove('active');
        });
        btn.classList.add('active');
        currentRange = btn.dataset.range;
        loadDashboardData();
    });
});

// Logout
document.getElementById('logout-btn').addEventListener('click', function() {
    window.showAuth();
});
