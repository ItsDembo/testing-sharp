import React from 'react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Lock, Star, Clock, Shield } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';

interface SubscriptionGateProps {
  feature?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export function SubscriptionGate({ 
  feature, 
  children, 
  fallback, 
  showUpgradePrompt = true 
}: SubscriptionGateProps) {
  const { hasFeatureAccess, subscriptionAccess, getAccessMessage } = useSubscription();

  const hasAccess = feature ? hasFeatureAccess(feature) : subscriptionAccess?.hasAccess || false;

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <SubscriptionPrompt 
      accessType={subscriptionAccess?.accessType || 'none'}
      message={getAccessMessage(feature)}
      feature={feature}
      daysRemaining={subscriptionAccess?.daysRemaining}
      isDemoMode={subscriptionAccess?.isDemoMode || false}
    />
  );
}

interface SubscriptionPromptProps {
  accessType: string;
  message: string;
  feature?: string;
  daysRemaining?: number;
  isDemoMode: boolean;
}

function SubscriptionPrompt({ 
  accessType, 
  message, 
  feature, 
  daysRemaining, 
  isDemoMode 
}: SubscriptionPromptProps) {
  const getIcon = () => {
    switch (accessType) {
      case 'trial':
        return <Clock className="h-6 w-6" />;
      case 'test':
        return <Shield className="h-6 w-6" />;
      case 'demo':
        return <Star className="h-6 w-6" />;
      default:
        return <Lock className="h-6 w-6" />;
    }
  };

  const getTitle = () => {
    if (isDemoMode) {
      return 'Premium Feature';
    }
    
    switch (accessType) {
      case 'trial':
        return `Trial Access - ${daysRemaining} days remaining`;
      case 'test':
        return 'Test Account Access';
      default:
        return 'Subscription Required';
    }
  };

  const getDescription = () => {
    if (isDemoMode) {
      return 'This feature is only available to subscribers. Sign up and subscribe to unlock all premium features.';
    }

    switch (accessType) {
      case 'trial':
        return 'Your trial is active. Subscribe before it expires to maintain access to all features.';
      case 'none':
        return 'Subscribe to access this premium feature and unlock the full potential of Sharp Shot.';
      default:
        return message;
    }
  };

  const getBadgeVariant = () => {
    switch (accessType) {
      case 'trial':
        return 'default';
      case 'test':
        return 'secondary';
      case 'demo':
        return 'outline';
      default:
        return 'destructive';
    }
  };

  const getActionButton = () => {
    if (isDemoMode) {
      return (
        <div className="flex gap-2">
          <Button onClick={() => window.location.href = '/register'} variant="default">
            Sign Up
          </Button>
          <Button onClick={() => window.location.href = '/subscribe'} variant="outline">
            View Plans
          </Button>
        </div>
      );
    }

    if (accessType === 'trial') {
      return (
        <Button onClick={() => window.location.href = '/subscribe'} variant="default">
          Subscribe Now
        </Button>
      );
    }

    return (
      <Button onClick={() => window.location.href = '/subscribe'} variant="default">
        Upgrade to Premium
      </Button>
    );
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          {getIcon()}
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          {getTitle()}
          <Badge variant={getBadgeVariant()}>
            {accessType === 'demo' ? 'Demo' : accessType === 'trial' ? 'Trial' : 'Premium'}
          </Badge>
        </CardTitle>
        <CardDescription>
          {getDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        {feature && (
          <p className="text-sm text-muted-foreground mb-4">
            Feature: <code className="bg-muted px-1 py-0.5 rounded text-xs">{feature}</code>
          </p>
        )}
        {getActionButton()}
      </CardContent>
    </Card>
  );
}

// Hook for easy feature checking in components
export function useFeatureAccess(feature: string) {
  const { hasFeatureAccess, subscriptionAccess } = useSubscription();
  
  return {
    hasAccess: hasFeatureAccess(feature),
    accessType: subscriptionAccess?.accessType || 'none',
    message: subscriptionAccess?.message || 'Loading...',
    requiresUpgrade: subscriptionAccess?.requiresUpgrade || true
  };
}
