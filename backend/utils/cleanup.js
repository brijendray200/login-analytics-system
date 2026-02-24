import User from '../models/User.js';

// Clean expired OTPs
export async function cleanupExpiredOTPs() {
  try {
    const result = await User.updateMany(
      { otpExpiry: { $lt: new Date() } },
      { 
        $unset: { otpCode: '', otpExpiry: '' },
        $set: { otpAttempts: 0 }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`🧹 Cleaned ${result.modifiedCount} expired OTPs`);
    }
  } catch (error) {
    console.error('OTP cleanup error:', error);
  }
}

// Clean old login history (keep last 100 per user)
export async function cleanupOldLoginHistory() {
  try {
    const users = await User.find();
    let cleaned = 0;
    
    for (const user of users) {
      if (user.loginHistory.length > 100) {
        user.loginHistory = user.loginHistory.slice(-100);
        await user.save();
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned login history for ${cleaned} users`);
    }
  } catch (error) {
    console.error('Login history cleanup error:', error);
  }
}

// Run cleanup tasks
export function startCleanupTasks() {
  // Run every hour
  setInterval(cleanupExpiredOTPs, 60 * 60 * 1000);
  
  // Run daily at 2 AM
  const now = new Date();
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    2, 0, 0
  );
  const msToMidnight = night.getTime() - now.getTime();
  
  setTimeout(() => {
    cleanupOldLoginHistory();
    setInterval(cleanupOldLoginHistory, 24 * 60 * 60 * 1000);
  }, msToMidnight);
  
  console.log('✅ Cleanup tasks scheduled');
}
