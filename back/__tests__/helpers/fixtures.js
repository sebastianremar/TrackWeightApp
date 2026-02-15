const testUser = {
    email: 'test@example.com',
    name: 'Test User',
    password: '$2b$10$hashedpasswordplaceholdervalue1234567890abc', // fake bcrypt hash
    darkMode: false,
    palette: 'ethereal-ivory',
    createdAt: '2024-01-01T00:00:00.000Z',
};

const friendUser = {
    email: 'friend@example.com',
    name: 'Friend User',
    password: '$2b$10$hashedpasswordplaceholdervalue1234567890xyz',
    darkMode: false,
    createdAt: '2024-01-02T00:00:00.000Z',
};

const weightEntry = {
    email: testUser.email,
    date: '2024-06-15',
    weight: 150.5,
    createdAt: '2024-06-15T12:00:00.000Z',
};

const habit = {
    email: testUser.email,
    habitId: 'habit#test123',
    name: 'Exercise',
    targetFrequency: 3,
    color: '#667eea',
    archived: false,
    createdAt: '2024-01-01T00:00:00.000Z',
};

const habitEntry = {
    emailHabitId: testUser.email + '#habit#test123',
    date: '2024-06-15',
    email: testUser.email,
    habitId: 'habit#test123',
    completed: true,
    note: '',
    createdAt: '2024-06-15T12:00:00.000Z',
};

const calendarEvent = {
    email: testUser.email,
    eventId: 'event#test123',
    title: 'Team Meeting',
    date: '2024-06-15',
    startTime: '09:00',
    endTime: '10:00',
    category: 'Work',
    color: '#2563EB',
    createdAt: '2024-06-15T08:00:00.000Z',
};

module.exports = { testUser, friendUser, weightEntry, habit, habitEntry, calendarEvent };
