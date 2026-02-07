const buckets = new Map();

// Clean up expired entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
        bucket.hits = bucket.hits.filter(t => now - t < bucket.windowMs);
        if (bucket.hits.length === 0) buckets.delete(key);
    }
}, 10 * 60 * 1000);

function rateLimit({ maxHits, windowMs }) {
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const key = ip + ':' + req.path;
        const now = Date.now();

        if (!buckets.has(key)) {
            buckets.set(key, { hits: [], windowMs });
        }

        const bucket = buckets.get(key);
        bucket.hits = bucket.hits.filter(t => now - t < windowMs);

        if (bucket.hits.length >= maxHits) {
            const retryAfter = Math.ceil((bucket.hits[0] + windowMs - now) / 1000);
            res.set('Retry-After', String(retryAfter));
            return res.status(429).json({ error: 'Too many requests. Try again later.' });
        }

        bucket.hits.push(now);
        next();
    };
}

module.exports = rateLimit;
