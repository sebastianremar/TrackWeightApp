module.exports = {
    apps: [
        {
            name: 'sara-peso',
            script: './server.js',
            instances: 'max',
            exec_mode: 'cluster',
            env: {
                NODE_ENV: 'production',
            },
            // Logging
            error_file: './logs/err.log',
            out_file: './logs/out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            // Stability
            max_memory_restart: '300M',
            max_restarts: 10,
            min_uptime: '10s',
            // Graceful shutdown
            kill_timeout: 10000,
            listen_timeout: 5000,
        },
        {
            name: 'sara-peso-digest',
            script: './scripts/daily-digest.js',
            instances: 1,
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'production',
            },
            error_file: './logs/digest-err.log',
            out_file: './logs/digest-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            max_memory_restart: '150M',
            max_restarts: 10,
            min_uptime: '10s',
            kill_timeout: 5000,
        },
    ],
};
