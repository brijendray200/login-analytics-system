import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export async function sendOTPEmail(email, otp, deviceInfo) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '🔐 Your Login OTP Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Login Verification</h2>
        <p>Your OTP code is:</p>
        <h1 style="background: #f0f0f0; padding: 20px; text-align: center; letter-spacing: 5px;">${otp}</h1>
        <p><strong>Valid for 5 minutes</strong></p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          Login attempt from:<br>
          Browser: ${deviceInfo.browser}<br>
          OS: ${deviceInfo.os}<br>
          Device: ${deviceInfo.deviceType}
        </p>
        <p style="color: #999; font-size: 11px;">If you didn't request this, please ignore this email.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

export async function sendLoginAlert(email, deviceInfo, ipAddress) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '🔔 New Login Detected',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Successful Login</h2>
        <p>A new login was detected on your account.</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>IP Address:</strong> ${ipAddress}</p>
          <p><strong>Browser:</strong> ${deviceInfo.browser}</p>
          <p><strong>OS:</strong> ${deviceInfo.os}</p>
          <p><strong>Device:</strong> ${deviceInfo.deviceType}</p>
        </div>
        <p style="color: #dc3545; margin-top: 20px;">If this wasn't you, please secure your account immediately.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

export async function sendEmailVerification(email, token) {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email.html?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '✅ Verify Your Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Welcome to Login Tracker!</h2>
        <p>Please verify your email address to complete your registration.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          Or copy and paste this link in your browser:<br>
          <a href="${verificationUrl}">${verificationUrl}</a>
        </p>
        <p style="color: #999; font-size: 11px;">This link will expire in 24 hours.</p>
        <p style="color: #999; font-size: 11px;">If you didn't create an account, please ignore this email.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

export async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password.html?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '🔑 Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Password Reset</h2>
        <p>You requested to reset your password. Click the button below to proceed:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          Or copy and paste this link in your browser:<br>
          <a href="${resetUrl}">${resetUrl}</a>
        </p>
        <p style="color: #999; font-size: 11px;">This link will expire in 1 hour.</p>
        <p style="color: #dc3545; font-size: 11px;"><strong>If you didn't request this, please ignore this email and your password will remain unchanged.</strong></p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}
