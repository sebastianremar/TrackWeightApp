var Habits = {
    habits: [],
    todayEntries: {},
    calendarEntries: {},
    selectedDate: null,
    currentSubView: 'day',
    calendarMonth: new Date(),
    selectedDayDate: new Date().toISOString().split('T')[0],
    weekOffset: 0,

    COLORS: ['#667eea', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#3498db'],

    load: async function() {
        var container = document.getElementById('screen-habits');
        container.innerHTML = '';

        // Sub-navigation
        var nav = document.createElement('div');
        nav.className = 'habits-sub-nav';
        ['Day', 'Week', 'Month', 'Stats'].forEach(function(label) {
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

        var spinner = Spinner.show(content);
        try {
            var result = await API.getHabits();
            this.habits = result.habits || [];
        } catch (err) {
            Spinner.hide(spinner);
            Toast.error(err.message);
            return;
        }

        Spinner.hide(spinner);
        this.renderSubView();
    },

    renderSubView: function() {
        switch (this.currentSubView) {
            case 'day': this.renderDay(); break;
            case 'week': this.renderWeek(); break;
            case 'month': this.renderMonth(); break;
            case 'stats': this.renderStats(); break;
        }
    },

    // ========== DAY VIEW ==========
    renderDay: async function() {
        var content = document.getElementById('habits-content');
        content.innerHTML = '';

        var card = document.createElement('section');
        card.className = 'card';

        // Date navigation header
        var today = new Date().toISOString().split('T')[0];
        var header = document.createElement('div');
        header.className = 'calendar-header';

        var prevBtn = document.createElement('button');
        prevBtn.className = 'calendar-nav-btn';
        prevBtn.textContent = '\u2190';
        prevBtn.addEventListener('click', function() {
            var d = Habits._parseDate(Habits.selectedDayDate);
            d.setDate(d.getDate() - 1);
            Habits.selectedDayDate = Habits._formatDate(d);
            Habits.renderDay();
        });

        var dateLabel = document.createElement('h3');
        var selDate = this._parseDate(this.selectedDayDate);
        var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        dateLabel.textContent = days[selDate.getDay()] + ', ' + months[selDate.getMonth()] + ' ' + selDate.getDate();

        var nextBtn = document.createElement('button');
        nextBtn.className = 'calendar-nav-btn';
        nextBtn.textContent = '\u2192';
        if (this.selectedDayDate >= today) {
            nextBtn.disabled = true;
            nextBtn.style.opacity = '0.3';
            nextBtn.style.cursor = 'default';
        } else {
            nextBtn.addEventListener('click', function() {
                var d = Habits._parseDate(Habits.selectedDayDate);
                d.setDate(d.getDate() + 1);
                Habits.selectedDayDate = Habits._formatDate(d);
                Habits.renderDay();
            });
        }

        header.appendChild(prevBtn);
        header.appendChild(dateLabel);
        header.appendChild(nextBtn);
        card.appendChild(header);

        if (this.habits.length === 0) {
            var empty = document.createElement('p');
            empty.className = 'empty-state';
            empty.textContent = 'No habits yet. Create one to get started!';
            card.appendChild(empty);
        } else {
            // Load entries for selected day + surrounding week for progress
            var weekStart = new Date(selDate);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            var weekStartStr = this._formatDate(weekStart);

            try {
                var allEntries = await API.getAllHabitEntries(weekStartStr, this.selectedDayDate);
                this.todayEntries = {};
                var weekEntries = {};

                (allEntries.entries || []).forEach(function(e) {
                    if (e.date === Habits.selectedDayDate) {
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
                        Habits.toggleDayHabit(habit, checkbox, Habits.selectedDayDate);
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

    toggleDayHabit: async function(habit, checkbox, date) {
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

    // ========== WEEK VIEW ==========
    renderWeek: async function() {
        var content = document.getElementById('habits-content');
        content.innerHTML = '';

        var card = document.createElement('section');
        card.className = 'card';

        var today = new Date();
        var todayStr = this._formatDate(today);

        // Week start = Monday of the offset week
        var weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7) + (this.weekOffset * 7));
        var weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        // Navigation header
        var header = document.createElement('div');
        header.className = 'calendar-header';

        var prevBtn = document.createElement('button');
        prevBtn.className = 'calendar-nav-btn';
        prevBtn.textContent = '\u2190';
        prevBtn.addEventListener('click', function() {
            Habits.weekOffset--;
            Habits.renderWeek();
        });

        var weekLabel = document.createElement('h3');
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        weekLabel.textContent = months[weekStart.getMonth()] + ' ' + weekStart.getDate() + ' \u2013 ' + months[weekEnd.getMonth()] + ' ' + weekEnd.getDate();

        var nextBtn = document.createElement('button');
        nextBtn.className = 'calendar-nav-btn';
        nextBtn.textContent = '\u2192';
        if (this.weekOffset >= 0) {
            nextBtn.disabled = true;
            nextBtn.style.opacity = '0.3';
            nextBtn.style.cursor = 'default';
        } else {
            nextBtn.addEventListener('click', function() {
                Habits.weekOffset++;
                Habits.renderWeek();
            });
        }

        header.appendChild(prevBtn);
        header.appendChild(weekLabel);
        header.appendChild(nextBtn);
        card.appendChild(header);

        // Fetch entries for the week
        var fromStr = this._formatDate(weekStart);
        var toStr = this._formatDate(weekEnd) > todayStr ? todayStr : this._formatDate(weekEnd);

        this.calendarEntries = {};
        try {
            var allEntries = await API.getAllHabitEntries(fromStr, toStr);
            (allEntries.entries || []).forEach(function(e) {
                if (!Habits.calendarEntries[e.date]) Habits.calendarEntries[e.date] = [];
                Habits.calendarEntries[e.date].push(e.habitId);
            });
        } catch (err) {
            // Continue without entries
        }

        var habitColors = {};
        this.habits.forEach(function(h) { habitColors[h.habitId] = h.color; });

        // Week strip
        var strip = document.createElement('div');
        strip.className = 'week-strip';
        strip.id = 'week-strip';

        var dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

        // Default selected day in the week
        if (!this.selectedDate || this.selectedDate < fromStr || this.selectedDate > this._formatDate(weekEnd)) {
            this.selectedDate = todayStr >= fromStr && todayStr <= this._formatDate(weekEnd) ? todayStr : fromStr;
        }

        for (var i = 0; i < 7; i++) {
            var dayDate = new Date(weekStart);
            dayDate.setDate(dayDate.getDate() + i);
            var dateStr = this._formatDate(dayDate);

            var dayEl = document.createElement('div');
            dayEl.className = 'week-day';
            dayEl.dataset.date = dateStr;

            if (dateStr === todayStr) dayEl.classList.add('today');
            if (dateStr > todayStr) dayEl.classList.add('future');
            if (dateStr === this.selectedDate) dayEl.classList.add('selected');

            var nameSpan = document.createElement('div');
            nameSpan.className = 'week-day-name';
            nameSpan.textContent = dayNames[i];

            var numSpan = document.createElement('div');
            numSpan.className = 'week-day-num';
            numSpan.textContent = dayDate.getDate();

            // Dots
            var dotsDiv = document.createElement('div');
            dotsDiv.className = 'week-day-dots';
            var dayEntries = this.calendarEntries[dateStr] || [];
            var seen = {};
            dayEntries.forEach(function(hid) {
                if (!seen[hid]) {
                    seen[hid] = true;
                    var dot = document.createElement('div');
                    dot.className = 'calendar-dot';
                    dot.style.backgroundColor = habitColors[hid] || '#667eea';
                    dotsDiv.appendChild(dot);
                }
            });

            dayEl.appendChild(nameSpan);
            dayEl.appendChild(numSpan);
            dayEl.appendChild(dotsDiv);

            if (dateStr <= todayStr) {
                (function(ds) {
                    dayEl.addEventListener('click', function() {
                        strip.querySelectorAll('.week-day').forEach(function(d) { d.classList.remove('selected'); });
                        dayEl.classList.add('selected');
                        Habits.selectedDate = ds;
                        Habits.showDayDetail(ds, 'week-day-detail', 'week-strip');
                    });
                })(dateStr);
            }

            strip.appendChild(dayEl);
        }

        card.appendChild(strip);

        // Day detail panel
        var detailPanel = document.createElement('div');
        detailPanel.id = 'week-day-detail';
        card.appendChild(detailPanel);

        content.appendChild(card);

        // Auto-open selected day
        this.showDayDetail(this.selectedDate, 'week-day-detail', 'week-strip');
    },

    // ========== MONTH VIEW ==========
    renderMonth: async function() {
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
            Habits.renderMonth();
        });

        var monthLabel = document.createElement('h3');
        var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        monthLabel.textContent = monthNames[this.calendarMonth.getMonth()] + ' ' + this.calendarMonth.getFullYear();

        var nextBtn = document.createElement('button');
        nextBtn.className = 'calendar-nav-btn';
        nextBtn.textContent = '\u2192';
        nextBtn.addEventListener('click', function() {
            Habits.calendarMonth.setMonth(Habits.calendarMonth.getMonth() + 1);
            Habits.renderMonth();
        });

        header.appendChild(prevBtn);
        header.appendChild(monthLabel);
        header.appendChild(nextBtn);
        card.appendChild(header);

        // Grid
        var grid = document.createElement('div');
        grid.className = 'calendar-grid';
        grid.id = 'calendar-grid';

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

        this.calendarEntries = {};
        try {
            var allEntries = await API.getAllHabitEntries(fromStr, toStr);
            (allEntries.entries || []).forEach(function(e) {
                if (!Habits.calendarEntries[e.date]) Habits.calendarEntries[e.date] = [];
                Habits.calendarEntries[e.date].push(e.habitId);
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
            dayEl.dataset.date = dateStr;
            if (dateStr === today) dayEl.classList.add('today');

            if (dateStr > today) {
                dayEl.classList.add('future');
            } else {
                (function(ds) {
                    dayEl.addEventListener('click', function() {
                        var prev = grid.querySelector('.calendar-day.selected');
                        if (prev) prev.classList.remove('selected');
                        this.classList.add('selected');
                        Habits.showDayDetail(ds, 'calendar-day-detail', 'calendar-grid');
                    });
                })(dateStr);
            }

            var dayNum = document.createElement('span');
            dayNum.textContent = d;
            dayEl.appendChild(dayNum);

            this.renderDayDots(dayEl, dateStr, habitColors);

            grid.appendChild(dayEl);
        }

        card.appendChild(grid);

        // Day detail panel
        var detailPanel = document.createElement('div');
        detailPanel.id = 'calendar-day-detail';
        card.appendChild(detailPanel);

        content.appendChild(card);

        // Auto-open today if in current month
        var todayMonth = new Date().getMonth();
        var todayYear = new Date().getFullYear();
        if (year === todayYear && month === todayMonth) {
            var todayCell = grid.querySelector('.calendar-day[data-date="' + today + '"]');
            if (todayCell) {
                todayCell.classList.add('selected');
                this.showDayDetail(today, 'calendar-day-detail', 'calendar-grid');
            }
        }
    },

    renderDayDots: function(dayEl, dateStr, habitColors) {
        var existingDots = dayEl.querySelector('.calendar-dots');
        if (existingDots) existingDots.remove();

        var dayEntries = this.calendarEntries[dateStr];
        if (dayEntries && dayEntries.length > 0) {
            var dots = document.createElement('div');
            dots.className = 'calendar-dots';
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
    },

    // Shared day detail panel — used by Week and Month views
    showDayDetail: function(dateStr, panelId, gridId) {
        this.selectedDate = dateStr;
        var panel = document.getElementById(panelId || 'calendar-day-detail');
        if (!panel) return;
        panel.innerHTML = '';

        var parts = dateStr.split('-');
        var dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        var dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var header = document.createElement('h3');
        header.className = 'day-detail-header';
        header.textContent = dayNames[dateObj.getDay()] + ', ' + monthNames[dateObj.getMonth()] + ' ' + dateObj.getDate();
        panel.appendChild(header);

        if (this.habits.length === 0) {
            var empty = document.createElement('p');
            empty.className = 'empty-state';
            empty.textContent = 'No habits yet.';
            panel.appendChild(empty);
            return;
        }

        var dayEntries = this.calendarEntries[dateStr] || [];
        var entrySet = {};
        dayEntries.forEach(function(hid) { entrySet[hid] = true; });

        var habitColors = {};
        this.habits.forEach(function(h) { habitColors[h.habitId] = h.color; });

        var actualGridId = gridId || 'calendar-grid';
        var actualPanelId = panelId || 'calendar-day-detail';

        this.habits.forEach(function(habit) {
            var item = document.createElement('div');
            item.className = 'habit-item';

            var checkbox = document.createElement('div');
            checkbox.className = 'habit-checkbox';
            checkbox.style.color = habit.color;
            if (entrySet[habit.habitId]) {
                checkbox.classList.add('checked');
            }
            checkbox.addEventListener('click', function() {
                Habits.toggleCalendarHabit(habit, checkbox, dateStr, habitColors, actualGridId, actualPanelId);
            });

            var info = document.createElement('div');
            info.className = 'habit-info';

            var nameEl = document.createElement('div');
            nameEl.className = 'habit-name';
            nameEl.textContent = habit.name;

            info.appendChild(nameEl);
            item.appendChild(checkbox);
            item.appendChild(info);
            panel.appendChild(item);
        });
    },

    toggleCalendarHabit: async function(habit, checkbox, dateStr, habitColors, gridId, panelId) {
        var isChecked = checkbox.classList.contains('checked');
        try {
            if (isChecked) {
                await API.deleteHabitEntry(habit.habitId, dateStr);
                checkbox.classList.remove('checked');
                var entries = this.calendarEntries[dateStr] || [];
                var idx = entries.indexOf(habit.habitId);
                if (idx !== -1) entries.splice(idx, 1);
                if (entries.length === 0) delete this.calendarEntries[dateStr];
            } else {
                await API.logHabitEntry(habit.habitId, dateStr);
                checkbox.classList.add('checked');
                if (!this.calendarEntries[dateStr]) this.calendarEntries[dateStr] = [];
                this.calendarEntries[dateStr].push(habit.habitId);
            }
            // Update dots on the day cell
            this._updateDots(dateStr, habitColors, gridId);
        } catch (err) {
            Toast.error(err.message);
        }
    },

    _updateDots: function(dateStr, habitColors, gridId) {
        var grid = document.getElementById(gridId);
        if (!grid) return;

        if (gridId === 'week-strip') {
            // Week view: update week-day-dots
            var dayCell = grid.querySelector('.week-day[data-date="' + dateStr + '"]');
            if (dayCell) {
                var dotsDiv = dayCell.querySelector('.week-day-dots');
                if (dotsDiv) {
                    dotsDiv.innerHTML = '';
                    var dayEntries = this.calendarEntries[dateStr] || [];
                    var seen = {};
                    dayEntries.forEach(function(hid) {
                        if (!seen[hid]) {
                            seen[hid] = true;
                            var dot = document.createElement('div');
                            dot.className = 'calendar-dot';
                            dot.style.backgroundColor = habitColors[hid] || '#667eea';
                            dotsDiv.appendChild(dot);
                        }
                    });
                }
            }
        } else {
            // Month view: use renderDayDots
            var dayCell = grid.querySelector('.calendar-day[data-date="' + dateStr + '"]');
            if (dayCell) {
                this.renderDayDots(dayCell, dateStr, habitColors);
            }
        }
    },

    // ========== CREATIVE STATS ==========
    renderStats: async function() {
        var content = document.getElementById('habits-content');
        content.innerHTML = '';

        var card = document.createElement('section');
        card.className = 'card';

        var title = document.createElement('h2');
        title.textContent = 'Habit Stats';
        card.appendChild(title);

        if (this.habits.length === 0) {
            var empty = document.createElement('p');
            empty.className = 'empty-state';
            empty.textContent = 'No habits to show stats for.';
            card.appendChild(empty);
            content.appendChild(card);
            return;
        }

        // Period toggle
        var periodToggle = document.createElement('div');
        periodToggle.className = 'stats-period-toggle';

        var currentPeriod = 'week';

        var weekBtn = document.createElement('button');
        weekBtn.textContent = 'This Week';
        weekBtn.classList.add('active');
        weekBtn.addEventListener('click', function() {
            currentPeriod = 'week';
            weekBtn.classList.add('active');
            monthBtn.classList.remove('active');
            loadStats('week');
        });

        var monthBtn = document.createElement('button');
        monthBtn.textContent = 'This Month';
        monthBtn.addEventListener('click', function() {
            currentPeriod = 'month';
            monthBtn.classList.add('active');
            weekBtn.classList.remove('active');
            loadStats('month');
        });

        periodToggle.appendChild(weekBtn);
        periodToggle.appendChild(monthBtn);
        card.appendChild(periodToggle);

        // Donut container
        var donutContainer = document.createElement('div');
        donutContainer.id = 'stats-donut-container';
        card.appendChild(donutContainer);

        // Legend container
        var legendContainer = document.createElement('div');
        legendContainer.className = 'donut-legend';
        legendContainer.id = 'stats-donut-legend';
        card.appendChild(legendContainer);

        // Streaks section
        var streaksTitle = document.createElement('h2');
        streaksTitle.textContent = 'Streaks';
        streaksTitle.style.marginTop = '8px';
        card.appendChild(streaksTitle);

        var streaksContainer = document.createElement('div');
        streaksContainer.id = 'stats-streaks';
        card.appendChild(streaksContainer);

        content.appendChild(card);

        var habits = this.habits;

        async function loadStats(period) {
            var today = new Date();
            var todayStr = Habits._formatDate(today);
            var from, to, numDays;

            if (period === 'week') {
                var weekStart = new Date(today);
                weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
                from = Habits._formatDate(weekStart);
                to = todayStr;
                numDays = Math.floor((today - weekStart) / 86400000) + 1;
            } else {
                var monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                from = Habits._formatDate(monthStart);
                to = todayStr;
                numDays = Math.floor((today - monthStart) / 86400000) + 1;
            }

            try {
                var allEntries = await API.getAllHabitEntries(from, to);
                var entriesByHabit = {};
                habits.forEach(function(h) { entriesByHabit[h.habitId] = []; });

                (allEntries.entries || []).forEach(function(e) {
                    if (entriesByHabit[e.habitId]) {
                        entriesByHabit[e.habitId].push(e.date);
                    }
                });

                Habits.renderDonutChart(habits, entriesByHabit);
                Habits.renderStreaks(habits, entriesByHabit, from, to, numDays);
            } catch (err) {
                Toast.error(err.message);
            }
        }

        loadStats('week');
    },

    renderDonutChart: function(habits, entriesByHabit) {
        var container = document.getElementById('stats-donut-container');
        var legend = document.getElementById('stats-donut-legend');
        container.innerHTML = '';
        legend.innerHTML = '';

        var data = habits.map(function(h) {
            var dates = {};
            (entriesByHabit[h.habitId] || []).forEach(function(d) { dates[d] = true; });
            return { name: h.name, color: h.color, value: Object.keys(dates).length };
        }).filter(function(d) { return d.value > 0; });

        if (data.length === 0) {
            container.innerHTML = '<p class="empty-state">No completions in this period.</p>';
            return;
        }

        var width = 220;
        var height = 220;
        var radius = Math.min(width, height) / 2;
        var innerRadius = radius * 0.55;

        var svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

        var pie = d3.pie()
            .value(function(d) { return d.value; })
            .sort(null)
            .padAngle(0.03);

        var arc = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(radius);

        var arcHover = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(radius + 8);

        var total = d3.sum(data, function(d) { return d.value; });

        // Center total
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '-0.2em')
            .style('font-size', '28px')
            .style('font-weight', '700')
            .style('fill', 'var(--text-primary)')
            .text(total);

        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '1.2em')
            .style('font-size', '12px')
            .style('fill', 'var(--text-muted)')
            .text('completions');

        var arcs = svg.selectAll('.arc')
            .data(pie(data))
            .enter()
            .append('g')
            .attr('class', 'arc');

        arcs.append('path')
            .attr('d', function(d) {
                // Start from zero for animation
                var startArc = d3.arc().innerRadius(innerRadius).outerRadius(innerRadius);
                return startArc(d);
            })
            .attr('fill', function(d) { return d.data.color; })
            .style('cursor', 'pointer')
            .transition()
            .duration(800)
            .attrTween('d', function(d) {
                var interpolate = d3.interpolate(
                    { startAngle: d.startAngle, endAngle: d.startAngle },
                    d
                );
                return function(t) {
                    return arc(interpolate(t));
                };
            });

        // Add hover after transition
        setTimeout(function() {
            arcs.selectAll('path')
                .on('mouseenter', function(event, d) {
                    d3.select(this).transition().duration(200).attr('d', arcHover(d));
                })
                .on('mouseleave', function(event, d) {
                    d3.select(this).transition().duration(200).attr('d', arc(d));
                });
        }, 850);

        // Legend
        data.forEach(function(d) {
            var item = document.createElement('div');
            item.className = 'donut-legend-item';

            var color = document.createElement('div');
            color.className = 'donut-legend-color';
            color.style.backgroundColor = d.color;

            var label = document.createElement('span');
            label.textContent = d.name + ' (' + d.value + ')';

            item.appendChild(color);
            item.appendChild(label);
            legend.appendChild(item);
        });
    },

    renderStreaks: function(habits, entriesByHabit, from, to, numDays) {
        var container = document.getElementById('stats-streaks');
        container.innerHTML = '';

        habits.forEach(function(habit) {
            var row = document.createElement('div');
            row.className = 'streak-row';

            var headerDiv = document.createElement('div');
            headerDiv.className = 'streak-header';

            var nameSpan = document.createElement('span');
            nameSpan.className = 'streak-habit-name';
            nameSpan.textContent = habit.name;

            // Calculate streak
            var dateSet = {};
            (entriesByHabit[habit.habitId] || []).forEach(function(d) { dateSet[d] = true; });

            var currentStreak = 0;
            var bestStreak = 0;
            var tempStreak = 0;

            // Walk from 'from' to 'to'
            var d = Habits._parseDate(from);
            var endDate = Habits._parseDate(to);

            while (d <= endDate) {
                var ds = Habits._formatDate(d);
                if (dateSet[ds]) {
                    tempStreak++;
                    if (tempStreak > bestStreak) bestStreak = tempStreak;
                } else {
                    tempStreak = 0;
                }
                d.setDate(d.getDate() + 1);
            }

            // Current streak: count backwards from 'to'
            var cDate = Habits._parseDate(to);
            var fromDate = Habits._parseDate(from);
            currentStreak = 0;
            while (cDate >= fromDate) {
                var cs = Habits._formatDate(cDate);
                if (dateSet[cs]) {
                    currentStreak++;
                    cDate.setDate(cDate.getDate() - 1);
                } else {
                    break;
                }
            }

            var infoSpan = document.createElement('span');
            infoSpan.className = 'streak-info';
            infoSpan.textContent = currentStreak + ' day streak (best: ' + bestStreak + ')';

            headerDiv.appendChild(nameSpan);
            headerDiv.appendChild(infoSpan);
            row.appendChild(headerDiv);

            // Heatmap cells
            var cellsDiv = document.createElement('div');
            cellsDiv.className = 'streak-cells';

            var cellDate = Habits._parseDate(from);
            for (var i = 0; i < numDays; i++) {
                var cell = document.createElement('div');
                cell.className = 'streak-cell';
                var cellStr = Habits._formatDate(cellDate);
                if (dateSet[cellStr]) {
                    cell.classList.add('filled');
                    cell.style.backgroundColor = habit.color;
                } else {
                    cell.classList.add('empty');
                }
                cell.title = cellStr;
                cellsDiv.appendChild(cell);
                cellDate.setDate(cellDate.getDate() + 1);
            }

            row.appendChild(cellsDiv);
            container.appendChild(row);
        });
    },

    // ========== HABIT MODAL ==========
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
    },

    // ========== HELPERS ==========
    _parseDate: function(str) {
        var parts = str.split('-');
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    },

    _formatDate: function(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
};
