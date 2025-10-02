// Debug utility to trace all auth redirects and navigation to /reset-password
import { supabase } from './supabaseClient';

export function enableAuthRedirectDebug(navigate: (path: string) => void) {
  console.log('🔍 Auth redirect debugging enabled');
  
  // Log every auth event with full context
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('[AUTH EVENT]', {
      event,
      hasSession: !!session,
      currentPath: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      timestamp: new Date().toISOString()
    });
  });

  // Monkey-patch navigate to catch ALL navigation attempts to reset-password
  const originalNavigate = navigate as any;
  const wrappedNavigate = (path: string, ...rest: any[]) => {
    if (path === '/reset-password' || path.includes('reset-password')) {
      const params = new URLSearchParams(window.location.search);
      const recoveryParam = params.get('type');
      
      console.warn('🚨 [REDIRECT ATTEMPT to /reset-password]', {
        targetPath: path,
        currentPath: window.location.pathname,
        recoveryParam,
        hasRecoveryParam: recoveryParam === 'recovery',
        search: window.location.search,
        stack: new Error().stack?.split('\n').slice(0, 10).join('\n')
      });
      
      // If this is NOT a legitimate recovery, block it and go to terminal instead
      if (recoveryParam !== 'recovery') {
        console.warn('🚫 BLOCKING invalid reset-password redirect - going to pricing instead');
        return originalNavigate('/pricing', ...rest);
      }
    }
    
    return originalNavigate(path, ...rest);
  };
  
  return wrappedNavigate as typeof navigate;
}

// Also monitor window.location changes
export function monitorLocationChanges() {
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(state, title, url) {
    if (url && url.toString().includes('reset-password')) {
      console.warn('🚨 [HISTORY.PUSHSTATE to reset-password]', {
        url,
        state,
        stack: new Error().stack?.split('\n').slice(0, 8).join('\n')
      });
    }
    return originalPushState.call(this, state, title, url);
  };
  
  history.replaceState = function(state, title, url) {
    if (url && url.toString().includes('reset-password')) {
      console.warn('🚨 [HISTORY.REPLACESTATE to reset-password]', {
        url,
        state,
        stack: new Error().stack?.split('\n').slice(0, 8).join('\n')
      });
    }
    return originalReplaceState.call(this, state, title, url);
  };
  
  // Monitor URL changes
  window.addEventListener('popstate', (e) => {
    if (window.location.pathname.includes('reset-password')) {
      console.warn('🚨 [POPSTATE to reset-password]', {
        pathname: window.location.pathname,
        search: window.location.search,
        state: e.state
      });
    }
  });
}
