import UAParser from 'ua-parser-js';
import crypto from 'crypto';

export function parseUserAgent(req) {
  const parser = new UAParser(req.headers['user-agent']);
  const result = parser.getResult();
  
  return {
    browser: result.browser.name || 'Unknown',
    browserVersion: result.browser.version || 'Unknown',
    os: result.os.name || 'Unknown',
    osVersion: result.os.version || 'Unknown',
    device: result.device.model || result.device.vendor || 'Unknown',
    deviceType: result.device.type || 'desktop'
  };
}

export function checkTimeRestriction(deviceType) {
  if (deviceType === 'mobile') {
    const now = new Date();
    // IST timezone (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    const hour = istTime.getUTCHours();
    
    return hour >= 10 && hour < 13; // 10 AM to 1 PM IST
  }
  return true;
}

export function requiresOTP(browser) {
  const browserLower = browser.toLowerCase();
  // Chrome requires OTP, but not Edge (which also contains 'chrome' in user agent)
  return browserLower.includes('chrome') && !browserLower.includes('edge');
}

export function generateOTP() {
  // Use cryptographically secure random number generation
  const buffer = crypto.randomBytes(3);
  const otp = parseInt(buffer.toString('hex'), 16) % 900000 + 100000;
  return otp.toString();
}
