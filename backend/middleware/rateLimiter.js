const loginAttempts = new Map();
const otpAttempts = new Map();

export function rateLimitLogin(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const key = `login_${ip}`;
  const now = Date.now();
  
  if (!loginAttempts.has(key)) {
    loginAttempts.set(key, []);
  }
  
  const attempts = loginAttempts.get(key).filter(time => now - time < 15 * 60 * 1000);
  
  if (attempts.length >= 5) {
    return res.status(429).json({ 
      error: 'Too many login attempts. Please try again after 15 minutes.' 
    });
  }
  
  attempts.push(now);
  loginAttempts.set(key, attempts);
  next();
}

export function rateLimitOTP(req, res, next) {
  const { email } = req.body;
  const key = `otp_${email}`;
  const now = Date.now();
  
  if (!otpAttempts.has(key)) {
    otpAttempts.set(key, []);
  }
  
  const attempts = otpAttempts.get(key).filter(time => now - time < 5 * 60 * 1000);
  
  if (attempts.length >= 3) {
    return res.status(429).json({ 
      error: 'Too many OTP attempts. Please request a new OTP.' 
    });
  }
  
  attempts.push(now);
  otpAttempts.set(key, attempts);
  next();
}

// Cleanup old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, attempts] of loginAttempts.entries()) {
    const filtered = attempts.filter(time => now - time < 15 * 60 * 1000);
    if (filtered.length === 0) {
      loginAttempts.delete(key);
    } else {
      loginAttempts.set(key, filtered);
    }
  }
  for (const [key, attempts] of otpAttempts.entries()) {
    const filtered = attempts.filter(time => now - time < 5 * 60 * 1000);
    if (filtered.length === 0) {
      otpAttempts.delete(key);
    } else {
      otpAttempts.set(key, filtered);
    }
  }
}, 60 * 60 * 1000);
