// Bulletproof navigation utilities with guards against accidental reset-password redirects

/** Read-only current path without causing rerenders */
export function currentPath(): string {
  try {
    return window.location?.pathname ?? "/";
  } catch {
    return "/";
  }
}

/** Check if current URL has valid recovery parameters with proper tokens */
export function isValidRecoveryFlow(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    const isRecovery = params.get("type") === "recovery";
    const hasToken = params.has("token_hash") || params.has("code");
    return isRecovery && hasToken;
  } catch {
    return false;
  }
}

/** Check if current path is an auth page that should redirect to terminal on sign-in */
export function isAuthPage(path?: string): boolean {
  const p = path || currentPath();
  return p === "/login" || p === "/signup" || p === "/";
}

/** 
 * BULLETPROOF GUARD: Only allow navigating to /reset-password with valid recovery tokens
 * This prevents ANY accidental redirects to reset-password from anywhere in the app
 */
export function guardedNavigate(navigate: (path: string) => void) {
  return (target: string) => {
    if (target === "/reset-password") {
      const params = new URLSearchParams(window.location.search);
      const isRecovery = params.get("type") === "recovery" && (params.has("token_hash") || params.has("code"));
      if (!isRecovery) {
        console.warn("[GUARD] Blocked navigation to /reset-password without valid recovery token");
        navigate("/login");
        return;
      }
    }
    navigate(target);
  };
}

/** 
 * Safe navigation utility that always uses the guard
 * Use this instead of setLocation directly
 */
export function createSafeNavigate(rawNavigate: (path: string) => void) {
  return guardedNavigate(rawNavigate);
}
