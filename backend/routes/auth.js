import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import { parseUserAgent, checkTimeRestriction, requiresOTP, generateOTP } from '../middleware/auth.js';
import { sendOTPEmail, sendLoginAlert, sendPasswordResetEmail, sendEmailVerification } from '../config/email.js';
import { validateEmail, validatePassword, validateOTP, sanitizeInput } from '../middleware/validation.js';
import { rateLimitLogin, rateLimitOTP } from '../middleware/rateLimiter.js';
import { authenticateToken, generateToken, generateRefreshToken } from '../middleware/security.js';

const router = express.Router();

// Register with email verification
router.post('/register', rateLimitLogin, async (req, res) => {
  try {
    let { email, password, name } = req.body;
    
    email = sanitizeInput(email);
    name = sanitizeInput(name);
    
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    if (!validatePassword(password)) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters with uppercase, lowercase, and number' 
      });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    const user = new User({
      email,
      password: hashedPassword,
      name: name || 'User',
      emailVerificationToken: verificationToken,
      emailVerificationExpiry: verificationExpiry,
      isEmailVerified: false
    });
    
    await user.save();
    
    // Send verification email
    try {
      await sendEmailVerification(email, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
    }
    
    res.status(201).json({ 
      message: 'Registration successful! Please check your email to verify your account.',
      requiresVerification: true
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Verify email
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpiry: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }
    
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save();
    
    res.json({ message: 'Email verified successfully! You can now login.' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Login
router.post('/login', rateLimitLogin, async (req, res) => {
  try {
    let { email, password } = req.body;
    
    email = sanitizeInput(email);
    const ipAddress = req.ip || req.connection.remoteAddress;
    const deviceInfo = parseUserAgent(req);
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Temporarily disabled for testing
    // if (!user.isEmailVerified) {
    //   return res.status(403).json({ 
    //     error: 'Please verify your email before logging in',
    //     requiresVerification: true
    //   });
    // }
    
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account has been deactivated' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      user.loginHistory.push({
        ipAddress,
        ...deviceInfo,
        success: false,
        failureReason: 'Invalid password'
      });
      await user.save();
      
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check time restriction for mobile devices
    if (!checkTimeRestriction(deviceInfo.deviceType)) {
      user.loginHistory.push({
        ipAddress,
        ...deviceInfo,
        success: false,
        failureReason: 'Login outside allowed time (10 AM - 1 PM IST for mobile)'
      });
      await user.save();
      
      return res.status(403).json({ 
        error: 'Mobile login only allowed between 10 AM - 1 PM IST' 
      });
    }
    
    // Check if OTP is required
    if (requiresOTP(deviceInfo.browser)) {
      const otp = generateOTP();
      user.otpCode = await bcrypt.hash(otp, 10);
      user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
      user.otpAttempts = 0;
      await user.save();
      
      try {
        await sendOTPEmail(email, otp, deviceInfo);
      } catch (emailError) {
        console.error('Failed to send OTP:', emailError);
        return res.status(500).json({ error: 'Failed to send OTP' });
      }
      
      return res.json({ 
        requiresOTP: true,
        message: 'OTP sent to your email',
        maskedEmail: email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
      });
    }
    
    // Direct login (no OTP required)
    user.loginHistory.push({
      ipAddress,
      ...deviceInfo,
      success: true
    });
    user.lastLogin = new Date();
    
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    
    await user.save();
    
    try {
      await sendLoginAlert(email, deviceInfo, ipAddress);
    } catch (emailError) {
      console.error('Failed to send login alert:', emailError);
    }
    
    res.json({
      token,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify OTP
router.post('/verify-otp', rateLimitOTP, async (req, res) => {
  try {
    let { email, otp } = req.body;
    
    email = sanitizeInput(email);
    otp = sanitizeInput(otp);
    
    if (!validateOTP(otp)) {
      return res.status(400).json({ error: 'Invalid OTP format' });
    }
    
    const user = await User.findOne({ email });
    
    if (!user || !user.otpCode || !user.otpExpiry) {
      return res.status(400).json({ error: 'No OTP request found' });
    }
    
    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    }
    
    if (user.otpAttempts >= 3) {
      return res.status(429).json({ error: 'Too many attempts. Please request a new OTP.' });
    }
    
    const isOTPValid = await bcrypt.compare(otp, user.otpCode);
    
    if (!isOTPValid) {
      user.otpAttempts += 1;
      await user.save();
      
      return res.status(401).json({ 
        error: 'Invalid OTP',
        attemptsLeft: 3 - user.otpAttempts
      });
    }
    
    const ipAddress = req.ip || req.connection.remoteAddress;
    const deviceInfo = parseUserAgent(req);
    
    user.loginHistory.push({
      ipAddress,
      ...deviceInfo,
      success: true
    });
    user.lastLogin = new Date();
    user.otpCode = undefined;
    user.otpExpiry = undefined;
    user.otpAttempts = 0;
    
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    
    await user.save();
    
    try {
      await sendLoginAlert(email, deviceInfo, ipAddress);
    } catch (emailError) {
      console.error('Failed to send login alert:', emailError);
    }
    
    res.json({
      token,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Request password reset
router.post('/forgot-password', rateLimitLogin, async (req, res) => {
  try {
    let { email } = req.body;
    email = sanitizeInput(email);
    
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    const user = await User.findOne({ email });
    
    // Don't reveal if user exists
    if (!user) {
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }
    
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();
    
    try {
      await sendPasswordResetEmail(email, resetToken);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      return res.status(500).json({ error: 'Failed to send reset email' });
    }
    
    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

// Reset password
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    let { password } = req.body;
    
    if (!validatePassword(password)) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters with uppercase, lowercase, and number' 
      });
    }
    
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiry: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    user.password = await bcrypt.hash(password, 12);
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    user.refreshToken = undefined; // Invalidate all sessions
    await user.save();
    
    res.json({ message: 'Password reset successful. Please login with your new password.' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Reset failed' });
  }
});

// Refresh token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }
    
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }
    
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    
    user.refreshToken = newRefreshToken;
    await user.save();
    
    res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired refresh token' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user) {
      user.refreshToken = undefined;
      await user.save();
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Logout from all devices
router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user) {
      user.refreshToken = undefined;
      user.sessions = []; // Clear all sessions
      await user.save();
    }
    res.json({ message: 'Logged out from all devices successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;
