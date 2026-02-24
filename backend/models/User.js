import mongoose from 'mongoose';

const loginHistorySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  ipAddress: String,
  browser: String,
  browserVersion: String,
  os: String,
  osVersion: String,
  device: String,
  deviceType: String,
  success: Boolean,
  failureReason: String
});

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true 
  },
  name: {
    type: String,
    default: 'User'
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  loginHistory: [loginHistorySchema],
  otpCode: String,
  otpExpiry: Date,
  otpAttempts: {
    type: Number,
    default: 0
  },
  refreshToken: String,
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpiry: Date,
  passwordResetToken: String,
  passwordResetExpiry: Date,
  loginNotifications: {
    type: Boolean,
    default: true
  },
  trustedIPs: [{
    ip: String,
    addedAt: { type: Date, default: Date.now }
  }],
  sessions: [{
    token: String,
    deviceInfo: Object,
    createdAt: { type: Date, default: Date.now },
    lastUsed: { type: Date, default: Date.now }
  }]
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ passwordResetToken: 1 });

export default mongoose.model('User', userSchema);
