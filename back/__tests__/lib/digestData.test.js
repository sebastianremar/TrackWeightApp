const { gatherDigestData } = require('../../lib/digestData');
const { ddbMock } = require('../helpers/dynamoMock');
const { QueryCommand } = require('@aws-sdk/lib-dynamodb');

beforeEach(() => {
    ddbMock.reset();
});

const email = 'test@example.com';
const todayStr = '2025-01-15';
const tomorrowStr = '2025-01-16';
const weekStartStr = '2025-01-13'; // Monday

describe('gatherDigestData', () => {
    test('returns structured data with empty results', async () => {
        // All 5 queries return empty
        ddbMock.on(QueryCommand).resolves({ Items: [] });

        const result = await gatherDigestData(email, todayStr, tomorrowStr, weekStartStr);

        expect(result.todayEvents).toEqual([]);
        expect(result.tomorrowEvents).toEqual([]);
        expect(result.goodHabitsCount).toBe(0);
        expect(result.habitsCompletedToday).toBe(0);
        expect(result.habitsMissedToday).toBe(0);
        expect(result.weeklyProgressPct).toBe(0);
        expect(result.overdueTodos).toEqual([]);
        expect(result.dueTodayTodos).toEqual([]);
        expect(result.dueTomorrowTodos).toEqual([]);
        expect(result.habitWeeklyReview).toEqual([]);
    });

    test('sorts calendar events by startTime', async () => {
        const callResults = [
            // Today's events (unsorted)
            { Items: [
                { title: 'Lunch', startTime: '12:00', date: todayStr },
                { title: 'Morning', startTime: '08:00', date: todayStr },
            ] },
            // Tomorrow's events
            { Items: [] },
            // Habits
            { Items: [] },
            // Habit entries
            { Items: [] },
            // Todos
            { Items: [] },
        ];

        let callIndex = 0;
        ddbMock.on(QueryCommand).callsFake(() => callResults[callIndex++]);

        const result = await gatherDigestData(email, todayStr, tomorrowStr, weekStartStr);

        expect(result.todayEvents[0].title).toBe('Morning');
        expect(result.todayEvents[1].title).toBe('Lunch');
    });

    test('calculates habit progress correctly', async () => {
        const callResults = [
            // Calendar today
            { Items: [] },
            // Calendar tomorrow
            { Items: [] },
            // Habits (2 good, 1 bad)
            { Items: [
                { habitId: 'h1', type: 'good', name: 'Exercise', targetFrequency: 5, color: '#f00', archived: false },
                { habitId: 'h2', type: 'good', name: 'Read', targetFrequency: 7, color: '#0f0', archived: false },
                { habitId: 'h3', type: 'bad', name: 'Smoking', targetFrequency: 3, color: '#00f', archived: false },
            ] },
            // Habit entries for the week
            { Items: [
                { habitId: 'h1', date: todayStr, completed: true },
                { habitId: 'h2', date: todayStr, completed: true },
                { habitId: 'h1', date: '2025-01-14', completed: true },
                { habitId: 'h3', date: todayStr, completed: true }, // bad habit entry
            ] },
            // Todos
            { Items: [] },
        ];

        let callIndex = 0;
        ddbMock.on(QueryCommand).callsFake(() => callResults[callIndex++]);

        const result = await gatherDigestData(email, todayStr, tomorrowStr, weekStartStr);

        expect(result.goodHabitsCount).toBe(2);
        expect(result.habitsCompletedToday).toBe(2); // h1 and h2
        expect(result.habitsMissedToday).toBe(0);
        // 3 days in week so far (Mon-Wed), 2 good habits, 6 max possible
        // 3 good completions (h1 today, h2 today, h1 yesterday)
        expect(result.weeklyProgressPct).toBe(50); // 3/6 = 50%
    });

    test('categorizes todos by due date', async () => {
        const callResults = [
            { Items: [] },
            { Items: [] },
            { Items: [] },
            { Items: [] },
            // Todos - mix of overdue, today, tomorrow, no date
            { Items: [
                { title: 'Overdue task', dueDate: '2025-01-10', completed: false },
                { title: 'Due today', dueDate: todayStr, completed: false },
                { title: 'Due tomorrow', dueDate: tomorrowStr, completed: false },
                { title: 'No due date', completed: false },
            ] },
        ];

        let callIndex = 0;
        ddbMock.on(QueryCommand).callsFake(() => callResults[callIndex++]);

        const result = await gatherDigestData(email, todayStr, tomorrowStr, weekStartStr);

        expect(result.overdueTodos).toHaveLength(1);
        expect(result.overdueTodos[0].title).toBe('Overdue task');
        expect(result.dueTodayTodos).toHaveLength(1);
        expect(result.dueTodayTodos[0].title).toBe('Due today');
        expect(result.dueTomorrowTodos).toHaveLength(1);
        expect(result.dueTomorrowTodos[0].title).toBe('Due tomorrow');
    });

    test('builds weekly review with per-habit stats', async () => {
        const callResults = [
            { Items: [] },
            { Items: [] },
            // 1 good habit
            { Items: [
                { habitId: 'h1', type: 'good', name: 'Exercise', targetFrequency: 5, color: '#f00', archived: false },
            ] },
            // 3 completions this week
            { Items: [
                { habitId: 'h1', date: '2025-01-13', completed: true },
                { habitId: 'h1', date: '2025-01-14', completed: true },
                { habitId: 'h1', date: todayStr, completed: true },
            ] },
            { Items: [] },
        ];

        let callIndex = 0;
        ddbMock.on(QueryCommand).callsFake(() => callResults[callIndex++]);

        const result = await gatherDigestData(email, todayStr, tomorrowStr, weekStartStr);

        expect(result.habitWeeklyReview).toHaveLength(1);
        expect(result.habitWeeklyReview[0]).toEqual({
            name: 'Exercise',
            color: '#f00',
            completions: 3,
            target: 5,
            pct: 60,
        });
    });
});
