import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Crown, Zap, ArrowRight } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeModal } from './UpgradeModal';
import { Link } from 'wouter';

interface FeatureGateProps {
  feature: string;
  requiredPlan?: 'basic' | 'pro';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgrade?: boolean;
  featureName?: string;
  featureDescription?: string;
}

export function FeatureGate({ 
  feature, 
  requiredPlan = 'pro',
  children, 
  fallback,
  showUpgrade = true,
  featureName,
  featureDescription 
}: FeatureGateProps) {
  const { hasFeature, isPlanActive, plan, isActive } = useSubscription();
  
  // Check if user has access to this feature
  const hasAccess = hasFeature(feature as any) && isPlanActive(requiredPlan);
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  // If fallback is provided, show it instead of upgrade prompt
  if (fallback) {
    return <>{fallback}</>;
  }
  
  // Show upgrade prompt if showUpgrade is true
  if (showUpgrade) {
    return (
      <UpgradePrompt
        requiredPlan={requiredPlan}
        featureName={featureName || feature}
        featureDescription={featureDescription}
        currentPlan={plan}
        isActive={isActive}
        feature={feature}
      />
    );
  }
  
  // Don't render anything
  return null;
}

interface UpgradePromptProps {
  requiredPlan: 'basic' | 'pro';
  featureName: string;
  featureDescription?: string;
  currentPlan: string;
  isActive: boolean;
}

function UpgradePrompt({
  requiredPlan,
  featureName,
  featureDescription,
  currentPlan,
  isActive,
  feature
}: UpgradePromptProps & { feature?: string }) {
  const [showModal, setShowModal] = useState(false);

  const planNames = {
    basic: 'Basic',
    pro: 'Pro'
  };

  const planPrices = {
    basic: '$29.99/month',
    pro: '$99.99/month'
  };

  const planIcons = {
    basic: <Zap className="h-5 w-5" />,
    pro: <Crown className="h-5 w-5" />
  };

  return (
    <>
      <Card className="border-2 border-dashed border-gray-300 dark:border-gray-600">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center mb-3">
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
              <Lock className="h-6 w-6 text-gray-500 dark:text-gray-400" />
            </div>
          </div>
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            {featureName} - Premium Feature
          </CardTitle>
          {featureDescription && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {featureDescription}
            </p>
          )}
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Requires
            </span>
            <Badge variant="outline" className="flex items-center space-x-1">
              {planIcons[requiredPlan]}
              <span>{planNames[requiredPlan]} Plan</span>
            </Badge>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {!isActive ? (
                <>You need an active subscription to access this feature.</>
              ) : (
                <>Your current {planNames[currentPlan as keyof typeof planNames]} plan doesn't include this feature.</>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                onClick={() => setShowModal(true)}
                className="bg-[#D8AC35] hover:bg-[#c49429] text-gray-900 font-semibold"
              >
                {planIcons[requiredPlan]}
                <span className="ml-2">
                  Upgrade to {planNames[requiredPlan]} - {planPrices[requiredPlan]}
                </span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Upgrade anytime • Cancel anytime • 30-day money-back guarantee
          </div>
        </CardContent>
      </Card>

      <UpgradeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        feature={feature}
        featureName={featureName}
        requiredPlan={requiredPlan}
      />
    </>
  );
}

// Convenience components for common feature gates
export function ProFeatureGate({ children, ...props }: Omit<FeatureGateProps, 'requiredPlan'>) {
  return <FeatureGate {...props} requiredPlan="pro">{children}</FeatureGate>;
}

export function BasicFeatureGate({ children, ...props }: Omit<FeatureGateProps, 'requiredPlan'>) {
  return <FeatureGate {...props} requiredPlan="basic">{children}</FeatureGate>;
}

// Hook for checking features in components
export function useFeatureAccess() {
  const subscription = useSubscription();
  
  const checkFeature = (feature: string, requiredPlan: 'basic' | 'pro' = 'pro') => {
    return subscription.hasFeature(feature as any) && subscription.isPlanActive(requiredPlan);
  };
  
  return {
    ...subscription,
    checkFeature,
  };
}
