import { useState, useEffect } from 'react';

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  touchSupported: boolean;
  userAgent: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

export const useDeviceDetection = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    if (typeof window === 'undefined') {
      // Server-side rendering fallback
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        screenWidth: 1920,
        screenHeight: 1080,
        orientation: 'landscape' as const,
        touchSupported: false,
        userAgent: '',
        deviceType: 'desktop' as const
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const userAgent = navigator.userAgent.toLowerCase();
    const touchSupported = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Mobile device detection
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    const isMobileUA = mobileRegex.test(userAgent);
    
    // Screen size based detection
    const isMobileScreen = width <= 768;
    const isTabletScreen = width > 768 && width <= 1024;
    
    // Combined detection
    const isMobile = isMobileUA || isMobileScreen;
    const isTablet = !isMobile && (isTabletScreen || (touchSupported && width <= 1024));
    const isDesktop = !isMobile && !isTablet;
    
    let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (isMobile) deviceType = 'mobile';
    else if (isTablet) deviceType = 'tablet';
    
    return {
      isMobile,
      isTablet,
      isDesktop,
      screenWidth: width,
      screenHeight: height,
      orientation: width > height ? 'landscape' : 'portrait',
      touchSupported,
      userAgent,
      deviceType
    };
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const userAgent = navigator.userAgent.toLowerCase();
      const touchSupported = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Mobile device detection
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      const isMobileUA = mobileRegex.test(userAgent);
      
      // Screen size based detection
      const isMobileScreen = width <= 768;
      const isTabletScreen = width > 768 && width <= 1024;
      
      // Combined detection
      const isMobile = isMobileUA || isMobileScreen;
      const isTablet = !isMobile && (isTabletScreen || (touchSupported && width <= 1024));
      const isDesktop = !isMobile && !isTablet;
      
      let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
      if (isMobile) deviceType = 'mobile';
      else if (isTablet) deviceType = 'tablet';
      
      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        screenWidth: width,
        screenHeight: height,
        orientation: width > height ? 'landscape' : 'portrait',
        touchSupported,
        userAgent,
        deviceType
      });
    };

    // Update on resize and orientation change
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);
    
    // Initial update
    updateDeviceInfo();

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
};

// Utility functions for responsive design
export const getResponsiveClasses = (deviceInfo: DeviceInfo) => {
  const { isMobile, isTablet, orientation } = deviceInfo;
  
  return {
    // Container classes
    container: isMobile 
      ? 'px-2 py-1' 
      : isTablet 
        ? 'px-3 py-2' 
        : 'px-4 py-3',
    
    // Text sizes
    textPrimary: isMobile ? 'text-xs' : isTablet ? 'text-sm' : 'text-base',
    textSecondary: isMobile ? 'text-[10px]' : isTablet ? 'text-xs' : 'text-sm',
    textTiny: isMobile ? 'text-[8px]' : isTablet ? 'text-[10px]' : 'text-xs',
    
    // Grid columns for table
    gridCols: isMobile 
      ? orientation === 'portrait' 
        ? 'grid-cols-6' // Fewer columns on mobile portrait
        : 'grid-cols-8' // More columns on mobile landscape
      : isTablet 
        ? 'grid-cols-10'
        : 'grid-cols-12',
    
    // Button sizes
    buttonSize: isMobile ? 'h-8 px-2 text-xs' : isTablet ? 'h-9 px-3 text-sm' : 'h-10 px-4',
    
    // Spacing
    spacing: isMobile ? 'space-y-1 gap-1' : isTablet ? 'space-y-2 gap-2' : 'space-y-3 gap-3',
    
    // Table row padding
    rowPadding: isMobile ? 'px-2 py-1' : isTablet ? 'px-3 py-1.5' : 'px-4 py-2'
  };
};
