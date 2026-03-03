const rateLimits = new Map();

export const rateLimiter = (limit = 100, windowMs = 60000) => {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    
    if (!rateLimits.has(ip)) {
      rateLimits.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    const entry = rateLimits.get(ip);
    if (now > entry.resetAt) {
      entry.count = 1;
      entry.resetAt = now + windowMs;
      return next();
    }

    entry.count++;
    if (entry.count > limit) {
      return res.status(429).json({ error: 'Too many requests, please try again later.' });
    }

    next();
  };
};
