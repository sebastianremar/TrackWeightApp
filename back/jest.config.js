module.exports = {
    testEnvironment: 'node',
    maxWorkers: 1,
    forceExit: true,
    setupFiles: ['./__tests__/setup.js'],
    testMatch: ['**/__tests__/**/*.test.js'],
};
