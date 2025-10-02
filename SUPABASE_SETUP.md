# Supabase Authentication Setup Guide

## 🔑 **Environment Variables Setup**

### 1. **Create `.env.local` file**
Create this file in your project root with the following content:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://moxqfgaovpchcgafcqll.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1veHFmZ2FvdnBjaGNnYWZjcWxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNjEyMTQsImV4cCI6MjA3MTczNzIxNH0.NRkee35dv7xPX6TtRuNUcv8Nl4Q8noDXh-r--gsg52E
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1veHFmZ2FvdnBjaGNnYWZjcWxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjE2MTIxNCwiZXhwIjoyMDcxNzM3MjE0fQ.UrzcQIP92C35C3uRTc3E4KfPPKiEW-1CVdOcS2TSZBo
```

### 2. **Add to Vercel Environment Variables**
Go to your Vercel project → Settings → Environment Variables and add the same three variables.

## 🗄️ **Database Setup**

### 1. **Run SQL Script in Supabase**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `moxqfgaovpchcgafcqll`
3. Go to SQL Editor
4. Copy and paste the contents of `supabase-setup.sql`
5. Click "Run" to execute the script

This will create:
- `profiles` table with RLS policies
- `user_bets` table for storing user betting data
- Triggers for automatic timestamp updates
- Row Level Security policies

## ⚙️ **Supabase Dashboard Configuration**

### 1. **Auth → URL Configuration**
Add these URLs to your Supabase project:
- `http://localhost:3000`
- `https://your-vercel-domain.vercel.app`
- `http://localhost:3000/auth/reset`
- `https://your-vercel-domain.vercel.app/auth/reset`

### 2. **Auth → Email Templates**
Configure your email templates for:
- **Confirm signup** (if email confirmation is enabled)
- **Reset password** emails

### 3. **Auth → SMTP Settings**
Set up your SMTP credentials for sending emails:
- **Host**: Your SMTP server
- **Port**: Usually 587 or 465
- **Username**: Your email
- **Password**: Your email password or app password
- **Sender**: Your no-reply email address

## 🚀 **Usage Examples**

### **Sign Up**
```typescript
import { apiSignUp } from '@/lib/authApi';

try {
  await apiSignUp('user@example.com', 'password123');
  // User created successfully
} catch (error) {
  // Handle error
}
```

### **Sign In**
```typescript
import { apiSignIn } from '@/lib/authApi';

try {
  const result = await apiSignIn('user@example.com', 'password123');
  // result.session and result.user available
} catch (error) {
  // Handle error
}
```

### **Request Password Reset**
```typescript
import { apiRequestReset } from '@/lib/authApi';

try {
  await apiRequestReset('user@example.com');
  // Reset email sent
} catch (error) {
  // Handle error
}
```

### **Update Password**
```typescript
import { apiUpdatePassword } from '@/lib/authApi';

try {
  await apiUpdatePassword('newPassword123');
  // Password updated successfully
} catch (error) {
  // Handle error
}
```

## 🔒 **Security Notes**

- **Never expose** `SUPABASE_SERVICE_ROLE_KEY` to the frontend
- **Always use** `supabaseClient` for frontend operations
- **Only use** `supabaseAdmin` in API routes
- **Enable RLS** on all tables for proper data isolation

## 📱 **API Endpoints**

Your authentication system now includes these endpoints:

- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User authentication
- `POST /api/auth/request-reset` - Password reset request
- `POST /api/auth/update-password` - Password update after reset

## 🧪 **Testing**

1. **Test Sign Up**: Create a new user account
2. **Test Sign In**: Authenticate with the created account
3. **Test Password Reset**: Request and complete password reset
4. **Verify Database**: Check that profiles are created automatically

## 🆘 **Troubleshooting**

### **Common Issues**

1. **Environment Variables Not Loading**
   - Restart your development server
   - Check `.env.local` file location
   - Verify variable names match exactly

2. **Supabase Connection Errors**
   - Verify your project URL and keys
   - Check if your Supabase project is active
   - Ensure your IP is not blocked

3. **Email Not Sending**
   - Check SMTP credentials in Supabase
   - Verify email templates are configured
   - Check spam/junk folders

### **Support**
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [Vercel Documentation](https://vercel.com/docs)

## ✅ **Next Steps**

1. **Test the authentication flow** end-to-end
2. **Customize email templates** to match your brand
3. **Add user profile management** UI if needed
4. **Implement protected routes** using Supabase auth state
5. **Add social authentication** (Google, GitHub, etc.) if desired
