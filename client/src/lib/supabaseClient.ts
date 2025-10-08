import { createClient } from '@supabase/supabase-js';

// For Vite/React apps, use import.meta.env instead of process.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 
                   import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
                   'https://moxqfgaovpchcgafcqll.supabase.co';

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 
                       import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                       'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1veHFmZ2FvdnBjaGNnYWZjcWxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNjEyMTQsImV4cCI6MjA3MTczNzIxNH0.NRkee35dv7xPX6TtRuNUcv8Nl4Q8noDXh-r--gsg52E';

console.log('🔍 [SUPABASE ENV CHECK]:', {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? 'set' : 'missing',
  NEXT_PUBLIC_SUPABASE_URL: import.meta.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'set' : 'missing',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'missing',
  finalUrl: supabaseUrl,
  finalKeyLength: supabaseAnonKey?.length
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('🚨 CRITICAL: Missing Supabase environment variables after fallback!');
}

// Safe storage check - handle cases where localStorage might not be available
const safeStorage = (() => {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch (error) {
    console.warn('⚠️ [SUPABASE] localStorage not available:', error);
    return null;
  }
})();

export const supabase = createClient(
  supabaseUrl || 'https://moxqfgaovpchcgafcqll.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1veHFmZ2FvdnBjaGNnYWZjcWxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNjEyMTQsImV4cCI6MjA3MTczNzIxNH0.NRkee35dv7xPX6TtRuNUcv8Nl4Q8noDXh-r--gsg52E',
  {
    auth: {
      // Enhanced auth configuration for better session management
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true, // Allow session detection for proper auth flow
      flowType: 'pkce',
      storageKey: 'supabase.auth.token',
      storage: safeStorage || undefined,
      debug: false
    }
  }
);

// EMERGENCY: Log Supabase configuration
console.log('🔍 [SUPABASE] Client configuration:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  detectSessionInUrl: true,
  persistSession: true,
  autoRefreshToken: true
});

// Test Supabase connection
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ [SUPABASE] Connection test failed:', error);
  } else {
    console.log('✅ [SUPABASE] Connection test successful');
  }
}).catch(err => {
  console.error('❌ [SUPABASE] Connection test exception:', err);
});