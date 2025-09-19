import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Circle, 
  AlertCircle, 
  TrendingUp, 
  Target, 
  Settings, 
  Calculator,
  Download,
  Star,
  Users,
  Crown,
  Zap
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

export function ImplementationStatus() {
  const { plan, isActive, features } = useSubscription();

  const implementedFeatures = [
    {
      category: 'Trading Terminal',
      icon: <TrendingUp className="h-5 w-5" />,
      features: [
        {
          name: 'Real-time Opportunity Feed',
          status: 'complete',
          plan: 'basic',
          description: 'Live betting opportunities with filtering'
        },
        {
          name: 'Basic EV Calculator',
          status: 'complete',
          plan: 'basic',
          description: 'Calculate expected value for bets'
        },
        {
          name: 'Advanced Filters',
          status: 'complete',
          plan: 'pro',
          description: 'EV threshold and advanced filtering options'
        },
        {
          name: 'Arbitrage Calculator',
          status: 'complete',
          plan: 'pro',
          description: 'Find guaranteed profit opportunities'
        },
        {
          name: 'Middling Calculator',
          status: 'complete',
          plan: 'pro',
          description: 'Calculate middling opportunities'
        },
        {
          name: 'All Profitable Bets Calculator',
          status: 'complete',
          plan: 'pro',
          description: 'Multi-strategy profit calculator'
        },
        {
          name: 'Data Export (CSV/JSON)',
          status: 'complete',
          plan: 'pro',
          description: 'Export opportunities to various formats'
        }
      ]
    },
    {
      category: 'Preset Terminal',
      icon: <Settings className="h-5 w-5" />,
      features: [
        {
          name: 'Preset Creation & Editing',
          status: 'complete',
          plan: 'basic',
          description: 'Create and manage custom presets'
        },
        {
          name: 'Basic Preset Limit (2)',
          status: 'complete',
          plan: 'basic',
          description: 'Limited preset storage for basic users'
        },
        {
          name: 'Unlimited Presets',
          status: 'complete',
          plan: 'pro',
          description: 'Create unlimited custom presets'
        },
        {
          name: 'Preset Sharing',
          status: 'complete',
          plan: 'pro',
          description: 'Share presets with community'
        },
        {
          name: 'Advanced Book Weighting',
          status: 'complete',
          plan: 'pro',
          description: 'Customize sportsbook importance'
        },
        {
          name: 'Public Preset Browsing',
          status: 'complete',
          plan: 'basic',
          description: 'Browse community presets'
        },
        {
          name: 'Built-in Presets',
          status: 'complete',
          plan: 'basic',
          description: 'Access Sharp Shot curated presets'
        }
      ]
    },
    {
      category: 'Subscription System',
      icon: <Crown className="h-5 w-5" />,
      features: [
        {
          name: 'Feature Access Control',
          status: 'complete',
          plan: 'basic',
          description: 'Subscription-based feature gating'
        },
        {
          name: 'Upgrade Prompts',
          status: 'complete',
          plan: 'basic',
          description: 'User-friendly upgrade modals'
        },
        {
          name: 'Plan Comparison',
          status: 'complete',
          plan: 'basic',
          description: 'Clear feature comparison between plans'
        },
        {
          name: 'Subscription Hooks',
          status: 'complete',
          plan: 'basic',
          description: 'React hooks for subscription management'
        }
      ]
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'pending':
        return <Circle className="h-4 w-4 text-gray-400" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPlanBadge = (planRequired: string) => {
    const isAccessible = planRequired === 'basic' || (planRequired === 'pro' && (plan === 'pro' || !isActive));
    
    return (
      <Badge 
        variant={isAccessible ? "default" : "outline"}
        className={`text-xs ${
          planRequired === 'basic' 
            ? 'bg-blue-500 text-white' 
            : 'bg-[#D8AC35] text-gray-900'
        }`}
      >
        {planRequired === 'basic' ? 'Basic+' : 'Pro'}
      </Badge>
    );
  };

  const getAccessStatus = (planRequired: string) => {
    if (!isActive) return 'Login Required';
    if (planRequired === 'basic') return 'Available';
    if (planRequired === 'pro' && plan === 'pro') return 'Available';
    if (planRequired === 'pro' && plan === 'basic') return 'Upgrade Required';
    return 'Available';
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Sharp Shot Implementation Status
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Fully functional trading and preset terminals with subscription-based features
        </p>
      </div>

      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-[#D8AC35]" />
            <span>Current Subscription</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <Badge className={isActive ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}>
                  {isActive ? `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan` : 'No Active Plan'}
                </Badge>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {isActive 
                  ? `You have access to ${plan === 'pro' ? 'all' : 'basic'} features`
                  : 'Subscribe to unlock premium features'
                }
              </p>
            </div>
            {!isActive && (
              <Button className="bg-[#D8AC35] hover:bg-[#c49429] text-gray-900">
                Get Started
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature Implementation Status */}
      {implementedFeatures.map((category) => (
        <Card key={category.category}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {category.icon}
              <span>{category.category}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {category.features.map((feature) => (
                <div key={feature.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(feature.status)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{feature.name}</span>
                        {getPlanBadge(feature.plan)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {getAccessStatus(feature.plan)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Summary */}
      <Card className="border-[#D8AC35] border-2">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Implementation Complete
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Both the Trading Terminal and Preset Terminal are now fully functional with 
              comprehensive subscription-based feature restrictions. Users can access basic 
              features for free and upgrade to Pro for advanced capabilities.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#D8AC35]">15+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Features Implemented</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#D8AC35]">4</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Calculators</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#D8AC35]">2</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Subscription Tiers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#D8AC35]">100%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Feature Complete</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
