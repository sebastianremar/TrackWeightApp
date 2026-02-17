const { buildDigestHtml } = require('../../lib/digestTemplate');

const baseData = {
    todayEvents: [],
    tomorrowEvents: [],
    goodHabitsCount: 0,
    habitsCompletedToday: 0,
    habitsMissedToday: 0,
    weeklyProgressPct: 0,
    overdueTodos: [],
    dueTodayTodos: [],
    dueTomorrowTodos: [],
    habitWeeklyReview: [],
};

const baseParams = {
    firstName: 'Sara',
    dateLabel: 'Monday, January 15, 2025',
    isSunday: false,
    appUrl: 'https://trackmyweight.net',
    unsubscribeUrl: 'https://trackmyweight.net/api/digest/unsubscribe?token=abc',
    data: baseData,
};

describe('buildDigestHtml', () => {
    test('returns valid HTML with greeting', () => {
        const html = buildDigestHtml(baseParams);
        expect(html).toContain('Good evening, Sara');
        expect(html).toContain('Monday, January 15, 2025');
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('</html>');
    });

    test('includes unsubscribe link', () => {
        const html = buildDigestHtml(baseParams);
        expect(html).toContain('Unsubscribe from daily digest');
        expect(html).toContain('token=abc');
    });

    test('includes app link in footer', () => {
        const html = buildDigestHtml(baseParams);
        expect(html).toContain('Open Sara Peso');
        expect(html).toContain('https://trackmyweight.net');
    });

    test('shows empty calendar message when no events', () => {
        const html = buildDigestHtml(baseParams);
        expect(html).toContain('No events today');
        expect(html).toContain('Nothing scheduled tomorrow');
    });

    test('shows calendar events when present', () => {
        const html = buildDigestHtml({
            ...baseParams,
            data: {
                ...baseData,
                todayEvents: [
                    { title: 'Team Meeting', startTime: '09:00', endTime: '10:00', color: '#2563EB' },
                ],
                tomorrowEvents: [
                    { title: 'Lunch', startTime: '12:00', color: '#16a34a' },
                ],
            },
        });
        expect(html).toContain('Team Meeting');
        expect(html).toContain('09:00 - 10:00');
        expect(html).toContain('Lunch');
        expect(html).toContain('12:00');
    });

    test('shows habit progress when habits exist', () => {
        const html = buildDigestHtml({
            ...baseParams,
            data: {
                ...baseData,
                goodHabitsCount: 3,
                habitsCompletedToday: 2,
                habitsMissedToday: 1,
                weeklyProgressPct: 67,
            },
        });
        expect(html).toContain('2 completed');
        expect(html).toContain('1 remaining');
        expect(html).toContain('67%');
    });

    test('hides habit section when no habits', () => {
        const html = buildDigestHtml(baseParams);
        expect(html).not.toContain('Habit Progress');
    });

    test('shows todo status with overdue, due today, due tomorrow', () => {
        const html = buildDigestHtml({
            ...baseParams,
            data: {
                ...baseData,
                overdueTodos: [{ title: 'Fix bug', dueDate: '2025-01-10' }],
                dueTodayTodos: [{ title: 'Write tests' }],
                dueTomorrowTodos: [{ title: 'Deploy' }],
            },
        });
        expect(html).toContain('Overdue (1)');
        expect(html).toContain('Fix bug');
        expect(html).toContain('Due Today (1)');
        expect(html).toContain('Write tests');
        expect(html).toContain('Due Tomorrow (1)');
        expect(html).toContain('Deploy');
    });

    test('hides todo section when no relevant todos', () => {
        const html = buildDigestHtml(baseParams);
        expect(html).not.toContain('TODO Status');
    });

    test('shows weekly review on Sunday', () => {
        const html = buildDigestHtml({
            ...baseParams,
            isSunday: true,
            data: {
                ...baseData,
                habitWeeklyReview: [
                    { name: 'Exercise', color: '#667eea', completions: 5, target: 7, pct: 71 },
                    { name: 'Read', color: '#16a34a', completions: 7, target: 7, pct: 100 },
                ],
            },
        });
        expect(html).toContain('Weekly Review');
        expect(html).toContain('Exercise');
        expect(html).toContain('5/7');
        expect(html).toContain('71%');
        expect(html).toContain('Read');
        expect(html).toContain('100%');
    });

    test('hides weekly review on non-Sunday', () => {
        const html = buildDigestHtml({
            ...baseParams,
            isSunday: false,
            data: {
                ...baseData,
                habitWeeklyReview: [
                    { name: 'Exercise', color: '#667eea', completions: 5, target: 7, pct: 71 },
                ],
            },
        });
        expect(html).not.toContain('Weekly Review');
    });

    test('escapes HTML in user content', () => {
        const html = buildDigestHtml({
            ...baseParams,
            firstName: '<script>alert("xss")</script>',
            data: {
                ...baseData,
                todayEvents: [
                    { title: '<img src=x onerror=alert(1)>', startTime: '09:00' },
                ],
            },
        });
        expect(html).not.toContain('<script>');
        expect(html).not.toContain('<img src=x');
        expect(html).toContain('&lt;script&gt;');
    });

    test('truncates todo list to 5 items with +N more', () => {
        const todos = Array.from({ length: 8 }, (_, i) => ({ title: `Todo ${i + 1}` }));
        const html = buildDigestHtml({
            ...baseParams,
            data: { ...baseData, overdueTodos: todos },
        });
        expect(html).toContain('Todo 1');
        expect(html).toContain('Todo 5');
        expect(html).not.toContain('Todo 6');
        expect(html).toContain('+3 more');
    });
});
