-- 🔧 Fix the Supabase Trigger Function
-- Run this in your Supabase SQL Editor

-- First, drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a more robust trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    username_val TEXT;
BEGIN
    -- Extract username from metadata or email
    username_val := COALESCE(
        NEW.raw_user_meta_data->>'username', 
        split_part(NEW.email, '@', 1)
    );
    
    -- Ensure username is not null and has reasonable length
    IF username_val IS NULL OR length(username_val) = 0 THEN
        username_val := 'user_' || substr(NEW.id::text, 1, 8);
    END IF;
    
    -- Insert user record with proper error handling
    BEGIN
        INSERT INTO public.users (id, username, email, created_at, updated_at)
        VALUES (
            NEW.id,
            username_val,
            NEW.email,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'User record created successfully: %', NEW.id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to create user record: %', SQLERRM;
        -- Continue execution even if this fails
    END;
    
    -- Insert default profile
    BEGIN
        INSERT INTO public.user_profiles (user_id)
        VALUES (NEW.id);
        
        RAISE NOTICE 'Profile record created successfully for user: %', NEW.id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to create profile record: %', SQLERRM;
        -- Continue execution even if this fails
    END;
    
    -- Log the registration
    BEGIN
        INSERT INTO public.user_activity (user_id, action, details)
        VALUES (
            NEW.id, 
            'user_registered', 
            jsonb_build_object(
                'email', NEW.email,
                'username', username_val,
                'timestamp', NOW()
            )
        );
        
        RAISE NOTICE 'Activity logged successfully for user: %', NEW.id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to log user activity: %', SQLERRM;
        -- Continue execution even if this fails
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions to the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Test the function (optional)
-- SELECT public.handle_new_user();

-- Verify the trigger was created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
