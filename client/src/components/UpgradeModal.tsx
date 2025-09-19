import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Crown, 
  Check, 
  X, 
  Zap, 
  Target, 
  Users, 
  Download,
  Calculator,
  Filter,
  Star,
  ArrowRight
} from 'lucide-react';
import { Link } from 'wouter';
import { useSubscription } from '@/hooks/useSubscription';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
  featureName?: string;
  requiredPlan?: 'basic' | 'pro';
}

export function UpgradeModal({ 
  isOpen, 
  onClose, 
  feature, 
  featureName,
  requiredPlan = 'pro' 
}: UpgradeModalProps) {
  const { plan, isActive } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro'>('pro');

  const planFeatures = {
    basic: [
      'Basic EV Calculator',
      'Limited Filters',
      '2 Custom Presets',
      'Public Preset Browsing',
      'Dark Mode',
      'Email Support'
    ],
    pro: [
      'All Basic Features',
      'Advanced Filters & EV Threshold',
      'Arbitrage Calculator',
      'Middling Calculator',
      'All Profitable Bets Calculator',
      'Unlimited Custom Presets',
      'Preset Sharing & Collaboration',
      'Advanced Book Weighting',
      'CSV/JSON Export',
      'Real-time Alerts',
      'Priority Support'
    ]
  };

  const planPricing = {
    basic: { monthly: 29.99, annual: 399.99 },
    pro: { monthly: 99.99, annual: 999.99 }
  };

  const getFeatureIcon = (featureName: string) => {
    if (featureName.includes('Calculator')) return <Calculator className="h-4 w-4" />;
    if (featureName.includes('Filter')) return <Filter className="h-4 w-4" />;
    if (featureName.includes('Export')) return <Download className="h-4 w-4" />;
    if (featureName.includes('Preset')) return <Star className="h-4 w-4" />;
    if (featureName.includes('Arbitrage')) return <Target className="h-4 w-4" />;
    if (featureName.includes('Alert')) return <Zap className="h-4 w-4" />;
    return <Crown className="h-4 w-4" />;
  };

  const getCurrentPlanText = () => {
    if (!isActive) return 'No active subscription';
    return `Current: ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`;
  };

  const getUpgradeText = () => {
    if (!isActive) {
      return requiredPlan === 'basic' ? 'Get Started with Basic' : 'Start with Pro';
    }
    if (plan === 'basic' && requiredPlan === 'pro') {
      return 'Upgrade to Pro';
    }
    return 'Get Access';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-2xl">
            <Crown className="h-6 w-6 text-[#D8AC35]" />
            <span>Unlock Premium Features</span>
          </DialogTitle>
          <DialogDescription>
            {featureName ? (
              <>
                <div className="flex items-center space-x-2 mt-2">
                  {getFeatureIcon(featureName)}
                  <span className="font-semibold">{featureName}</span>
                  <Badge variant="outline">
                    {requiredPlan === 'basic' ? 'Basic+' : 'Pro'} Feature
                  </Badge>
                </div>
                <p className="mt-2">
                  This feature requires a {requiredPlan} subscription or higher.
                </p>
              </>
            ) : (
              'Choose the plan that fits your trading needs'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{getCurrentPlanText()}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {!isActive 
                    ? 'Subscribe to unlock advanced trading features'
                    : plan === 'basic' && requiredPlan === 'pro'
                    ? 'Upgrade to Pro for unlimited access'
                    : 'You have access to this feature'
                  }
                </p>
              </div>
              {isActive && plan === requiredPlan && (
                <Badge className="bg-green-500 text-white">
                  <Check className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              )}
            </div>
          </div>

          {/* Plan Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Plan */}
            <Card className={`relative ${selectedPlan === 'basic' ? 'ring-2 ring-[#D8AC35]' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-5 w-5 text-blue-500" />
                    <h3 className="text-xl font-bold">Basic Plan</h3>
                  </div>
                  {plan === 'basic' && isActive && (
                    <Badge variant="outline">Current</Badge>
                  )}
                </div>
                
                <div className="mb-4">
                  <div className="text-3xl font-bold">$29.99</div>
                  <div className="text-sm text-gray-600">per month</div>
                  <div className="text-sm text-gray-500">or $399.99/year (save 17%)</div>
                </div>

                <ul className="space-y-2 mb-6">
                  {planFeatures.basic.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={selectedPlan === 'basic' ? 'default' : 'outline'}
                  className="w-full"
                  onClick={() => setSelectedPlan('basic')}
                >
                  {selectedPlan === 'basic' ? 'Selected' : 'Select Basic'}
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className={`relative ${selectedPlan === 'pro' ? 'ring-2 ring-[#D8AC35]' : ''}`}>
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-[#D8AC35] text-gray-900 font-semibold">
                  Most Popular
                </Badge>
              </div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Crown className="h-5 w-5 text-[#D8AC35]" />
                    <h3 className="text-xl font-bold">Pro Plan</h3>
                  </div>
                  {plan === 'pro' && isActive && (
                    <Badge variant="outline">Current</Badge>
                  )}
                </div>
                
                <div className="mb-4">
                  <div className="text-3xl font-bold">$99.99</div>
                  <div className="text-sm text-gray-600">per month</div>
                  <div className="text-sm text-gray-500">or $999.99/year (save 17%)</div>
                </div>

                <ul className="space-y-2 mb-6">
                  {planFeatures.pro.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={selectedPlan === 'pro' ? 'default' : 'outline'}
                  className="w-full bg-[#D8AC35] hover:bg-[#c49429] text-gray-900"
                  onClick={() => setSelectedPlan('pro')}
                >
                  {selectedPlan === 'pro' ? 'Selected' : 'Select Pro'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Feature Highlight */}
          {featureName && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                {getFeatureIcon(featureName)}
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                    {featureName}
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    {feature === 'arbitrageCalculator' && 'Calculate guaranteed profit opportunities across multiple sportsbooks with optimal stake allocation.'}
                    {feature === 'middlingCalculator' && 'Find profitable middling opportunities on spreads and totals with risk assessment.'}
                    {feature === 'advancedFilters' && 'Access advanced filtering options including EV thresholds and minimum data requirements.'}
                    {feature === 'exportToCsv' && 'Export your trading data to CSV, JSON, and other formats for analysis.'}
                    {feature === 'presetSharing' && 'Share your custom presets with the community and collaborate with other traders.'}
                    {!feature && 'Unlock this premium feature to enhance your trading strategy.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Maybe Later
            </Button>
            <Link href="/pricing" className="flex-1">
              <Button 
                className="w-full bg-[#D8AC35] hover:bg-[#c49429] text-gray-900 font-semibold"
                onClick={onClose}
              >
                <Crown className="h-4 w-4 mr-2" />
                {getUpgradeText()}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Guarantee */}
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <p>30-day money-back guarantee • Cancel anytime • Secure payment</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
