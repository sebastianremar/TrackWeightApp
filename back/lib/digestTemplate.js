/**
 * Build inline-CSS HTML email for the daily digest.
 * Pure function: data in, HTML string out.
 */
function buildDigestHtml({ firstName, dateLabel, isSunday, appUrl, unsubscribeUrl, data, aiInsight }) {
    const {
        todayEvents,
        tomorrowEvents,
        goodHabitsCount,
        habitsCompletedToday,
        habitsMissedToday,
        weeklyProgressPct,
        overdueTodos,
        dueTodayTodos,
        dueTomorrowTodos,
        habitWeeklyReview,
    } = data;

    const sections = [];

    // AI-generated Daily Insight
    if (aiInsight) {
        sections.push(`
            <div style="margin-bottom:20px;padding:14px 16px;border-left:4px solid #19747E;background:#f0fafb;border-radius:0 8px 8px 0;">
                <h2 style="margin:0 0 8px;font-size:15px;font-weight:600;color:#19747E;">Daily Insight</h2>
                <p style="margin:0;font-size:14px;color:#1f2937;line-height:1.5;">${esc(aiInsight)}</p>
            </div>
        `);
    }

    // Calendar Recap — Today
    sections.push(calendarSection('Today\'s Calendar', todayEvents, 'No events today.'));

    // Calendar Preview — Tomorrow
    sections.push(calendarSection(
        'Tomorrow\'s Schedule',
        tomorrowEvents,
        'Nothing scheduled tomorrow — a good time to plan ahead!',
    ));

    // Habit Progress
    if (goodHabitsCount > 0) {
        const progressBar = progressBarHtml(weeklyProgressPct);
        sections.push(sectionHtml('Habit Progress', `
            <p style="margin:0 0 6px;">
                <span style="color:#16a34a;font-weight:600;">${habitsCompletedToday} completed</span>
                ${habitsMissedToday > 0 ? ` &middot; <span style="color:#dc2626;">${habitsMissedToday} remaining</span>` : ''}
            </p>
            <p style="margin:0 0 4px;font-size:13px;color:#666;">Weekly progress</p>
            ${progressBar}
        `));
    }

    // TODO Status
    const hasTodos = overdueTodos.length > 0 || dueTodayTodos.length > 0 || dueTomorrowTodos.length > 0;
    if (hasTodos) {
        let todoHtml = '';
        if (overdueTodos.length > 0) {
            todoHtml += todoList('Overdue', overdueTodos, '#dc2626');
        }
        if (dueTodayTodos.length > 0) {
            todoHtml += todoList('Due Today', dueTodayTodos, '#d97706');
        }
        if (dueTomorrowTodos.length > 0) {
            todoHtml += todoList('Due Tomorrow', dueTomorrowTodos, '#2563eb');
        }
        sections.push(sectionHtml('TODO Status', todoHtml));
    }

    // Weekly Review (Sunday only)
    if (isSunday && habitWeeklyReview.length > 0) {
        const rows = habitWeeklyReview.map((h) => `
            <tr>
                <td style="padding:6px 10px;border-bottom:1px solid #eee;">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${escapeAttr(h.color)};margin-right:6px;vertical-align:middle;"></span>
                    ${esc(h.name)}
                </td>
                <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">${h.completions}/${h.target}</td>
                <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;font-weight:600;color:${h.pct >= 80 ? '#16a34a' : h.pct >= 50 ? '#d97706' : '#dc2626'};">${h.pct}%</td>
            </tr>
        `).join('');

        sections.push(sectionHtml('Weekly Review', `
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <thead>
                    <tr style="background:#f9fafb;">
                        <th style="padding:8px 10px;text-align:left;font-weight:600;border-bottom:2px solid #e5e7eb;">Habit</th>
                        <th style="padding:8px 10px;text-align:center;font-weight:600;border-bottom:2px solid #e5e7eb;">Done</th>
                        <th style="padding:8px 10px;text-align:center;font-weight:600;border-bottom:2px solid #e5e7eb;">Rate</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `));
    }

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:20px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:100%;">
    <!-- Header -->
    <tr>
        <td style="background:#19747E;padding:24px 30px;">
            <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600;">Good evening, ${esc(firstName)}</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${esc(dateLabel)}</p>
        </td>
    </tr>
    <!-- Body -->
    <tr>
        <td style="padding:24px 30px;">
            ${sections.join('')}
        </td>
    </tr>
    <!-- Footer -->
    <tr>
        <td style="padding:20px 30px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">
                <a href="${escapeAttr(appUrl)}" style="color:#19747E;text-decoration:none;">Open Sara Peso</a>
            </p>
            <p style="margin:0;font-size:12px;color:#9ca3af;">
                <a href="${escapeAttr(unsubscribeUrl)}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe from daily digest</a>
            </p>
        </td>
    </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// --- Helpers ---

function esc(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
    return esc(str).replace(/'/g, '&#39;');
}

function sectionHtml(title, content) {
    return `
        <div style="margin-bottom:20px;">
            <h2 style="margin:0 0 10px;font-size:16px;font-weight:600;color:#1f2937;">${esc(title)}</h2>
            ${content}
        </div>
    `;
}

function calendarSection(title, events, emptyMsg) {
    if (!events || events.length === 0) {
        return sectionHtml(title, `<p style="margin:0;color:#6b7280;font-size:14px;">${esc(emptyMsg)}</p>`);
    }
    const items = events.map((e) => `
        <div style="padding:8px 12px;margin-bottom:6px;background:#f9fafb;border-radius:6px;border-left:3px solid ${escapeAttr(e.color || '#19747E')};">
            <strong style="font-size:14px;">${esc(e.title)}</strong>
            <span style="font-size:13px;color:#6b7280;margin-left:8px;">${esc(e.startTime)}${e.endTime ? ' - ' + esc(e.endTime) : ''}</span>
        </div>
    `).join('');
    return sectionHtml(title, items);
}

function todoList(label, todos, color) {
    const items = todos.slice(0, 5).map((t) => `
        <li style="margin-bottom:4px;font-size:14px;">
            ${esc(t.title)}${t.dueDate ? ` <span style="color:#9ca3af;font-size:12px;">(${esc(t.dueDate)})</span>` : ''}
        </li>
    `).join('');
    const extra = todos.length > 5 ? `<li style="color:#9ca3af;font-size:13px;">+${todos.length - 5} more</li>` : '';
    return `
        <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:${escapeAttr(color)};">${esc(label)} (${todos.length})</p>
        <ul style="margin:0 0 10px;padding-left:20px;">${items}${extra}</ul>
    `;
}

function progressBarHtml(pct) {
    const clamped = Math.max(0, Math.min(100, pct));
    const color = clamped >= 80 ? '#16a34a' : clamped >= 50 ? '#d97706' : '#dc2626';
    return `
        <div style="background:#e5e7eb;border-radius:4px;height:8px;overflow:hidden;">
            <div style="background:${color};height:100%;width:${clamped}%;border-radius:4px;"></div>
        </div>
        <p style="margin:2px 0 0;font-size:12px;color:#6b7280;text-align:right;">${clamped}%</p>
    `;
}

module.exports = { buildDigestHtml };
