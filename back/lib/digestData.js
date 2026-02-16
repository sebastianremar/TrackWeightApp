const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('./db');

/**
 * Gather all data needed for one user's daily digest email.
 * Returns a structured object consumed by digestTemplate.buildDigestHtml().
 */
async function gatherDigestData(email, todayStr, tomorrowStr, weekStartStr) {
    const [
        calendarToday,
        calendarTomorrow,
        habits,
        habitEntries,
        todos,
    ] = await Promise.all([
        // Calendar events for today
        docClient.send(new QueryCommand({
            TableName: process.env.CALENDAR_EVENTS_TABLE,
            IndexName: 'EventsByDate',
            KeyConditionExpression: 'email = :email AND #d = :date',
            ExpressionAttributeNames: { '#d': 'date' },
            ExpressionAttributeValues: { ':email': email, ':date': todayStr },
        })),
        // Calendar events for tomorrow
        docClient.send(new QueryCommand({
            TableName: process.env.CALENDAR_EVENTS_TABLE,
            IndexName: 'EventsByDate',
            KeyConditionExpression: 'email = :email AND #d = :date',
            ExpressionAttributeNames: { '#d': 'date' },
            ExpressionAttributeValues: { ':email': email, ':date': tomorrowStr },
        })),
        // Active habits (not archived)
        docClient.send(new QueryCommand({
            TableName: process.env.HABITS_TABLE,
            KeyConditionExpression: 'email = :email',
            FilterExpression: 'archived <> :true',
            ExpressionAttributeValues: { ':email': email, ':true': true },
        })),
        // Habit entries for the week range (weekStart through today)
        docClient.send(new QueryCommand({
            TableName: process.env.HABIT_ENTRIES_TABLE,
            IndexName: 'HabitEntriesByUser',
            KeyConditionExpression: 'email = :email AND #d BETWEEN :from AND :to',
            ExpressionAttributeNames: { '#d': 'date' },
            ExpressionAttributeValues: { ':email': email, ':from': weekStartStr, ':to': todayStr },
        })),
        // Incomplete todos
        docClient.send(new QueryCommand({
            TableName: process.env.TODOS_TABLE,
            KeyConditionExpression: 'email = :email',
            FilterExpression: 'completed <> :true',
            ExpressionAttributeValues: { ':email': email, ':true': true },
        })),
    ]);

    // Sort calendar events by startTime
    const sortByTime = (a, b) => (a.startTime || '').localeCompare(b.startTime || '');
    const todayEvents = (calendarToday.Items || []).sort(sortByTime);
    const tomorrowEvents = (calendarTomorrow.Items || []).sort(sortByTime);

    // Process habits
    const goodHabits = (habits.Items || []).filter((h) => h.type !== 'bad');
    const todayEntries = (habitEntries.Items || []).filter((e) => e.date === todayStr && e.completed);
    const weekEntries = (habitEntries.Items || []).filter((e) => e.completed);

    // Count completions for good habits only
    const completedTodayIds = new Set(todayEntries.map((e) => e.habitId));
    const habitsCompletedToday = goodHabits.filter((h) => completedTodayIds.has(h.habitId)).length;
    const habitsMissedToday = goodHabits.length - habitsCompletedToday;

    // Weekly progress: total completions / (habits * days so far in week)
    const todayDate = new Date(todayStr + 'T00:00:00Z');
    const weekStartDate = new Date(weekStartStr + 'T00:00:00Z');
    const daysInWeekSoFar = Math.floor((todayDate - weekStartDate) / (24 * 60 * 60 * 1000)) + 1;
    const maxPossible = goodHabits.length * daysInWeekSoFar;
    const weeklyGoodCompletions = weekEntries.filter((e) =>
        goodHabits.some((h) => h.habitId === e.habitId),
    ).length;
    const weeklyProgressPct = maxPossible > 0
        ? Math.round((weeklyGoodCompletions / maxPossible) * 100)
        : 0;

    // Process todos
    const allTodos = todos.Items || [];
    const overdueTodos = allTodos.filter((t) => t.dueDate && t.dueDate < todayStr);
    const dueTodayTodos = allTodos.filter((t) => t.dueDate === todayStr);
    const dueTomorrowTodos = allTodos.filter((t) => t.dueDate === tomorrowStr);

    // Weekly habit review (per-habit completion rates for Sunday digests)
    const habitWeeklyReview = goodHabits.map((h) => {
        const completions = weekEntries.filter((e) => e.habitId === h.habitId).length;
        return {
            name: h.name,
            color: h.color,
            completions,
            target: h.targetFrequency,
            pct: h.targetFrequency > 0
                ? Math.round((completions / h.targetFrequency) * 100)
                : 0,
        };
    });

    return {
        todayEvents,
        tomorrowEvents,
        goodHabitsCount: goodHabits.length,
        habitsCompletedToday,
        habitsMissedToday,
        weeklyProgressPct,
        overdueTodos,
        dueTodayTodos,
        dueTomorrowTodos,
        habitWeeklyReview,
    };
}

module.exports = { gatherDigestData };
