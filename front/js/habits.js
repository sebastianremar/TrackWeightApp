var Habits = {
    habits: [],
    todayEntries: {},
    currentSubView: 'today',
    calendarMonth: new Date(),

    COLORS: ['#667eea', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#3498db'],

    load: async function() {
        var container = document.getElementById('screen-habits');
        container.innerHTML = '';

        // Sub-navigation
        var nav = document.createElement('div');
        nav.className = 'habits-sub-nav';
        ['Today', 'Calendar', 'Stats'].forEach(function(label) {
            var btn = document.createElement('button');
            btn.textContent = label;
            btn.dataset.view = label.toLowerCase();
            if (label.toLowerCase() === Habits.currentSubView) btn.classList.add('active');
            btn.addEventListener('click', function() {
                Habits.currentSubView = label.toLowerCase();
                nav.querySelectorAll('button').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                Habits.renderSubView();
            });
            nav.appendChild(btn);
        });
        container.appendChild(nav);

        // Content area
        var content = document.createElement('div');
        content.id = 'habits-content';
        container.appendChild(content);

        try {
            var result = await API.getHabits();
            this.habits = result.habits || [];
        } catch (err) {
            Toast.error(err.message);
            return;
        }

        this.renderSubView();
    },

    renderSubView: function() {
        switch (this.currentSubView) {
            case 'today': this.renderToday(); break;
            case 'calendar': this.renderCalendar(); break;
            case 'stats': this.renderStats(); break;
        }
    },

    renderToday: async function() {
        var content = document.getElementById('habits-content');
        content.innerHTML = '';

        var card = document.createElement('section');
        card.className = 'card';

        var title = document.createElement('h2');
        title.textContent = 'Today\'s Habits';
        card.appendChild(title);

        if (this.habits.length === 0) {
            var empty = document.createElement('p');
            empty.className = 'empty-state';
            empty.textContent = 'No habits yet. Create one to get started!';
            card.appendChild(empty);
        } else {
            // Load today's entries for all habits
            var today = new Date().toISOString().split('T')[0];
            var weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            var weekStartStr = weekStart.toISOString().split('T')[0];

            try {
                var allEntries = await API.getAllHabitEntries(weekStartStr, today);
                this.todayEntries = {};
                var weekEntries = {};

                (allEntries.entries || []).forEach(function(e) {
                    if (e.date === today) {
                        Habits.todayEntries[e.habitId] = true;
                    }
                    if (!weekEntries[e.habitId]) weekEntries[e.habitId] = 0;
                    weekEntries[e.habitId]++;
                });

                this.habits.forEach(function(habit) {
                    var item = document.createElement('div');
                    item.className = 'habit-item';

                    var checkbox = document.createElement('div');
                    checkbox.className = 'habit-checkbox';
                    checkbox.style.color = habit.color;
                    if (Habits.todayEntries[habit.habitId]) {
                        checkbox.classList.add('checked');
                    }
                    checkbox.addEventListener('click', function() {
                        Habits.toggleHabit(habit, checkbox, today);
                    });

                    var info = document.createElement('div');
                    info.className = 'habit-info';

                    var nameEl = document.createElement('div');
                    nameEl.className = 'habit-name';
                    nameEl.textContent = habit.name;

                    var progress = document.createElement('div');
                    progress.className = 'habit-progress';
                    var count = weekEntries[habit.habitId] || 0;
                    progress.textContent = count + '/' + habit.targetFrequency + ' this week';

                    info.appendChild(nameEl);
                    info.appendChild(progress);

                    item.appendChild(checkbox);
                    item.appendChild(info);
                    card.appendChild(item);
                });
            } catch (err) {
                Toast.error(err.message);
            }
        }

        var addBtn = document.createElement('button');
        addBtn.className = 'habit-add-btn';
        addBtn.textContent = '+ New Habit';
        addBtn.addEventListener('click', function() {
            Habits.showHabitModal();
        });
        card.appendChild(addBtn);

        content.appendChild(card);
    },

    toggleHabit: async function(habit, checkbox, date) {
        var isChecked = checkbox.classList.contains('checked');
        try {
            if (isChecked) {
                await API.deleteHabitEntry(habit.habitId, date);
                checkbox.classList.remove('checked');
                delete this.todayEntries[habit.habitId];
            } else {
                await API.logHabitEntry(habit.habitId, date);
                checkbox.classList.add('checked');
                this.todayEntries[habit.habitId] = true;
            }
        } catch (err) {
            Toast.error(err.message);
        }
    },

    renderCalendar: async function() {
        var content = document.getElementById('habits-content');
        content.innerHTML = '';

        var card = document.createElement('section');
        card.className = 'card';

        // Calendar header
        var header = document.createElement('div');
        header.className = 'calendar-header';

        var prevBtn = document.createElement('button');
        prevBtn.className = 'calendar-nav-btn';
        prevBtn.textContent = '\u2190';
        prevBtn.addEventListener('click', function() {
            Habits.calendarMonth.setMonth(Habits.calendarMonth.getMonth() - 1);
            Habits.renderCalendar();
        });

        var monthLabel = document.createElement('h3');
        var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        monthLabel.textContent = months[this.calendarMonth.getMonth()] + ' ' + this.calendarMonth.getFullYear();

        var nextBtn = document.createElement('button');
        nextBtn.className = 'calendar-nav-btn';
        nextBtn.textContent = '\u2192';
        nextBtn.addEventListener('click', function() {
            Habits.calendarMonth.setMonth(Habits.calendarMonth.getMonth() + 1);
            Habits.renderCalendar();
        });

        header.appendChild(prevBtn);
        header.appendChild(monthLabel);
        header.appendChild(nextBtn);
        card.appendChild(header);

        // Grid
        var grid = document.createElement('div');
        grid.className = 'calendar-grid';

        // Day labels
        ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(function(d) {
            var label = document.createElement('div');
            label.className = 'calendar-day-label';
            label.textContent = d;
            grid.appendChild(label);
        });

        var year = this.calendarMonth.getFullYear();
        var month = this.calendarMonth.getMonth();
        var firstDay = new Date(year, month, 1).getDay();
        var daysInMonth = new Date(year, month + 1, 0).getDate();
        var today = new Date().toISOString().split('T')[0];

        // Fetch entries for this month
        var fromStr = year + '-' + String(month + 1).padStart(2, '0') + '-01';
        var toStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(daysInMonth).padStart(2, '0');

        var entriesByDate = {};
        try {
            var allEntries = await API.getAllHabitEntries(fromStr, toStr);
            (allEntries.entries || []).forEach(function(e) {
                if (!entriesByDate[e.date]) entriesByDate[e.date] = [];
                entriesByDate[e.date].push(e.habitId);
            });
        } catch (err) {
            // Continue without entries
        }

        // Build habit color lookup
        var habitColors = {};
        this.habits.forEach(function(h) {
            habitColors[h.habitId] = h.color;
        });

        // Empty cells before first day
        for (var i = 0; i < firstDay; i++) {
            var empty = document.createElement('div');
            empty.className = 'calendar-day empty';
            grid.appendChild(empty);
        }

        // Day cells
        for (var d = 1; d <= daysInMonth; d++) {
            var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
            var dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            if (dateStr === today) dayEl.classList.add('today');

            var dayNum = document.createElement('span');
            dayNum.textContent = d;
            dayEl.appendChild(dayNum);

            // Dots for completed habits
            var dayEntries = entriesByDate[dateStr];
            if (dayEntries && dayEntries.length > 0) {
                var dots = document.createElement('div');
                dots.className = 'calendar-dots';
                // Show up to 4 dots
                var unique = [];
                var seen = {};
                dayEntries.forEach(function(hid) {
                    if (!seen[hid]) {
                        seen[hid] = true;
                        unique.push(hid);
                    }
                });
                unique.slice(0, 4).forEach(function(hid) {
                    var dot = document.createElement('div');
                    dot.className = 'calendar-dot';
                    dot.style.backgroundColor = habitColors[hid] || '#667eea';
                    dots.appendChild(dot);
                });
                dayEl.appendChild(dots);
            }

            grid.appendChild(dayEl);
        }

        card.appendChild(grid);
        content.appendChild(card);
    },

    renderStats: async function() {
        var content = document.getElementById('habits-content');
        content.innerHTML = '';

        var card = document.createElement('section');
        card.className = 'card';

        var title = document.createElement('h2');
        title.textContent = 'Habit Stats (Last 4 Weeks)';
        card.appendChild(title);

        if (this.habits.length === 0) {
            var empty = document.createElement('p');
            empty.className = 'empty-state';
            empty.textContent = 'No habits to show stats for.';
            card.appendChild(empty);
            content.appendChild(card);
            return;
        }

        for (var i = 0; i < this.habits.length; i++) {
            var habit = this.habits[i];
            try {
                var statsResult = await API.getHabitStats(habit.habitId, 4);
                var totalCompletions = 0;
                var totalTarget = habit.targetFrequency * 4;
                (statsResult.stats || []).forEach(function(w) {
                    totalCompletions += w.completions;
                });

                var pct = totalTarget > 0 ? Math.round((totalCompletions / totalTarget) * 100) : 0;
                if (pct > 100) pct = 100;

                var bar = document.createElement('div');
                bar.className = 'habit-stat-bar';

                var label = document.createElement('div');
                label.className = 'habit-stat-label';
                label.textContent = habit.name;

                var track = document.createElement('div');
                track.className = 'habit-stat-track';

                var fill = document.createElement('div');
                fill.className = 'habit-stat-fill';
                fill.style.backgroundColor = habit.color;
                fill.style.width = '0%';
                track.appendChild(fill);

                var pctEl = document.createElement('div');
                pctEl.className = 'habit-stat-pct';
                pctEl.textContent = pct + '%';

                bar.appendChild(label);
                bar.appendChild(track);
                bar.appendChild(pctEl);
                card.appendChild(bar);

                // Animate fill
                (function(fillEl, pctVal) {
                    requestAnimationFrame(function() {
                        fillEl.style.width = pctVal + '%';
                    });
                })(fill, pct);
            } catch (err) {
                // Skip this habit on error
            }
        }

        content.appendChild(card);
    },

    showHabitModal: function(editHabit) {
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        var modal = document.createElement('div');
        modal.className = 'modal';

        var title = document.createElement('h3');
        title.textContent = editHabit ? 'Edit Habit' : 'New Habit';
        modal.appendChild(title);

        // Name
        var nameGroup = document.createElement('div');
        nameGroup.className = 'form-group';
        var nameLabel = document.createElement('label');
        nameLabel.textContent = 'Habit Name';
        var nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'e.g., Exercise';
        nameInput.maxLength = 100;
        if (editHabit) nameInput.value = editHabit.name;
        nameGroup.appendChild(nameLabel);
        nameGroup.appendChild(nameInput);
        modal.appendChild(nameGroup);

        // Frequency
        var freqGroup = document.createElement('div');
        freqGroup.className = 'form-group';
        var freqLabel = document.createElement('label');
        freqLabel.textContent = 'Target (days per week)';
        var freqSelect = document.createElement('select');
        for (var i = 1; i <= 7; i++) {
            var opt = document.createElement('option');
            opt.value = i;
            opt.textContent = i + (i === 1 ? ' day' : ' days');
            if (editHabit && editHabit.targetFrequency === i) opt.selected = true;
            if (!editHabit && i === 5) opt.selected = true;
            freqSelect.appendChild(opt);
        }
        freqGroup.appendChild(freqLabel);
        freqGroup.appendChild(freqSelect);
        modal.appendChild(freqGroup);

        // Color swatches
        var colorGroup = document.createElement('div');
        colorGroup.className = 'form-group';
        var colorLabel = document.createElement('label');
        colorLabel.textContent = 'Color';
        colorGroup.appendChild(colorLabel);

        var swatches = document.createElement('div');
        swatches.className = 'color-swatches';
        var selectedColor = (editHabit && editHabit.color) || this.COLORS[0];

        this.COLORS.forEach(function(c) {
            var swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = c;
            if (c === selectedColor) swatch.classList.add('selected');
            swatch.addEventListener('click', function() {
                swatches.querySelectorAll('.color-swatch').forEach(function(s) { s.classList.remove('selected'); });
                swatch.classList.add('selected');
                selectedColor = c;
            });
            swatches.appendChild(swatch);
        });
        colorGroup.appendChild(swatches);
        modal.appendChild(colorGroup);

        // Actions
        var actions = document.createElement('div');
        actions.className = 'modal-actions';

        var cancelBtn = document.createElement('button');
        cancelBtn.className = 'modal-cancel';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', function() {
            overlay.remove();
        });

        var saveBtn = document.createElement('button');
        saveBtn.className = 'modal-save';
        saveBtn.textContent = editHabit ? 'Save' : 'Create';
        saveBtn.addEventListener('click', async function() {
            var n = nameInput.value.trim();
            if (!n) {
                Toast.error('Please enter a name');
                return;
            }
            try {
                if (editHabit) {
                    await API.updateHabit(editHabit.habitId, {
                        name: n,
                        targetFrequency: parseInt(freqSelect.value),
                        color: selectedColor
                    });
                    Toast.success('Habit updated');
                } else {
                    await API.createHabit({
                        name: n,
                        targetFrequency: parseInt(freqSelect.value),
                        color: selectedColor
                    });
                    Toast.success('Habit created');
                }
                overlay.remove();
                Habits.load();
            } catch (err) {
                Toast.error(err.message);
            }
        });

        actions.appendChild(cancelBtn);
        actions.appendChild(saveBtn);
        modal.appendChild(actions);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        nameInput.focus();
    }
};
