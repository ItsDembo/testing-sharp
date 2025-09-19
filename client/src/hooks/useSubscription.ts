import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface SubscriptionInfo {
  subscriptionStatus: string;
  subscriptionPlan: string;
  subscriptionPeriod: string;
  subscriptionEndsAt: string | null;
}

export interface SubscriptionFeatures {
  // Trading Terminal Features
  advancedFilters: boolean;
  arbitrageCalculator: boolean;
  middlingCalculator: boolean;
  evCalculator: boolean;
  exportToCsv: boolean;
  realTimeAlerts: boolean;
  bookPriorityWeighting: boolean;
  
  // Preset Terminal Features
  maxPresets: number;
  presetSharing: boolean;
  presetCollaboration: boolean;
  publicPresetBrowsing: boolean;
  presetPerformanceTracking: boolean;
  advancedBookWeighting: boolean;
  
  // General Features
  prioritySupport: boolean;
  darkMode: boolean;
  dataExport: boolean;
}

const PLAN_FEATURES: Record<string, SubscriptionFeatures> = {
  basic: {
    // Trading Terminal Features
    advancedFilters: false,
    arbitrageCalculator: false,
    middlingCalculator: false,
    evCalculator: true,
    exportToCsv: false,
    realTimeAlerts: false,
    bookPriorityWeighting: false,
    
    // Preset Terminal Features
    maxPresets: 2,
    presetSharing: false,
    presetCollaboration: false,
    publicPresetBrowsing: true,
    presetPerformanceTracking: false,
    advancedBookWeighting: false,
    
    // General Features
    prioritySupport: false,
    darkMode: true,
    dataExport: false,
  },
  pro: {
    // Trading Terminal Features
    advancedFilters: true,
    arbitrageCalculator: true,
    middlingCalculator: true,
    evCalculator: true,
    exportToCsv: true,
    realTimeAlerts: true,
    bookPriorityWeighting: true,
    
    // Preset Terminal Features
    maxPresets: -1, // unlimited
    presetSharing: true,
    presetCollaboration: true,
    publicPresetBrowsing: true,
    presetPerformanceTracking: true,
    advancedBookWeighting: true,
    
    // General Features
    prioritySupport: true,
    darkMode: true,
    dataExport: true,
  },
};

export function useSubscription() {
  const { data: subscriptionData, isLoading, error } = useQuery<SubscriptionInfo>({
    queryKey: ['/api/user/subscription'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  const plan = subscriptionData?.subscriptionPlan || 'basic';
  const status = subscriptionData?.subscriptionStatus || 'inactive';
  const isActive = status === 'active';
  
  // Get features for current plan
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.basic;
  
  // Helper functions
  const hasFeature = (feature: keyof SubscriptionFeatures): boolean => {
    if (!isActive && plan !== 'basic') return false;
    return features[feature] as boolean;
  };
  
  const canCreatePreset = (currentPresetCount: number): boolean => {
    if (!isActive && plan !== 'basic') return false;
    if (features.maxPresets === -1) return true;
    return currentPresetCount < features.maxPresets;
  };
  
  const getMaxPresets = (): number => {
    if (!isActive && plan !== 'basic') return PLAN_FEATURES.basic.maxPresets;
    return features.maxPresets;
  };
  
  const isPlanActive = (requiredPlan: string): boolean => {
    if (!isActive) return false;
    const planHierarchy = { basic: 1, pro: 2 };
    const currentLevel = planHierarchy[plan as keyof typeof planHierarchy] || 0;
    const requiredLevel = planHierarchy[requiredPlan as keyof typeof planHierarchy] || 0;
    return currentLevel >= requiredLevel;
  };

  return {
    // Subscription info
    subscription: subscriptionData,
    plan,
    status,
    isActive,
    isLoading,
    error,
    
    // Features
    features,
    hasFeature,
    canCreatePreset,
    getMaxPresets,
    isPlanActive,
    
    // Plan checks
    isBasic: plan === 'basic',
    isPro: plan === 'pro',
  };
}
