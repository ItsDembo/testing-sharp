# 🔐 Supabase Integration Guide

This project is now fully integrated with Supabase for authentication, user management, and database operations.

## 🚀 Quick Start

### 1. Environment Variables

Create a `.env.local` file in your project root with:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://moxqfgaovpchcgafcqll.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1veHFmZ2FvdnBjaGNnYWZjcWxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNjEyMTQsImV4cCI6MjA3MTczNzIxNH0.NRkee35dv7xPX6TtRuNUcv8Nl4Q8noDXh-r--gsg52E

# Service Role Key (server-side only, never expose in browser)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Password Reset Configuration
NEXT_PUBLIC_RESET_REDIRECT=http://localhost:3000/auth/reset
```

### 2. Get Your Service Role Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy the "service_role" key (NOT the anon key)
5. Add it to your `.env.local` file

## 📁 File Structure

```
client/src/
├── lib/
│   ├── supabaseClient.ts      # Client-side Supabase instance (anon key)
│   └── supabaseAdmin.ts       # Server-side Supabase instance (service role)
├── contexts/
│   └── AuthContext.tsx        # React context for auth state
├── hooks/
│   └── useSupabaseAuth.ts     # Custom hook for auth operations
└── app/api/auth/
    ├── signin/route.ts        # Sign in endpoint
    ├── signup/route.ts        # Sign up endpoint
    ├── request-reset/route.ts # Password reset request
    └── update-password/route.ts # Password update
```

## 🔧 Usage

### Client-Side Components

```tsx
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

const LoginForm = () => {
  const { signIn, loading, error } = useSupabaseAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await signIn(email, password);
    if (result.success) {
      // Redirect or update UI
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Your form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
};
```

### Using Auth Context

```tsx
import { useAuth } from '@/contexts/AuthContext';

const App = () => {
  const { user, loading, signOut } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {user ? (
        <div>
          <p>Welcome, {user.email}!</p>
          <button onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <LoginForm />
      )}
    </div>
  );
};
```

### Server-Side Operations

```tsx
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// In API routes or server actions
export async function createUser(userData: any) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: false
  });
  
  if (error) throw error;
  return data;
}
```

## 🛡️ Security Notes

- **NEVER** expose the service role key in client-side code
- **ALWAYS** use `supabaseClient` (anon key) in components
- **ONLY** use `supabaseAdmin` (service role) in API routes/server actions
- The anon key is safe to use in the browser - it has limited permissions

## 🔐 Authentication Flow

### 1. User Registration
```
User fills form → POST /api/auth/signup → Supabase creates user → Confirmation email sent
```

### 2. User Login
```
User fills form → POST /api/auth/signin → Supabase validates → Session created
```

### 3. Password Reset
```
User requests reset → POST /api/auth/request-reset → Email sent → User clicks link → Password update form
```

### 4. Password Update
```
User submits new password → POST /api/auth/update-password → Password updated → User logged in
```

## 🧪 Testing

Test your endpoints:

```bash
# Sign up
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Sign in
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Request password reset
curl -X POST http://localhost:3000/api/auth/request-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## 🚨 Troubleshooting

### Common Issues

1. **"Missing env" error**: Check your `.env.local` file
2. **"Invalid API key"**: Verify your Supabase URL and keys
3. **CORS errors**: Ensure your Supabase project allows your domain
4. **Email not sending**: Check Supabase Auth settings and email templates

### Environment Variable Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set (server-side only)
- [ ] `.env.local` is in project root (not in subdirectories)
- [ ] Server restarted after adding environment variables

## 📚 Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

## 🎯 Next Steps

With authentication set up, you can now:

1. **Add protected routes** using the auth context
2. **Create user profiles** in your database
3. **Implement role-based access control**
4. **Add social authentication** (Google, GitHub, etc.)
5. **Set up real-time subscriptions** for live data

---

**Need help?** Check the Supabase dashboard logs or create an issue in your project repository.
