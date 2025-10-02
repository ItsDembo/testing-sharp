
# Subscription Gate System Implementation

## Overview

This document describes the comprehensive subscription gate system implemented to restrict access to premium features until users subscribe via Stripe. The system includes demo mode restrictions, trial period management, and admin controls for testing.

## Key Features

### 1. **Subscription Validation Service** (`server/subscriptionService.ts`)
- Real-time Stripe subscription verification
- Trial period management (2-week manual grants)
- Test account bypass for development
- Feature-specific access control

### 2. **Subscription Middleware** (`server/middleware/subscriptionMiddleware.ts`)
- Route-level subscription enforcement
- Feature-specific access checks
- Admin-only action protection
- Demo mode handling

### 3. **Database Schema Updates** (`shared/schema.ts`)
- Trial period tracking fields
- Test account flags
- Subscription status management

### 4. **Frontend Components**
- Subscription gate component (`client/src/components/ui/subscription-gate.tsx`)
- Subscription status hook (`client/src/hooks/useSubscription.ts`)
- Feature access utilities

## Access Control Logic

### User Access Types

1. **Demo Mode** (`demo`)
   - Limited access to demo data only
   - Cannot access real betting opportunities
   - Prompts to sign up and subscribe

2. **No Access** (`none`)
   - Registered users without subscription or trial
   - Access to basic features only (scores, basic odds view)
   - Requires subscription for premium features

3. **Trial Access** (`trial`)
   - 2-week trial period (manually granted by admin)
   - Full access to all features
   - Expires automatically after 14 days

4. **Subscription Access** (`subscription`)
   - Full access to all features
   - Validated against Stripe subscription status
   - Automatically updated via webhooks

5. **Test Account** (`test`)
   - Bypasses all subscription checks in non-production
   - For development and testing purposes only
   - Controlled by admin toggle

### Protected Features

The following features require subscription access:

- `live-betting-opportunities` - Real-time betting opportunities
- `arbitrage-alerts` - Arbitrage betting alerts
- `ev-betting` - Expected value betting opportunities
- `player-props` - Player proposition bets
- `real-time-odds` - Live odds updates
- `advanced-analytics` - Advanced analytics and stats
- `export-data` - Data export functionality
- `api-access` - Programmatic API access

### Free Features

These features are available to all users:

- `game-scores` - Basic game scores
- `basic-odds-view` - Basic odds viewing
- `account-management` - Account settings

## API Endpoints

### Protected Routes (Require Subscription)

```
GET /api/betting/live-opportunities       - Live betting opportunities
GET /api/betting/upcoming-opportunities   - Upcoming betting opportunities  
GET /api/betting/player-props            - Player props
GET /api/betting/terminal-stats          - Terminal statistics
GET /api/betting/trading-math-analysis   - Trading analysis
```

### Admin Routes (Admin Only)

```
POST /api/admin/grant-trial               - Grant 2-week trial to user
POST /api/admin/toggle-test-account       - Toggle test account status
GET  /api/admin/user/:userId/subscription - Get user subscription details
```

### User Routes

```
GET /api/user/access-status              - Get current user's access status
GET /api/auth/me                        - User profile with subscription info
```

## Implementation Guide

### 1. Database Migration

Run the migration script to add required fields:

```sql
-- See migrations/add-subscription-fields.sql
ALTER TABLE users ADD COLUMN trial_status TEXT DEFAULT 'none';
ALTER TABLE users ADD COLUMN trial_starts_at TIMESTAMP;
ALTER TABLE users ADD COLUMN trial_ends_at TIMESTAMP;
ALTER TABLE users ADD COLUMN trial_granted_by TEXT;
ALTER TABLE users ADD COLUMN trial_granted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN is_test_account BOOLEAN DEFAULT FALSE;
```

### 2. Environment Variables

Add admin emails to environment variables:

```env
ADMIN_EMAILS=admin@yourcompany.com,admin2@yourcompany.com
```

### 3. Frontend Integration

Use the subscription gate component to protect features:

```tsx
import { SubscriptionGate } from './components/ui/subscription-gate';

function PremiumFeature() {
  return (
    <SubscriptionGate feature="live-betting-opportunities">
      <LiveBettingOpportunities />
    </SubscriptionGate>
  );
}
```

Use the subscription hook for conditional rendering:

```tsx
import { useSubscription } from './hooks/useSubscription';

function Header() {
  const { hasFeatureAccess, accessType } = useSubscription();
  
  return (
    <div>
      {hasFeatureAccess('advanced-analytics') && (
        <AnalyticsButton />
      )}
      {accessType === 'trial' && (
        <TrialExpirationWarning />
      )}
    </div>
  );
}
```

## Admin Management

### Using Admin Utility Script

```bash
# Grant trial to user
node admin-utils.js grant-trial 123

# Toggle test account
node admin-utils.js toggle-test 123 true

# Check access status
node admin-utils.js check-access 123
```

### Environment Variables for Admin Script

```env
ADMIN_EMAIL=your-admin-email@company.com
ADMIN_PASSWORD=your-admin-password
BASE_URL=https://your-api-domain.com
```

## Testing Configuration

### Test Account Setup

1. Set user as test account via admin endpoint
2. Test account bypasses subscription checks in non-production
3. Automatically disabled in production environment

### Demo Mode Testing

1. Demo mode users see subscription prompts
2. No access to real data or premium features
3. Clear upgrade paths provided

## Security Considerations

### Subscription Verification

- Real-time Stripe verification for active routes
- Fallback to database for offline scenarios
- Automatic status updates via webhooks

### Admin Controls

- Admin access restricted by email whitelist
- All admin actions logged with timestamps
- Trial grants tracked with granting admin info

### Demo Mode Restrictions

- Demo users cannot access real betting data
- Clear separation between demo and production data
- No subscription bypass in demo mode

## Monitoring and Logging

### Key Metrics to Track

- Trial conversion rates
- Feature access attempts by subscription status
- Demo mode usage patterns
- Subscription verification failures

### Logging

All subscription-related actions are logged:
- Trial grants and expirations
- Subscription status changes
- Access denied events
- Admin actions

## Troubleshooting

### Common Issues

1. **Subscription Status Not Updating**
   - Check Stripe webhook configuration
   - Verify webhook secret in environment
   - Check webhook endpoint logs

2. **Trial Not Working**
   - Verify trial dates in database
   - Check admin permissions
   - Ensure user hasn't already used trial

3. **Test Account Not Bypassing**
   - Confirm environment is not production
   - Check `is_test_account` flag in database
   - Verify admin toggle worked

### Debug Endpoints

Use these endpoints to debug subscription issues:

```
GET /api/user/access-status              - Current user access
GET /api/admin/user/:id/subscription     - Full user subscription details
```

## Future Enhancements

### Planned Features

1. **Automated Trial Signup** - Allow users to start trials without admin intervention
2. **Usage Analytics** - Track feature usage by subscription type  
3. **Tiered Subscriptions** - Different feature sets for different plans
4. **Grace Period** - Temporary access after subscription expiration
5. **Referral Trials** - Extended trials for referrals

### API Improvements

1. **Rate Limiting** - Different limits for different subscription tiers
2. **Feature Flags** - Dynamic feature enabling/disabling
3. **Subscription Webhooks** - Real-time subscription status updates
4. **Billing Integration** - Usage-based billing for API calls

## Conclusion

This subscription gate system provides comprehensive access control while maintaining flexibility for testing and trial management. The system is designed to be:

- **Secure** - Multiple verification layers
- **Flexible** - Easy admin controls and testing options  
- **User-Friendly** - Clear upgrade prompts and messaging
- **Maintainable** - Well-documented and modular design

For questions or support, contact the development team or refer to the individual component documentation.
