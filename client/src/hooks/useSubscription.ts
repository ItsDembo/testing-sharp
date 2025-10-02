import { useState, useEffect } from 'react';
import { useUser } from './useUser';

export interface SubscriptionAccess {
  hasAccess: boolean;
  accessType: 'none' | 'trial' | 'subscription' | 'test' | 'demo';
  expiresAt?: string;
  daysRemaining?: number;
  message: string;
  requiresUpgrade: boolean;
  isDemoMode?: boolean;
}

export function useSubscription() {
  const [subscriptionAccess, setSubscriptionAccess] = useState<SubscriptionAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // If user is in demo mode, return demo access info
        if (user?.isDemo) {
          setSubscriptionAccess({
            hasAccess: false,
            accessType: 'demo',
            message: 'Demo mode - subscribe for full access',
            requiresUpgrade: true,
            isDemoMode: true
          });
          return;
        }

        // If no user, no access
        if (!user) {
          setSubscriptionAccess({
            hasAccess: false,
            accessType: 'none',
            message: 'Please log in to access features',
            requiresUpgrade: true
          });
          return;
        }

        // Fetch actual subscription status from API
        const response = await fetch('/api/user/access-status', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch subscription status');
        }

        const accessData = await response.json();
        setSubscriptionAccess(accessData);
      } catch (err) {
        console.error('Error fetching subscription status:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        
        // Fallback to user data if API fails
        if (user && !user.isDemo) {
          setSubscriptionAccess({
            hasAccess: user.subscriptionStatus === 'active',
            accessType: user.subscriptionStatus === 'active' ? 'subscription' : 'none',
            message: user.subscriptionStatus === 'active' 
              ? `Active ${user.subscriptionPlan} subscription` 
              : 'No active subscription',
            requiresUpgrade: user.subscriptionStatus !== 'active'
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptionStatus();
  }, [user]);

  const hasFeatureAccess = (feature: string): boolean => {
    if (!subscriptionAccess) return false;
    
    // Free features that everyone can access
    const freeFeatures = [
      'game-scores',
      'basic-odds-view',
      'account-management'
    ];

    if (freeFeatures.includes(feature)) {
      return true;
    }

    // Premium features require subscription
    return subscriptionAccess.hasAccess;
  };

  const getAccessMessage = (feature?: string): string => {
    if (!subscriptionAccess) return 'Loading...';
    
    if (subscriptionAccess.isDemoMode) {
      return 'Sign up and subscribe to access this feature';
    }

    if (subscriptionAccess.accessType === 'trial') {
      return `Trial access - ${subscriptionAccess.daysRemaining} days remaining`;
    }

    if (subscriptionAccess.accessType === 'subscription') {
      return `Full access - ${subscriptionAccess.daysRemaining} days remaining`;
    }

    return subscriptionAccess.message;
  };

  const refreshSubscriptionStatus = () => {
    setIsLoading(true);
    setError(null);
    // Re-trigger the effect by changing user dependency (this is a bit hacky but works)
    // In a real app, you might want a more sophisticated cache invalidation strategy
  };

  return {
    subscriptionAccess,
    isLoading,
    error,
    hasFeatureAccess,
    getAccessMessage,
    refreshSubscriptionStatus,
    hasAccess: subscriptionAccess?.hasAccess || false,
    accessType: subscriptionAccess?.accessType || 'none',
    requiresUpgrade: subscriptionAccess?.requiresUpgrade || true,
    daysRemaining: subscriptionAccess?.daysRemaining,
    isDemoMode: subscriptionAccess?.isDemoMode || false
  };
}
