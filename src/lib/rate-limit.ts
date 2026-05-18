const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

export function rateLimit(key: string, limit = 20, windowMs = 15 * 60 * 1000) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Garbage collection on mapped entries
    // (In a real production environment with high traffic, use Redis. For MVP, Map is fine)
    if (rateLimitMap.size > 10000) {
        // Prevent memory leak if map gets too large
        rateLimitMap.clear();
    }

    for (const [k, value] of rateLimitMap.entries()) {
        if (value.timestamp < windowStart) {
            rateLimitMap.delete(k);
        }
    }

    const currentReqs = rateLimitMap.get(key) || { count: 0, timestamp: now };
    
    if (currentReqs.timestamp < windowStart) {
        currentReqs.count = 1;
        currentReqs.timestamp = now;
    } else {
        currentReqs.count++;
    }

    rateLimitMap.set(key, currentReqs);
    return currentReqs.count > limit;
}
