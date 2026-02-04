# Ganimi App - Setup Guide

## What's Been Created

I've set up a complete authentication system for your Ganimi React Native app with the following features:

### 📁 Project Structure

```
ganimi/
├── app/
│   ├── _layout.tsx          # Root layout with AuthProvider
│   ├── index.tsx            # Splash/routing screen
│   ├── login.tsx            # Login page
│   ├── register.tsx         # Registration page
│   └── (tabs)/
│       ├── _layout.tsx      # Tab navigation layout
│       ├── index.tsx        # Home screen
│       └── profile.tsx      # Profile screen with logout
├── context/
│   └── AuthContext.tsx      # Authentication context & state management
├── services/
│   ├── api.ts               # Base API service with fetch wrapper
│   └── auth.service.ts      # Authentication API calls
├── types/
│   └── auth.ts              # TypeScript interfaces for auth
└── constants/
    ├── config.ts            # API configuration
    └── Colors.ts            # App color scheme
```

### ✨ Features Implemented

1. **Login Page** (`/login`)
   - Email & password fields
   - "Remember me" checkbox
   - "Forgot password" link
   - Form validation
   - Beautiful UI matching the design

2. **Register Page** (`/register`)
   - Full name, email, password fields
   - Role selection (Student/Vendor)
   - Terms & conditions checkbox
   - Password confirmation
   - Form validation

3. **Authentication Flow**
   - JWT token management (using HTTP-only cookies)
   - Automatic routing based on auth status
   - Protected routes
   - User session persistence with AsyncStorage

4. **API Integration**
   - Complete API service setup
   - Error handling
   - Network error detection
   - Type-safe requests with TypeScript

5. **Navigation**
   - Expo Router file-based routing
   - Tab navigation after login
   - Automatic redirect to login if not authenticated

## 🚀 Getting Started

### 1. Update API Configuration

Open `constants/config.ts` and update the API URL:

```typescript
export const API_CONFIG = {
  BASE_URL: 'http://YOUR_LOCAL_IP:5500/api/v1', // Change this!
  TIMEOUT: 30000,
};

export const DEFAULT_TENANT_ID = 'your-tenant-id-here'; // Add your tenant ID
```

**Important for Expo Go:**
- Don't use `localhost` - use your computer's local IP address
- Example: `http://192.168.1.100:5500/api/v1`
- Make sure your phone and computer are on the same network

### 2. Run the App

The app should already be running. If not, start it with:

```bash
npm start
```

Then scan the QR code with Expo Go on your phone.

### 3. Test the Authentication

1. Open the app - you'll see the login screen
2. Try creating an account on the register page
3. Login with your credentials
4. You'll be redirected to the home screen with tabs

## 📱 App Flow

```
App Start
   ↓
Check if authenticated
   ↓
   ├─ Yes → Home Screen (Tabs)
   └─ No → Login Screen
              ↓
         [Sign Up] → Register Screen
              ↓
         After Login → Home Screen (Tabs)
```

## 🎨 Screens Overview

### Login Screen
- Email input with mail icon
- Password input with eye icon (show/hide)
- Remember me checkbox
- Forgot password link
- Sign in button
- Link to register page

### Register Screen
- Full name input
- Email input
- Role dropdown (Student/Vendor)
- Password with strength requirements
- Confirm password
- Terms agreement checkbox
- Create account button
- Link back to login

### Home Screen (After Login)
- Welcome message with user name
- Shows user role
- Tab navigation (Home, Profile)

### Profile Screen
- User information display
- Menu items for edit profile, settings, help
- Logout button

## 🔧 API Endpoints Used

Based on your API documentation:

- `POST /auth/register` - User registration
- `POST /auth/login` - User authentication
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout user

## 🛠️ Tech Stack

- **React Native** with **Expo**
- **Expo Router** for navigation
- **TypeScript** for type safety
- **AsyncStorage** for local data persistence
- **Expo Vector Icons** for icons

## ⚠️ Important Notes

1. **API URL**: Must be updated in `constants/config.ts` before testing
2. **Tenant ID**: Required for all auth requests - update in config
3. **Network**: Phone and computer must be on same WiFi for Expo Go
4. **Cookies**: The app uses `credentials: 'include'` to handle HTTP-only cookies

## 🎯 Next Steps

1. Update the API base URL and tenant ID
2. Test login/register flows
3. Add more features:
   - Password reset functionality
   - Profile editing
   - Course browsing
   - Enrollment features
   - etc.

## 🐛 Troubleshooting

### "Network request failed"
- Check if backend is running
- Verify API URL is correct (use local IP, not localhost)
- Ensure phone and computer are on same network

### "Cannot connect to API"
- Check firewall settings
- Make sure backend allows CORS
- Verify the port is correct

### App crashes on startup
- Run `npm install` to ensure all dependencies are installed
- Clear cache: `npm start -- --clear`

## 📝 Code Examples

### Making API Calls

```typescript
import { authService } from '@/services/auth.service';

// Login
const response = await authService.login({
  email: 'user@example.com',
  password: 'password123',
  tenantId: 'tenant-id'
});

// Get current user
const user = await authService.getCurrentUser();
```

### Using Auth Context

```typescript
import { useAuth } from '@/context/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  // Access user data
  console.log(user?.name);
  
  // Check auth status
  if (isAuthenticated) {
    // User is logged in
  }
}
```

## 🎉 You're All Set!

Your authentication system is ready to go. Update the API configuration and start testing!
