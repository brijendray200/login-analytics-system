import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/security.js';
import { validatePassword, sanitizeInput } from '../middleware/validation.js';
import { getAnalytics } from '../middleware/analytics.js';

const router = express.Router();

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('-password -otpCode -otpExpiry -refreshToken -emailVerificationToken -passwordResetToken')
      .lean();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update profile
router.patch('/profile', authenticateToken, async (req, res) => {
  try {
    let { name, loginNotifications } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (name !== undefined) {
      user.name = sanitizeInput(name);
    }
    
    if (loginNotifications !== undefined) {
      user.loginNotifications = Boolean(loginNotifications);
    }
    
    await user.save();
    
    res.json({ 
      message: 'Profile updated successfully',
      user: {
        name: user.name,
        loginNotifications: user.loginNotifications
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!validatePassword(newPassword)) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters with uppercase, lowercase, and number' 
      });
    }
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    user.password = await bcrypt.hash(newPassword, 12);
    user.refreshToken = undefined; // Invalidate all sessions
    await user.save();
    
    res.json({ message: 'Password changed successfully. Please login again.' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get login history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    const user = await User.findById(req.userId).select('loginHistory').lean();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const history = user.loginHistory
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice((page - 1) * limit, page * limit);
    
    res.json({ 
      history,
      pagination: {
        total: user.loginHistory.length,
        page,
        pages: Math.ceil(user.loginHistory.length / limit),
        limit
      }
    });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Get analytics
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('loginHistory').lean();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const loginHistory = user.loginHistory || [];
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
    console.error('Analytics fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Add trusted IP
router.post('/trusted-ip', authenticateToken, async (req, res) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({ error: 'IP address required' });
    }
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if IP already trusted
    const exists = user.trustedIPs.some(trusted => trusted.ip === ip);
    if (exists) {
      return res.status(400).json({ error: 'IP already trusted' });
    }
    
    user.trustedIPs.push({ ip });
    await user.save();
    
    res.json({ message: 'IP added to trusted list', trustedIPs: user.trustedIPs });
  } catch (error) {
    console.error('Add trusted IP error:', error);
    res.status(500).json({ error: 'Failed to add trusted IP' });
  }
});

// Remove trusted IP
router.delete('/trusted-ip/:ip', authenticateToken, async (req, res) => {
  try {
    const { ip } = req.params;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.trustedIPs = user.trustedIPs.filter(trusted => trusted.ip !== ip);
    await user.save();
    
    res.json({ message: 'IP removed from trusted list', trustedIPs: user.trustedIPs });
  } catch (error) {
    console.error('Remove trusted IP error:', error);
    res.status(500).json({ error: 'Failed to remove trusted IP' });
  }
});

// Deactivate account
router.post('/deactivate', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Password is incorrect' });
    }
    
    user.isActive = false;
    user.refreshToken = undefined;
    await user.save();
    
    res.json({ message: 'Account deactivated successfully' });
  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({ error: 'Failed to deactivate account' });
  }
});

// Export login history
router.get('/export-history', authenticateToken, async (req, res) => {
  try {
    const format = req.query.format || 'json';
    
    const user = await User.findById(req.userId).select('loginHistory email name').lean();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (format === 'csv') {
      const csv = [
        'Timestamp,Status,IP Address,Browser,OS,Device,Device Type,Failure Reason',
        ...user.loginHistory.map(h => 
          `${h.timestamp},${h.success ? 'Success' : 'Failed'},${h.ipAddress},${h.browser},${h.os},${h.device},${h.deviceType},${h.failureReason || ''}`
        )
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="login-history-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      res.json({ 
        user: { email: user.email, name: user.name },
        history: user.loginHistory,
        exportedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Export history error:', error);
    res.status(500).json({ error: 'Failed to export history' });
  }
});

export default router;
