import User from '../models/User.js';

export async function getAnalytics(req, res) {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const loginHistory = user.loginHistory;
    const now = new Date();
    
    // Last 7 days analytics
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentLogins = loginHistory.filter(l => new Date(l.timestamp) > sevenDaysAgo);
    
    // Browser stats
    const browserStats = {};
    loginHistory.forEach(login => {
      browserStats[login.browser] = (browserStats[login.browser] || 0) + 1;
    });
    
    // Device stats
    const deviceStats = {};
    loginHistory.forEach(login => {
      deviceStats[login.deviceType] = (deviceStats[login.deviceType] || 0) + 1;
    });
    
    // OS stats
    const osStats = {};
    loginHistory.forEach(login => {
      osStats[login.os] = (osStats[login.os] || 0) + 1;
    });
    
    // Daily login count (last 7 days)
    const dailyLogins = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyLogins[dateStr] = 0;
    }
    
    recentLogins.forEach(login => {
      const dateStr = new Date(login.timestamp).toISOString().split('T')[0];
      if (dailyLogins[dateStr] !== undefined) {
        dailyLogins[dateStr]++;
      }
    });
    
    // Success rate
    const totalLogins = loginHistory.length;
    const successfulLogins = loginHistory.filter(l => l.success).length;
    const successRate = totalLogins > 0 ? ((successfulLogins / totalLogins) * 100).toFixed(2) : 0;
    
    // Most used IP
    const ipStats = {};
    loginHistory.forEach(login => {
      ipStats[login.ipAddress] = (ipStats[login.ipAddress] || 0) + 1;
    });
    const mostUsedIP = Object.entries(ipStats).sort((a, b) => b[1] - a[1])[0];
    
    // Recent logins with full details
    const recentLoginsDetailed = loginHistory
      .slice(-50)
      .reverse()
      .map(login => ({
        timestamp: login.timestamp,
        browser: login.browser,
        os: login.os,
        deviceType: login.deviceType,
        ipAddress: login.ipAddress,
        success: login.success,
        failureReason: login.failureReason
      }));
    
    res.json({
      totalLogins,
      successfulLogins,
      failedLogins: totalLogins - successfulLogins,
      successRate: `${successRate}%`,
      last7Days: recentLogins.length,
      browserStats,
      deviceStats,
      osStats,
      dailyLogins,
      ipStats,
      mostUsedIP: mostUsedIP ? { ip: mostUsedIP[0], count: mostUsedIP[1] } : null,
      lastLogin: loginHistory[loginHistory.length - 1],
      recentLogins: recentLoginsDetailed
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}
