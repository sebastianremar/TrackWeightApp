// Set env vars BEFORE any app code loads
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
process.env.USERS_TABLE = 'TestPesos';
process.env.WEIGHT_TABLE = 'TestWeightEntries';
process.env.HABITS_TABLE = 'TestHabits';
process.env.HABIT_ENTRIES_TABLE = 'TestHabitEntries';
process.env.FRIENDSHIPS_TABLE = 'TestFriendships';
process.env.NODE_ENV = 'production';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.LOG_LEVEL = 'silent';
process.env.AWS_REGION = 'us-east-1';
