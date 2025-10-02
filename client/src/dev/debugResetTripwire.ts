// Development-only tripwire to catch and log any attempts to navigate to /reset-password
// This helps identify the exact source of unwanted redirects

export function wrapNavigateWithTripwire(navigate: (path: string) => void) {
  return (path: string) => {
    if (path === "/reset-password" || path.includes("reset-password")) {
      const params = new URLSearchParams(window.location.search);
      const hasRecovery = params.get("type") === "recovery";
      
      console.warn("[TRIPWIRE] 🚨 Attempted navigate to /reset-password", {
        path,
        currentPath: window.location.pathname,
        search: window.location.search,
        hasRecoveryParam: hasRecovery,
        isValidRecovery: hasRecovery,
        timestamp: new Date().toISOString(),
        stack: new Error().stack?.split('\n').slice(0, 12).join('\n')
      });
      
      // If this is not a valid recovery attempt, log it as suspicious
      if (!hasRecovery) {
        console.error("[TRIPWIRE] 🔥 SUSPICIOUS: Reset-password redirect without recovery context!");
      }
    }
    
    return navigate(path);
  };
}

// Also monitor direct URL changes
export function initTripwireMonitoring() {
  if (typeof window === 'undefined') return;
  
  console.log("[TRIPWIRE] 🔍 Initializing EMERGENCY reset-password redirect monitoring...");
  
  // EMERGENCY: Monitor current URL every 100ms
  let lastPath = window.location.pathname;
  const urlMonitor = setInterval(() => {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      console.log("[TRIPWIRE] 📍 URL CHANGE DETECTED:", {
        from: lastPath,
        to: currentPath,
        search: window.location.search,
        timestamp: new Date().toISOString()
      });
      
      if (currentPath.includes('reset-password')) {
        const params = new URLSearchParams(window.location.search);
        const hasRecovery = params.get('type') === 'recovery';
        console.error("[TRIPWIRE] 🚨 RESET-PASSWORD URL DETECTED!", {
          path: currentPath,
          search: window.location.search,
          hasRecovery,
          previousPath: lastPath
        });
        
        if (!hasRecovery) {
          console.error("[TRIPWIRE] 🔥 INVALID RESET-PASSWORD ACCESS - FORCING REDIRECT");
          alert("🚨 EMERGENCY: Invalid reset-password access detected! Forcing redirect to pricing.");
          window.location.href = '/pricing';
        }
      }
      lastPath = currentPath;
    }
  }, 100);
  
  // Monitor history API calls
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(state, title, url) {
    if (url && url.toString().includes('reset-password')) {
      console.warn('[TRIPWIRE] 🚨 history.pushState to reset-password:', {
        url: url.toString(),
        state,
        stack: new Error().stack?.split('\n').slice(0, 8).join('\n')
      });
    }
    return originalPushState.call(this, state, title, url);
  };
  
  history.replaceState = function(state, title, url) {
    if (url && url.toString().includes('reset-password')) {
      console.warn('[TRIPWIRE] 🚨 history.replaceState to reset-password:', {
        url: url.toString(),
        state,
        stack: new Error().stack?.split('\n').slice(0, 8).join('\n')
      });
    }
    return originalReplaceState.call(this, state, title, url);
  };
  
  // Monitor location changes
  window.addEventListener('popstate', (e) => {
    if (window.location.pathname.includes('reset-password')) {
      const params = new URLSearchParams(window.location.search);
      console.warn('[TRIPWIRE] 🚨 popstate to reset-password:', {
        pathname: window.location.pathname,
        search: window.location.search,
        hasRecovery: params.get('type') === 'recovery',
        state: e.state
      });
    }
  });
}
