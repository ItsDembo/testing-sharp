import { Request, Response, NextFunction } from 'express';
import { SubscriptionService } from '../subscriptionService';

// Extend Express Request type to include user info
declare global {
  namespace Express {
    interface Request {
      userId?: number;
      subscriptionAccess?: any;
      demoMode?: boolean;
    }
  }
}

// Middleware to check subscription access for protected routes
export const requireSubscription = (feature?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip subscription check in demo mode for now (will be restricted later)
      if (req.demoMode) {
        // In demo mode, users should see limited demo data, not real features
        req.subscriptionAccess = {
          hasAccess: false,
          accessType: 'demo',
          message: 'Demo mode - subscribe for full access',
          requiresUpgrade: true,
          isDemoMode: true
        };
        return next();
      }

      // Check if user is authenticated
      if (!req.userId) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
          message: 'Please log in to access this feature'
        });
      }

      // Check subscription access
      const accessCheck = await SubscriptionService.checkUserAccess(req.userId);
      req.subscriptionAccess = accessCheck;

      // If checking specific feature access
      if (feature) {
        const hasFeatureAccess = await SubscriptionService.hasFeatureAccess(req.userId, feature);
        if (!hasFeatureAccess) {
          return res.status(403).json({
            error: 'Subscription required',
            code: 'SUBSCRIPTION_REQUIRED',
            message: accessCheck.message,
            accessType: accessCheck.accessType,
            expiresAt: accessCheck.expiresAt,
            daysRemaining: accessCheck.daysRemaining,
            feature: feature
          });
        }
      } else {
        // General subscription check
        if (!accessCheck.hasAccess) {
          return res.status(403).json({
            error: 'Subscription required',
            code: 'SUBSCRIPTION_REQUIRED',
            message: accessCheck.message,
            accessType: accessCheck.accessType,
            requiresUpgrade: accessCheck.requiresUpgrade
          });
        }
      }

      next();
    } catch (error) {
      console.error('Subscription middleware error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: 'Error checking subscription status'
      });
    }
  };
};

// Middleware to check if user can access premium features (allows trial users)
export const requirePremiumAccess = (feature?: string) => {
  return requireSubscription(feature);
};

// Middleware to check if user has full subscription (no trial users)
export const requireFullSubscription = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.demoMode) {
        return res.status(403).json({
          error: 'Full subscription required',
          code: 'FULL_SUBSCRIPTION_REQUIRED',
          message: 'This feature requires a paid subscription',
          isDemoMode: true
        });
      }

      if (!req.userId) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const accessCheck = await SubscriptionService.checkUserAccess(req.userId);
      
      if (!accessCheck.hasAccess || accessCheck.accessType === 'trial') {
        return res.status(403).json({
          error: 'Full subscription required',
          code: 'FULL_SUBSCRIPTION_REQUIRED',
          message: 'This feature requires a paid subscription, not a trial',
          accessType: accessCheck.accessType,
          requiresUpgrade: true
        });
      }

      req.subscriptionAccess = accessCheck;
      next();
    } catch (error) {
      console.error('Full subscription middleware error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

// Middleware for admin-only actions (like granting trials)
export const requireAdmin = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // For now, we'll implement a simple admin check
      // In the future, you might want to add an admin role to the user schema
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',');
      const { storage } = await import('../storage');
      const user = await storage.getUser(req.userId);
      
      if (!user || !adminEmails.includes(user.email || '')) {
        return res.status(403).json({
          error: 'Admin access required',
          code: 'ADMIN_REQUIRED',
          message: 'This action requires administrator privileges'
        });
      }

      next();
    } catch (error) {
      console.error('Admin middleware error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

// Utility middleware to add subscription info to response
export const addSubscriptionInfo = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.userId && !req.demoMode) {
        const accessCheck = await SubscriptionService.checkUserAccess(req.userId);
        req.subscriptionAccess = accessCheck;
      }
      next();
    } catch (error) {
      console.error('Subscription info middleware error:', error);
      next(); // Continue without subscription info
    }
  };
};
