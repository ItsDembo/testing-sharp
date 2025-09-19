import { useState, useCallback } from 'react';
import { useSubscription } from './useSubscription';

interface UpgradePromptState {
  isOpen: boolean;
  feature?: string;
  featureName?: string;
  requiredPlan?: 'basic' | 'pro';
}

export function useUpgradePrompt() {
  const [promptState, setPromptState] = useState<UpgradePromptState>({
    isOpen: false
  });
  
  const { hasFeature, isPlanActive } = useSubscription();

  const showUpgradePrompt = useCallback((
    feature: string,
    featureName: string,
    requiredPlan: 'basic' | 'pro' = 'pro'
  ) => {
    // Check if user already has access
    if (hasFeature(feature as any) && isPlanActive(requiredPlan)) {
      return false; // User has access, don't show prompt
    }

    setPromptState({
      isOpen: true,
      feature,
      featureName,
      requiredPlan
    });
    
    return true; // Prompt was shown
  }, [hasFeature, isPlanActive]);

  const hideUpgradePrompt = useCallback(() => {
    setPromptState({ isOpen: false });
  }, []);

  const checkFeatureAccess = useCallback((
    feature: string,
    requiredPlan: 'basic' | 'pro' = 'pro'
  ): boolean => {
    return hasFeature(feature as any) && isPlanActive(requiredPlan);
  }, [hasFeature, isPlanActive]);

  const requireFeature = useCallback((
    feature: string,
    featureName: string,
    requiredPlan: 'basic' | 'pro' = 'pro',
    callback?: () => void
  ) => {
    if (checkFeatureAccess(feature, requiredPlan)) {
      callback?.();
      return true;
    } else {
      showUpgradePrompt(feature, featureName, requiredPlan);
      return false;
    }
  }, [checkFeatureAccess, showUpgradePrompt]);

  return {
    promptState,
    showUpgradePrompt,
    hideUpgradePrompt,
    checkFeatureAccess,
    requireFeature
  };
}

// Feature definitions for easy reference
export const FEATURES = {
  ARBITRAGE_CALCULATOR: {
    key: 'arbitrageCalculator',
    name: 'Arbitrage Calculator',
    plan: 'pro' as const
  },
  MIDDLING_CALCULATOR: {
    key: 'middlingCalculator',
    name: 'Middling Calculator',
    plan: 'pro' as const
  },
  ADVANCED_FILTERS: {
    key: 'advancedFilters',
    name: 'Advanced Filters',
    plan: 'pro' as const
  },
  EXPORT_DATA: {
    key: 'exportToCsv',
    name: 'Data Export',
    plan: 'pro' as const
  },
  PRESET_SHARING: {
    key: 'presetSharing',
    name: 'Preset Sharing',
    plan: 'pro' as const
  },
  UNLIMITED_PRESETS: {
    key: 'maxPresets',
    name: 'Unlimited Presets',
    plan: 'pro' as const
  },
  BOOK_WEIGHTING: {
    key: 'advancedBookWeighting',
    name: 'Advanced Book Weighting',
    plan: 'pro' as const
  },
  REAL_TIME_ALERTS: {
    key: 'realTimeAlerts',
    name: 'Real-time Alerts',
    plan: 'pro' as const
  },
  PERFORMANCE_TRACKING: {
    key: 'presetPerformanceTracking',
    name: 'Performance Tracking',
    plan: 'pro' as const
  }
} as const;
