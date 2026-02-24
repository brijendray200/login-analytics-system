# 🔐 Login Tracker System - Production Ready

A comprehensive, secure login tracking and authentication system with advanced features like OTP verification, email notifications, admin panel, and detailed analytics.

## ✨ Features

### 🔒 Security
- **Email Verification** - Users must verify email before login
- **Password Reset** - Secure forgot password flow with email tokens
- **OTP Authentication** - Browser-based OTP (Chrome requires OTP, Edge doesn't)
- **JWT Tokens** - Access tokens (7 days) + Refresh tokens (30 days)
- **Role-Based Access** - User and Admin roles with proper authorization
- **Rate Limiting** - Protection against brute force attacks
- **CSRF Protection** - Token-based CSRF protection
- **Input Validation** - Comprehensive validation and sanitization
- **Secure Password Hashing** - bcrypt with 12 rounds
- **Cryptographically Secure OTP** - Using crypto.randomBytes()

### 👤 User Features
- User registration with email verification
- Login with device detection
- Time-based access control (mobile: 10 AM - 1 PM IST)
- Profile management (name, preferences)
- Password change
- Login history with pagination
- Detailed analytics dashboard
- Data export (JSON/CSV)
- Trusted IP management
- Account deactivation
- Logout from all devices
- Login notification emails

### 👨‍💼 Admin Features
- View all users (paginated)
- System statistics
- User management (activate/deactivate)
- Delete users (with protection)
- Detailed user information
- Admin-only routes with authorization

### 📊 Analytics
- Total logins, success rate, last 7 days
- Daily login chart (line chart)
- Browser distribution (doughnut chart)
- Device type distribution (pie chart)
- OS statistics (bar chart)
- Most used IP detection
- Interactive charts with Chart.js

### 📧 Email Notifications
- OTP verification emails
- Login alert emails
- Email verification emails
- Password reset emails
- Beautiful HTML email templates

## 🏗️ Architecture

### Backend (Node.js + Express)
```
backend/
├── config/
│   ├── database.js       # MongoDB connection
│   └── email.js          # Email configuration & templates
├── middleware/
│   ├── analytics.js      # Analytics data processing
│   ├── auth.js           # Authentication helpers
│   ├── csrf.js           # CSRF protection
│   ├── logger.js         # Request logging
│   ├── rateLimiter.js    # Rate limiting
│   ├── security.js       # JWT & authorization
│   └── validation.js     # Input validation
├── models/
│   └── User.js           # User schema with indexes
├── routes/
│   ├── admin.js          # Admin endpoints
│   ├── auth.js           # Authentication endpoints
│   └── user.js           # User management endpoints
├── utils/
│   └── cleanup.js        # Scheduled cleanup tasks
└── server.js             # Main application
```

### Frontend (HTML/CSS/JavaScript)
```
frontend/
├── index.html            # Landing page
├── login.html            # Login with OTP
├── register.html         # User registration
├── verify-email.html     # Email verification
├── forgot-password.html  # Request password reset
├── reset-password.html   # Reset password
├── dashboard.html        # User dashboard
├── analytics.html        # Analytics dashboard
├── profile.html          # User profile & settings
└── styles.css            # Styling
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- MongoDB installed and running
- Gmail account with app password

### Installation

1. **Clone the repository**
```bash
git clone <your-repo>
cd login-tracker
```

2. **Install dependencies**
```bash
cd backend
npm install
```

3. **Configure environment**
```bash
copy .env.example .env
notepad .env
```

Update these values in `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/login-tracker
JWT_SECRET=<generate-strong-secret-min-32-chars>
REFRESH_TOKEN_SECRET=<generate-another-strong-secret>
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=<gmail-app-password>
FRONTEND_URL=http://localhost:8080
PORT=3000
NODE_ENV=development
```

4. **Start MongoDB**
```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
```

5. **Start the server**
```bash
npm start
```

6. **Open frontend**
```bash
# Option 1: Direct file
# Open frontend/index.html in browser

# Option 2: Local server (recommended)
cd frontend
npx http-server -p 8080
```

7. **Access the application**
- Frontend: http://localhost:8080
- Backend API: http://localhost:3000/api

### Create First Admin User

1. Register a user through the UI
2. Verify email
3. Make user admin in MongoDB:

```javascript
// MongoDB shell or Compass
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

## 📚 API Documentation

### Authentication Endpoints (`/api/auth`)

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe"
}
```

#### Verify Email
```http
GET /api/auth/verify-email/:token
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

#### Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}
```

#### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```http
POST /api/auth/reset-password/:token
Content-Type: application/json

{
  "password": "NewSecurePass123"
}
```

### User Endpoints (`/api/user`)

All require `Authorization: Bearer <token>` header

#### Get Profile
```http
GET /api/user/profile
```

#### Update Profile
```http
PATCH /api/user/profile
Content-Type: application/json

{
  "name": "New Name",
  "loginNotifications": true
}
```

#### Change Password
```http
POST /api/user/change-password
Content-Type: application/json

{
  "currentPassword": "OldPass123",
  "newPassword": "NewPass123"
}
```

#### Get Login History
```http
GET /api/user/history?page=1&limit=50
```

#### Get Analytics
```http
GET /api/user/analytics
```

#### Export History
```http
GET /api/user/export-history?format=csv
```

### Admin Endpoints (`/api/admin`)

Require admin role + `Authorization: Bearer <token>` header

#### Get All Users
```http
GET /api/admin/users?page=1&limit=50
```

#### Get System Stats
```http
GET /api/admin/stats
```

#### Toggle User Active Status
```http
PATCH /api/admin/user/:userId/toggle-active
```

#### Delete User
```http
DELETE /api/admin/user/:userId
```

## 🔧 Configuration

### Gmail App Password Setup

1. Enable 2-Factor Authentication on your Google account
2. Go to Google Account > Security > App Passwords
3. Generate new app password for "Mail"
4. Use the 16-character password in `.env` as `EMAIL_PASS`

### Generate Strong Secrets

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

### MongoDB Indexes

Indexes are automatically created on:
- `email` (unique)
- `role`
- `lastLogin`
- `isActive`
- `emailVerificationToken`
- `passwordResetToken`

## 🛡️ Security Features

### Implemented
✅ Password hashing (bcrypt, 12 rounds)
✅ JWT authentication with refresh tokens
✅ Rate limiting (5 login attempts per 15 min)
✅ Input sanitization and validation
✅ CORS configuration
✅ Helmet.js security headers (HSTS, CSP)
✅ OTP expiry (5 minutes)
✅ Email verification
✅ Password reset with secure tokens
✅ Admin authorization
✅ Cryptographically secure OTP
✅ CSRF protection
✅ Session management
✅ Account deactivation
✅ Failed login tracking

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number

### Rate Limits
- Login: 5 attempts per 15 minutes per IP
- OTP: 3 attempts per 5 minutes per email
- OTP Verification: 3 attempts per OTP request

## 📊 Database Schema

### User Model
```javascript
{
  email: String (unique, required),
  password: String (hashed, required),
  name: String,
  role: String (enum: ['user', 'admin']),
  loginHistory: [{
    timestamp: Date,
    ipAddress: String,
    browser: String,
    os: String,
    device: String,
    deviceType: String,
    success: Boolean,
    failureReason: String
  }],
  isActive: Boolean,
  isEmailVerified: Boolean,
  emailVerificationToken: String,
  emailVerificationExpiry: Date,
  passwordResetToken: String,
  passwordResetExpiry: Date,
  otpCode: String,
  otpExpiry: Date,
  otpAttempts: Number,
  refreshToken: String,
  lastLogin: Date,
  loginNotifications: Boolean,
  trustedIPs: [{ ip: String, addedAt: Date }],
  sessions: [{ token: String, deviceInfo: Object }],
  createdAt: Date
}
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration
- [ ] Email verification
- [ ] Login with OTP (Chrome)
- [ ] Login without OTP (Edge)
- [ ] Password reset flow
- [ ] Profile updates
- [ ] Password change
- [ ] Data export
- [ ] Admin user management
- [ ] Account deactivation
- [ ] Rate limiting
- [ ] Mobile time restrictions

### Test Accounts
Create test accounts with different roles:
- Regular user: `user@test.com`
- Admin user: `admin@test.com` (set role in DB)

## 📈 Performance

### Optimizations
- Database indexing on frequently queried fields
- Lean queries for read-only operations
- Pagination for large datasets
- Request size limits (10kb)
- Efficient password hashing
- In-memory rate limiting with cleanup

### Monitoring
- Request logging to daily files
- Error logging with stack traces
- Health check endpoint: `/api/health`

## 🚀 Deployment

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed deployment instructions including:
- Traditional server (VPS)
- Heroku
- Docker
- AWS/GCP/DigitalOcean
- MongoDB Atlas setup
- SSL configuration
- PM2 process management
- Nginx reverse proxy

## 📝 Documentation

- [PRODUCTION_READY.md](PRODUCTION_READY.md) - Complete list of improvements and features
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Step-by-step deployment guide
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture details
- [FEATURES_LIST.md](FEATURES_LIST.md) - Detailed feature list

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Express.js for the backend framework
- MongoDB for the database
- Chart.js for analytics visualizations
- Nodemailer for email functionality
- ua-parser-js for device detection

## 📞 Support

For issues or questions:
1. Check the documentation
2. Review logs in `backend/logs/`
3. Check MongoDB connection
4. Verify environment variables
5. Test API endpoints manually

---

**Built with ❤️ for secure authentication and login tracking**

**Status: Production Ready 🚀**
