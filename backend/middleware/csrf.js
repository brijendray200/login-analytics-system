import crypto from 'crypto';

const csrfTokens = new Map();

export function generateCSRFToken(req, res, next) {
  const token = crypto.randomBytes(32).toString('hex');
  const sessionId = req.headers['x-session-id'] || crypto.randomBytes(16).toString('hex');
  
  csrfTokens.set(sessionId, {
    token,
    createdAt: Date.now()
  });
  
  res.setHeader('X-CSRF-Token', token);
  res.setHeader('X-Session-Id', sessionId);
  next();
}

export function validateCSRFToken(req, res, next) {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  const token = req.headers['x-csrf-token'];
  const sessionId = req.headers['x-session-id'];
  
  if (!token || !sessionId) {
    return res.status(403).json({ error: 'CSRF token missing' });
  }
  
  const stored = csrfTokens.get(sessionId);
  
  if (!stored || stored.token !== token) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  // Check token age (1 hour)
  if (Date.now() - stored.createdAt > 60 * 60 * 1000) {
    csrfTokens.delete(sessionId);
    return res.status(403).json({ error: 'CSRF token expired' });
  }
  
  next();
}

// Cleanup old tokens every hour
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, data] of csrfTokens.entries()) {
    if (now - data.createdAt > 60 * 60 * 1000) {
      csrfTokens.delete(sessionId);
    }
  }
}, 60 * 60 * 1000);
