import dotenv from 'dotenv';
dotenv.config();

console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS length:', process.env.EMAIL_PASS?.length);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS);

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

try {
  await transporter.verify();
  console.log('✅ Email config is WORKING!');
} catch (error) {
  console.log('❌ Email error:', error.message);
}
