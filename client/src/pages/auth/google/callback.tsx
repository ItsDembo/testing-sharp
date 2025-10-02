import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function GoogleCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Handle Google OAuth callback
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        // Send error to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_ERROR',
            error: error
          }, window.location.origin);
        }
        window.close();
        return;
      }

      if (code) {
        try {
          // Exchange code for user info
          const response = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
          });

          if (response.ok) {
            const { user } = await response.json();
            
            // Send success to parent window
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_SUCCESS',
                user
              }, window.location.origin);
            }
          } else {
            throw new Error('Authentication failed');
          }
        } catch (error) {
          // Send error to parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'GOOGLE_AUTH_ERROR',
              error: error instanceof Error ? error.message : 'Unknown error'
            }, window.location.origin);
          }
        }
      }

      window.close();
    };

    handleCallback();
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}
