import { useState, useEffect } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

/**
 * COMPLETELY REWRITTEN: Clean authentication hook with NO redirect issues
 * Root cause fix: Removed all redirect configurations and URL manipulation
 */
export const useAuth = (): AuthState & AuthActions => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Authentication functions with built-in safety checks

  useEffect(() => {
    // Enhanced safety check with retry mechanism
    const initializeAuth = () => {
      // Wait for window to be available (client-side only)
      if (typeof window === 'undefined') {
        console.log('⏳ [AUTH] Waiting for client-side initialization...');
        setTimeout(initializeAuth, 100);
        return;
      }

      if (!supabase) {
        console.error('❌ [AUTH] Supabase client not available');
        setError('Authentication service not available');
        setLoading(false);
        return;
      }

      if (!supabase.auth) {
        console.error('❌ [AUTH] Supabase auth service not available');
        setError('Authentication service not available');
        setLoading(false);
        return;
      }

      // Additional check to ensure auth service is ready
      try {
        // Test if auth service is accessible
        const authService = supabase.auth;
        if (!authService || typeof authService.getSession !== 'function') {
          throw new Error('Auth service not properly initialized');
        }
      } catch (err) {
        console.error('❌ [AUTH] Auth service initialization failed:', err);
        setError('Authentication service not available');
        setLoading(false);
        return;
      }

      // SIMPLE: Just get the initial session without any URL manipulation
      const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ [AUTH] Error getting session:', error);
          setError(error.message);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          console.log('✅ [AUTH] Initial session loaded:', { hasUser: !!session?.user, email: session?.user?.email });
        }
      } catch (err) {
        console.error('❌ [AUTH] Exception getting session:', err);
        setError('Failed to load authentication state');
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // SIMPLE: Listen for auth state changes without any redirect logic
    let subscription;
    try {
      const authStateChange = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('🔄 [AUTH] State change:', { 
            event, 
            hasSession: !!session, 
            hasUser: !!session?.user,
            email: session?.user?.email
          });
          
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          setError(null);

          // NO REDIRECT LOGIC - Let components handle navigation
        }
      );
      subscription = authStateChange.data.subscription;
    } catch (err) {
      console.error('❌ [AUTH] Failed to set up auth state listener:', err);
      setError('Failed to initialize authentication listener');
      setLoading(false);
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
    };

    // Initialize authentication with retry mechanism
    const tryInitialize = () => {
      try {
        initializeAuth();
      } catch (error) {
        console.error('❌ [AUTH] Initialization failed, retrying in 200ms:', error);
        setTimeout(tryInitialize, 200);
      }
    };
    
    tryInitialize();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);
    
    // Safety check
    if (!supabase || !supabase.auth) {
      const errorMsg = 'Authentication service not available';
      setError(errorMsg);
      setLoading(false);
      return { success: false, error: errorMsg };
    }
    
    try {
      console.log('🔐 [AUTH] Signing in:', { email });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ [AUTH] Sign in error:', error.message);
        setError(error.message);
        return { success: false, error: error.message };
      }

      if (!data.user || !data.session) {
        const errorMsg = 'Authentication failed - no user data returned';
        console.error('❌ [AUTH]', errorMsg);
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      console.log('✅ [AUTH] Sign in successful:', data.user.email);
      return { success: true };
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('❌ [AUTH] Sign in exception:', err);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📝 [AUTH] Signing up:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        console.error('❌ [AUTH] Sign up error:', error.message);
        setError(error.message);
        return { success: false, error: error.message };
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        console.log('📧 [AUTH] Sign up successful - email confirmation required:', data.user.email);
        return { success: true, error: 'Please check your email to confirm your account before signing in.' };
      }

      // If we have both user and session, it means email confirmation was bypassed
      if (data.user && data.session) {
        console.log('✅ [AUTH] Sign up successful with immediate session:', data.user.email);
        return { success: true };
      }

      // Fallback case
      console.log('⚠️ [AUTH] Sign up completed but no user data returned');
      return { success: false, error: 'Account creation completed but no user data was returned. Please try signing in.' };
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('❌ [AUTH] Sign up exception:', err);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🚪 [AUTH] Signing out');
      
      // Clear local session data first
      setUser(null);
      setSession(null);
      
      // Clear localStorage for wallet sessions
      try {
        localStorage.removeItem('wallet_user');
        localStorage.removeItem('wallet_session');
        localStorage.removeItem('supabase.auth.token');
      } catch (e) {
        console.warn('⚠️ [AUTH] Could not clear localStorage:', e);
      }
      
      // Sign out from Supabase (this will work for both email and wallet users)
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ [AUTH] Sign out error:', error.message);
        setError(error.message);
        return { success: false, error: error.message };
      }

      console.log('✅ [AUTH] Sign out successful');
      return { success: true };
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('❌ [AUTH] Sign out exception:', err);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 [AUTH] Requesting password reset via SendGrid:', email);
      
      // Use our custom SendGrid-powered password reset
      const response = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ [AUTH] Password reset email sent successfully via SendGrid');
        return { success: true };
      } else {
        console.error('❌ [AUTH] Password reset error:', result.error);
        setError(result.error);
        return { success: false, error: result.error };
      }
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('❌ [AUTH] Password reset exception:', err);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    // State
    user,
    session,
    loading,
    error,
    // Actions
    signIn,
    signUp,
    signOut,
    resetPassword,
    clearError,
  };
};
