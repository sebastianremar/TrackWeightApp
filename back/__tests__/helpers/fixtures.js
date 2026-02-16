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

const adminUser = {
    email: 'admin@example.com',
    name: 'Admin User',
    password: '$2b$10$hashedpasswordplaceholdervalue1234567890adm',
    darkMode: false,
    isAdmin: true,
    createdAt: '2024-01-01T00:00:00.000Z',
};

const todoItem = {
    email: testUser.email,
    todoId: 'todo#test123',
    title: 'Buy groceries',
    priority: 'medium',
    completed: false,
    createdAt: '2024-06-15T12:00:00.000Z',
};

const workoutRoutine = {
    email: testUser.email,
    routineId: 'routine#test123',
    name: 'Push Pull Legs',
    schedule: {
        '1': {
            label: 'Push Day',
            muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
            exercises: [
                { name: 'Bench Press', muscleGroup: 'Chest', sets: 4, reps: '8-10', restSec: 90 },
            ],
        },
    },
    isActive: true,
    createdAt: '2024-06-15T12:00:00.000Z',
};

const workoutLog = {
    email: testUser.email,
    logId: 'log#test123',
    date: '2024-06-15',
    routineId: 'routine#test123',
    dayLabel: 'Push Day',
    exercises: [
        {
            name: 'Bench Press',
            muscleGroup: 'Chest',
            sets: [
                { weight: 135, reps: 10 },
                { weight: 155, reps: 8 },
            ],
        },
    ],
    durationMin: 65,
    notes: 'Felt strong',
    createdAt: '2024-06-15T12:00:00.000Z',
};

module.exports = { testUser, friendUser, weightEntry, habit, habitEntry, calendarEvent, adminUser, todoItem, workoutRoutine, workoutLog };
