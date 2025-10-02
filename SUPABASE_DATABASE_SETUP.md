# 🗄️ Supabase Database Setup Guide

## 🚀 **Quick Setup Steps**

### 1. **Access Supabase Dashboard**
- Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
- Select your project: `moxqfgaovpchcgafcqll`

### 2. **Open SQL Editor**
- In the left sidebar, click **"SQL Editor"**
- Click **"New Query"**

### 3. **Run the Setup Script**
- Copy the entire contents of `supabase-setup.sql`
- Paste it into the SQL Editor
- Click **"Run"** to execute the script

## 📋 **What the Script Creates**

### **Tables Created:**
- `public.users` - Main user data (extends Supabase auth.users)
- `public.user_profiles` - Additional user profile information
- `public.user_sessions` - User session tracking
- `public.user_activity` - User activity logging

### **Features Added:**
- ✅ Row Level Security (RLS) policies
- ✅ Automatic user creation triggers
- ✅ User activity tracking
- ✅ Session management
- ✅ Subscription status tracking
- ✅ Proper indexing for performance

## 🔐 **Security Features**

- **Row Level Security**: Users can only access their own data
- **Automatic Triggers**: New users are automatically added to the users table
- **Activity Logging**: All user actions are tracked for security

## 📊 **View Your Data**

After running the script, you can view your data:

1. **Go to "Table Editor"** in the left sidebar
2. **Click on "users"** table
3. **You should see all registered users** with their data

## 🧪 **Test the Setup**

1. **Register a new user** on your live site
2. **Check the "users" table** in Supabase
3. **Verify the user was created** with proper data

## 🚨 **Troubleshooting**

### **If you get errors:**
- Make sure you're in the correct project
- Check that the SQL Editor has proper permissions
- Verify all extensions are enabled

### **If tables don't appear:**
- Refresh the Table Editor
- Check the SQL Editor for any error messages
- Ensure the script ran completely

## 🔄 **Updating Existing Users**

If you already have users in Supabase auth but not in the users table:

```sql
-- Insert existing users into the users table
INSERT INTO public.users (id, username, email, created_at, updated_at)
SELECT 
    id,
    COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1)) as username,
    email,
    created_at,
    NOW()
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users);
```

## 📱 **Next Steps**

After setting up the database:

1. **Test user registration** on your live site
2. **Verify data appears** in the Supabase tables
3. **Check user activity** in the user_activity table
4. **Monitor login sessions** in the user_sessions table

---

**Need help?** Check the Supabase logs or create an issue in your project repository.
