import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Wallet, Chrome, Shield } from 'lucide-react';

// Types for wallet authentication
interface WalletAuthResult {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    email?: string;
    walletAddress?: string;
    provider: 'google' | 'phantom';
  };
}

// Google OAuth handler
const handleGoogleLogin = async (): Promise<WalletAuthResult> => {
  try {
    // Get Google OAuth URL from server
    const response = await fetch('/api/auth/google/url');
    if (!response.ok) {
      throw new Error('Failed to get Google OAuth URL');
    }
    
    const { authUrl } = await response.json();
    
    if (!authUrl) {
      throw new Error('Google OAuth not configured');
    }

    // Open popup window
    const popup = window.open(
      authUrl,
      'googleAuth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      throw new Error('Failed to open Google login popup');
    }

    // Listen for popup completion
    return new Promise((resolve) => {
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          resolve({ success: false, error: 'Login cancelled' });
        }
      }, 1000);

      // Listen for message from popup
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          popup.close();
          resolve({
            success: true,
            user: event.data.user
          });
        } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          popup.close();
          resolve({ success: false, error: event.data.error });
        }
      };

      window.addEventListener('message', messageHandler);
    });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Phantom wallet handler
const handlePhantomLogin = async (): Promise<WalletAuthResult> => {
  try {
    // Check if Phantom is installed
    if (!window.solana || !window.solana.isPhantom) {
      throw new Error('Phantom wallet not found. Please install Phantom wallet.');
    }

    // Request connection
    const response = await window.solana.connect();
    const walletAddress = response.publicKey?.toString();
    
    if (!walletAddress) {
      throw new Error('Failed to get wallet address');
    }

    // Get nonce from server
    const nonceResponse = await fetch('/api/siws/nonce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress })
    });

    if (!nonceResponse.ok) {
      throw new Error('Failed to get nonce');
    }

    const { nonce } = await nonceResponse.json();

    // Create message to sign
    const message = `Sign in to Sharp Shot\nWallet: ${walletAddress}\nNonce: ${nonce}\nDomain: ${window.location.hostname}`;

    // Request signature
    const signature = await window.solana.signMessage(
      new TextEncoder().encode(message),
      'utf8'
    );

    // Verify signature with server
    const verifyResponse = await fetch('/api/siws/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        signature: Array.from(signature.signature),
        message
      })
    });

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json().catch(() => ({}));
      throw new Error(errorData.error || 'Signature verification failed');
    }

    const verifyData = await verifyResponse.json();

    if (!verifyData.success || !verifyData.user) {
      throw new Error(verifyData.error || 'Authentication failed');
    }

    return {
      success: true,
      user: {
        id: verifyData.user.id,
        walletAddress,
        provider: 'phantom'
      }
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export default function WalletLogin() {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isPhantomLoading, setIsPhantomLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    try {
      // First check if Google OAuth is configured
      const configResponse = await fetch('/api/auth/test');
      const config = await configResponse.json();
      
      if (!config.google?.configured) {
        toast({
          title: "Google OAuth Not Configured",
          description: "Google sign-in is not available at this time. Please use email/password or Phantom wallet.",
          variant: "destructive",
        });
        return;
      }
      
      const result = await handleGoogleLogin();
      
      if (result.success && result.user) {
        toast({
          title: "Welcome!",
          description: `Signed in with Google as ${result.user.email}`,
        });
        setLocation('/pricing');
      } else {
        toast({
          title: "Authentication Failed",
          description: result.error || "Google login failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handlePhantomAuth = async () => {
    setIsPhantomLoading(true);
    try {
      const result = await handlePhantomLogin();
      
      if (result.success && result.user) {
        toast({
          title: "Wallet Connected!",
          description: `Signed in with Phantom wallet: ${result.user.walletAddress?.slice(0, 8)}...`,
        });
        setLocation('/pricing');
      } else {
        toast({
          title: "Wallet Authentication Failed",
          description: result.error || "Phantom login failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsPhantomLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            One-Click Authentication
          </CardTitle>
          <CardDescription>
            Sign in securely with your preferred method
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google SSO */}
          <Button
            onClick={handleGoogleAuth}
            disabled={isGoogleLoading || isPhantomLoading}
            className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
            variant="outline"
          >
            <Chrome className="h-5 w-5 mr-2" />
            {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
          </Button>

          {/* Phantom Wallet */}
          <Button
            onClick={handlePhantomAuth}
            disabled={isGoogleLoading || isPhantomLoading}
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
          >
            <Wallet className="h-5 w-5 mr-2" />
            {isPhantomLoading ? 'Connecting...' : 'Connect Phantom Wallet'}
          </Button>

          <div className="text-center">
            <Badge variant="secondary" className="text-xs">
              🔒 Secure • No passwords required
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-green-500" />
          <span>Secure authentication</span>
        </div>
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-purple-500" />
          <span>Web3 wallet support</span>
        </div>
        <div className="flex items-center gap-2">
          <Chrome className="h-4 w-4 text-blue-500" />
          <span>Google SSO integration</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-green-500" />
          <span>No personal data stored</span>
        </div>
      </div>
    </div>
  );
}

// Extend Window interface for Phantom
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      signMessage: (message: Uint8Array, format: string) => Promise<{ signature: Uint8Array }>;
    };
  }
}
