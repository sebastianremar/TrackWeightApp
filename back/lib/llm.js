const logger = require('./logger');

let openaiClient = null;

function getClient() {
    if (openaiClient) return openaiClient;
    if (!process.env.OPENAI_API_KEY) return null;

    const { default: OpenAI } = require('openai');
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openaiClient;
}

function formatDataForPrompt(data) {
    const lines = [];

    if (data.habitsCompletedToday !== undefined) {
        lines.push(`Habits completed today: ${data.habitsCompletedToday}`);
    }
    if (data.habitsMissedToday !== undefined) {
        lines.push(`Habits remaining today: ${data.habitsMissedToday}`);
    }
    if (data.weeklyProgressPct !== undefined) {
        lines.push(`Weekly habit progress: ${data.weeklyProgressPct}%`);
    }
    if (data.todayEvents && data.todayEvents.length > 0) {
        lines.push(`Today's events: ${data.todayEvents.length}`);
    }
    if (data.tomorrowEvents && data.tomorrowEvents.length > 0) {
        lines.push(`Tomorrow's events: ${data.tomorrowEvents.length}`);
    }
    if (data.overdueTodos && data.overdueTodos.length > 0) {
        lines.push(`Overdue todos: ${data.overdueTodos.length}`);
    }
    if (data.dueTodayTodos && data.dueTodayTodos.length > 0) {
        lines.push(`Todos due today: ${data.dueTodayTodos.length}`);
    }
    if (data.habitWeeklyReview && data.habitWeeklyReview.length > 0) {
        const summary = data.habitWeeklyReview
            .map((h) => `${h.name}: ${h.completions}/${h.target} (${h.pct}%)`)
            .join(', ');
        lines.push(`Weekly habit review: ${summary}`);
    }

    return lines.join('\n');
}

async function generateDigestInsight(data) {
    const client = getClient();
    if (!client) return null;

    const userContext = formatDataForPrompt(data);
    if (!userContext) return null;

    try {
        const response = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 200,
            temperature: 0.7,
            messages: [
                {
                    role: 'system',
                    content:
                        'You are a supportive wellness coach. Write 2-3 sentences of personalized, actionable insight based on the user\'s daily data. Reference their actual numbers. Be encouraging but honest. No emojis. Keep it concise.',
                },
                {
                    role: 'user',
                    content: userContext,
                },
            ],
        });

        const text = response.choices?.[0]?.message?.content?.trim();
        return text || null;
    } catch (err) {
        logger.warn({ err: err.message }, 'LLM digest insight generation failed');
        return null;
    }
}

module.exports = { generateDigestInsight };
