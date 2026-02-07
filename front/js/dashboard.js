var currentRange = '30';
var allEntries = [];

function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

async function loadDashboardData() {
    try {
        var from = null;
        if (currentRange !== 'all') {
            var d = new Date();
            d.setDate(d.getDate() - parseInt(currentRange));
            from = d.toISOString().split('T')[0];
        }

        var result = await API.getWeightHistory(from);
        allEntries = result.entries || [];
        renderChart(allEntries);
        updateStats(allEntries);
        updateLastEntry(allEntries);
        renderEntriesTable(allEntries);
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

// Render recent entries table
function renderEntriesTable(entries) {
    var container = document.getElementById('entries-table-container');
    if (!container) return;
    container.innerHTML = '';

    if (!entries || entries.length === 0) {
        container.innerHTML = '<p class="empty-state">No weight entries yet.</p>';
        return;
    }

    // Show most recent first, limit to 10
    var recent = entries.slice().reverse().slice(0, 10);

    var table = document.createElement('table');
    table.className = 'entries-table';

    var thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Date</th><th>Weight</th><th>Actions</th></tr>';
    table.appendChild(thead);

    var tbody = document.createElement('tbody');

    recent.forEach(function(entry) {
        var tr = document.createElement('tr');

        var tdDate = document.createElement('td');
        tdDate.textContent = entry.date;
        tr.appendChild(tdDate);

        var tdWeight = document.createElement('td');
        tdWeight.textContent = entry.weight + ' kg';
        tr.appendChild(tdWeight);

        var tdActions = document.createElement('td');
        tdActions.className = 'entry-actions';

        var editBtn = document.createElement('button');
        editBtn.className = 'entry-btn entry-edit';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', function() {
            editEntry(entry);
        });

        var deleteBtn = document.createElement('button');
        deleteBtn.className = 'entry-btn entry-delete';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', function() {
            Confirm.show('Delete entry for ' + entry.date + '?', function() {
                deleteEntry(entry.date);
            });
        });

        tdActions.appendChild(editBtn);
        tdActions.appendChild(deleteBtn);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
}

function editEntry(entry) {
    var weightInput = document.getElementById('weight-input');
    var dateInput = document.getElementById('weight-date');
    weightInput.value = entry.weight;
    if (dateInput) dateInput.value = entry.date;
    weightInput.focus();
    Toast.info('Editing entry for ' + entry.date + '. Submit to update.');
}

async function deleteEntry(date) {
    try {
        await API.deleteWeight(date);
        Toast.success('Entry deleted');
        loadDashboardData();
    } catch (err) {
        Toast.error(err.message);
    }
}

// Weight form submit
document.getElementById('weight-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    var input = document.getElementById('weight-input');
    var dateInput = document.getElementById('weight-date');
    var weight = parseFloat(input.value);
    var date = dateInput ? dateInput.value : getTodayStr();

    if (!date) date = getTodayStr();

    try {
        await API.logWeight(weight, date);
        input.value = '';
        if (dateInput) dateInput.value = getTodayStr();
        Toast.success('Weight logged successfully!');
        loadDashboardData();
    } catch (err) {
        Toast.error(err.message);
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
