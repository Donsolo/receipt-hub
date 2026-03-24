const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

export function rateLimit(ip: string, limit = 20, windowMs = 15 * 60 * 1000) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Garbage collection on mapped entries
    for (const [key, value] of rateLimitMap.entries()) {
        if (value.timestamp < windowStart) {
            rateLimitMap.delete(key);
        }
    }

    const currentReqs = rateLimitMap.get(ip) || { count: 0, timestamp: now };
    
    if (currentReqs.timestamp < windowStart) {
        currentReqs.count = 1;
        currentReqs.timestamp = now;
    } else {
        currentReqs.count++;
    }

    rateLimitMap.set(ip, currentReqs);
    return currentReqs.count > limit;
}
