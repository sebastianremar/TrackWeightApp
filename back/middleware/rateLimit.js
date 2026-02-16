const buckets = new Map();
const MAX_BUCKETS = 10000;

// Clean up expired entries every 5 minutes
setInterval(
    () => {
        const now = Date.now();
        for (const [key, bucket] of buckets) {
            bucket.hits = bucket.hits.filter((t) => now - t < bucket.windowMs);
            if (bucket.hits.length === 0) buckets.delete(key);
        }
    },
    5 * 60 * 1000,
);

function rateLimit({ maxHits, windowMs }) {
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const key = ip + ':' + req.path;
        const now = Date.now();

        if (!buckets.has(key)) {
            if (buckets.size >= MAX_BUCKETS) {
                // Evict oldest bucket to prevent unbounded growth
                const oldest = buckets.keys().next().value;
                buckets.delete(oldest);
            }
            buckets.set(key, { hits: [], windowMs });
        }

        const bucket = buckets.get(key);
        bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

        if (bucket.hits.length >= maxHits) {
            const retryAfter = Math.ceil((bucket.hits[0] + windowMs - now) / 1000);
            res.set('Retry-After', String(retryAfter));
            return res.status(429).json({ error: 'Too many requests. Try again later.' });
        }

        bucket.hits.push(now);
        next();
    };
}

rateLimit._buckets = buckets;
module.exports = rateLimit;
