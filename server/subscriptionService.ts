import { storage } from './storage';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-07-30.basil",
});

export interface SubscriptionAccess {
  hasAccess: boolean;
  accessType: 'none' | 'trial' | 'subscription' | 'test';
  expiresAt?: Date;
  daysRemaining?: number;
  message: string;
  requiresUpgrade: boolean;
}

export class SubscriptionService {
  
  // Main method to check if user has access to premium features
  static async checkUserAccess(userId: number): Promise<SubscriptionAccess> {
    try {
      const user = await storage.getUser(userId);
      
      if (!user) {
        return {
          hasAccess: false,
          accessType: 'none',
          message: 'User not found',
          requiresUpgrade: true
        };
      }

      // Check if this is a test account (bypass subscription checks)
      if (user.isTestAccount && process.env.NODE_ENV !== 'production') {
        return {
          hasAccess: true,
          accessType: 'test',
          message: 'Test account - full access enabled',
          requiresUpgrade: false
        };
      }

      // Check for active subscription first
      const subscriptionAccess = await this.checkSubscriptionAccess(user);
      if (subscriptionAccess.hasAccess) {
        return subscriptionAccess;
      }

      // Check for active trial
      const trialAccess = this.checkTrialAccess(user);
      if (trialAccess.hasAccess) {
        return trialAccess;
      }

      // No access available
      return {
        hasAccess: false,
        accessType: 'none',
        message: 'No active subscription or trial. Please subscribe to access premium features.',
        requiresUpgrade: true
      };

    } catch (error) {
      console.error('Error checking user access:', error);
      return {
        hasAccess: false,
        accessType: 'none',
        message: 'Error validating access',
        requiresUpgrade: true
      };
    }
  }

  // Check Stripe subscription status
  private static async checkSubscriptionAccess(user: any): Promise<SubscriptionAccess> {
    // Check database subscription status first
    if (!user.subscriptionStatus || user.subscriptionStatus === 'inactive') {
      return {
        hasAccess: false,
        accessType: 'none',
        message: 'No active subscription',
        requiresUpgrade: true
      };
    }

    // If subscription appears active, verify with Stripe
    if (user.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        
        const isActive = subscription.status === 'active' || subscription.status === 'trialing';
        const expiresAt = new Date(subscription.current_period_end * 1000);
        const now = new Date();
        const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (isActive && expiresAt > now) {
          return {
            hasAccess: true,
            accessType: 'subscription',
            expiresAt,
            daysRemaining,
            message: `Active ${user.subscriptionPlan} subscription - ${daysRemaining} days remaining`,
            requiresUpgrade: false
          };
        } else {
          // Subscription expired or inactive - update database
          await this.updateUserSubscriptionStatus(user.id, 'inactive');
          return {
            hasAccess: false,
            accessType: 'none',
            message: 'Subscription expired or inactive',
            requiresUpgrade: true
          };
        }
      } catch (stripeError) {
        console.error('Error verifying Stripe subscription:', stripeError);
        // Fall back to database status if Stripe is unreachable
        if (user.subscriptionEndsAt && new Date(user.subscriptionEndsAt) > new Date()) {
          const daysRemaining = Math.ceil((new Date(user.subscriptionEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return {
            hasAccess: true,
            accessType: 'subscription',
            expiresAt: new Date(user.subscriptionEndsAt),
            daysRemaining,
            message: `Active ${user.subscriptionPlan} subscription - ${daysRemaining} days remaining (offline mode)`,
            requiresUpgrade: false
          };
        }
      }
    }

    return {
      hasAccess: false,
      accessType: 'none',
      message: 'No valid subscription found',
      requiresUpgrade: true
    };
  }

  // Check trial access
  private static checkTrialAccess(user: any): SubscriptionAccess {
    if (!user.trialStatus || user.trialStatus === 'none' || user.trialStatus === 'expired' || user.trialStatus === 'used') {
      return {
        hasAccess: false,
        accessType: 'none',
        message: 'No active trial',
        requiresUpgrade: true
      };
    }

    if (user.trialStatus === 'active' && user.trialEndsAt) {
      const now = new Date();
      const trialEnd = new Date(user.trialEndsAt);
      
      if (trialEnd > now) {
        const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          hasAccess: true,
          accessType: 'trial',
          expiresAt: trialEnd,
          daysRemaining,
          message: `Free trial active - ${daysRemaining} days remaining`,
          requiresUpgrade: false
        };
      } else {
        // Trial expired - update status
        this.expireUserTrial(user.id);
        return {
          hasAccess: false,
          accessType: 'none',
          message: 'Free trial expired',
          requiresUpgrade: true
        };
      }
    }

    return {
      hasAccess: false,
      accessType: 'none',
      message: 'Invalid trial status',
      requiresUpgrade: true
    };
  }

  // Grant 2-week trial to a user
  static async grantTrial(userId: number, grantedByAdminId: number): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user has already used their trial
      if (user.trialStatus === 'used' || user.trialStatus === 'expired') {
        throw new Error('User has already used their trial period');
      }

      // Check if user already has an active subscription
      const accessCheck = await this.checkUserAccess(userId);
      if (accessCheck.accessType === 'subscription') {
        throw new Error('User already has an active subscription');
      }

      const now = new Date();
      const trialEnd = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days from now

      const grantedByUser = await storage.getUser(grantedByAdminId);
      
      await storage.updateUser(userId, {
        trialStatus: 'active',
        trialStartsAt: now,
        trialEndsAt: trialEnd,
        trialGrantedBy: grantedByUser?.username || 'admin',
        trialGrantedAt: now
      });

      console.log(`✅ Trial granted to user ${userId} by admin ${grantedByAdminId}, expires ${trialEnd.toISOString()}`);
      return true;
    } catch (error) {
      console.error('Error granting trial:', error);
      throw error;
    }
  }

  // Update user subscription status
  private static async updateUserSubscriptionStatus(userId: number, status: string): Promise<void> {
    try {
      await storage.updateUser(userId, {
        subscriptionStatus: status,
        ...(status === 'inactive' && { subscriptionEndsAt: null })
      });
    } catch (error) {
      console.error('Error updating subscription status:', error);
    }
  }

  // Expire user trial
  private static async expireUserTrial(userId: number): Promise<void> {
    try {
      await storage.updateUser(userId, {
        trialStatus: 'expired'
      });
    } catch (error) {
      console.error('Error expiring trial:', error);
    }
  }

  // Admin function to toggle test account status
  static async toggleTestAccount(userId: number, isTestAccount: boolean, adminId: number): Promise<boolean> {
    try {
      await storage.updateUser(userId, {
        isTestAccount
      });

      const admin = await storage.getUser(adminId);
      console.log(`🔧 Test account status for user ${userId} set to ${isTestAccount} by admin ${admin?.username || adminId}`);
      return true;
    } catch (error) {
      console.error('Error toggling test account:', error);
      throw error;
    }
  }

  // Check if user has access to specific features
  static async hasFeatureAccess(userId: number, feature: string): Promise<boolean> {
    const access = await this.checkUserAccess(userId);
    
    // Define feature access rules
    const restrictedFeatures = [
      'live-betting-opportunities',
      'arbitrage-alerts', 
      'ev-betting',
      'player-props',
      'real-time-odds',
      'advanced-analytics',
      'export-data',
      'api-access'
    ];

    // Free features that everyone can access
    const freeFeatures = [
      'game-scores',
      'basic-odds-view',
      'account-management'
    ];

    if (freeFeatures.includes(feature)) {
      return true;
    }

    if (restrictedFeatures.includes(feature)) {
      return access.hasAccess;
    }

    // Default to requiring access for unlisted features
    return access.hasAccess;
  }
}
