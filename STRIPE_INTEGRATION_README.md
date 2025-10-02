# Stripe Integration Guide for Sharp Shot

This guide covers the complete Stripe payment integration implementation for Sharp Shot, including setup, configuration, and testing.

## 🚀 Overview

The Stripe integration provides:
- **Embedded Checkout**: Seamless payment experience within the app
- **Subscription Management**: Monthly and annual plans for Basic and Pro tiers
- **Webhook Handling**: Real-time payment status updates
- **Customer Management**: Stripe customer creation and management
- **Payment Tracking**: Complete payment history and status tracking

## 📋 Prerequisites

1. **Stripe Account**: Create a Stripe account at [stripe.com](https://stripe.com)
2. **API Keys**: Obtain your Stripe API keys from the dashboard
3. **Webhook Endpoint**: Set up webhook endpoint in Stripe dashboard
4. **Price IDs**: Create products and prices in Stripe dashboard

## 🔧 Environment Configuration

### Required Environment Variables

```bash
# Stripe Configuration
VITE_STRIPE_PUBLIC_KEY=pk_live_51S091nDZ0DtgKXtcQLVhYpa5cchrwiqGxCFfkYj1VJtEqA2o3EHBbvvCTDWOSM8Hc4lKJ7OvQHcGow1cmbJGOTg900gcTa3ZsF
STRIPE_SECRET_KEY=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
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Price IDs for subscription plans
STRIPE_BASIC_MONTHLY_PRICE_ID=price_1RlUYu2YbjXvbwuVIiqqqKTX
STRIPE_BASIC_ANNUAL_PRICE_ID=price_1RlUch2YbjXvbwuVMLyoyzBS
STRIPE_PRO_MONTHLY_PRICE_ID=price_1RlUdM2YbjXvbwuVWzG81oEC
STRIPE_PRO_ANNUAL_PRICE_ID=price_1RlUgq2YbjXvbwuV56HRksli
```

### Setting Up Stripe Products and Prices

1. **Create Products**:
   - Basic Plan: $29.99/month, $299.99/year
   - Pro Plan: $99.99/month, $999.99/year

2. **Create Prices**:
   - Set up recurring prices for each product
   - Copy the price IDs to your environment variables

## 🏗️ Implementation Details

### 1. Server-Side Implementation (`server/routes.ts`)

#### Stripe Initialization
```typescript
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-07-30.basil",
});
```

#### Checkout Session Creation
```typescript
app.post("/api/create-checkout-session", requireAuth, async (req: any, res) => {
  const { planType, period } = req.body;
  const userId = req.session.userId;
  
  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    customer: stripeCustomerId,
    line_items: [{
      price: priceId,
      quantity: 1,
    }],
    mode: 'subscription',
    return_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    metadata: {
      userId: userId.toString(),
      planType,
      period,
    },
  });
  
  res.json({ 
    clientSecret: session.client_secret,
    sessionId: session.id 
  });
});
```

#### Webhook Handling
```typescript
app.post('/api/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_SECRET || '');
  
  switch (event.type) {
    case 'checkout.session.completed':
      // Handle successful payment
      break;
    case 'customer.subscription.updated':
      // Handle subscription changes
      break;
    case 'invoice.payment_succeeded':
      // Handle recurring payments
      break;
    case 'invoice.payment_failed':
      // Handle failed payments
      break;
  }
});
```

### 2. Client-Side Implementation (`client/src/pages/Subscribe.tsx`)

#### Stripe Initialization
```typescript
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');
```

#### Embedded Checkout
```typescript
const EmbeddedSubscribeForm = ({ clientSecret, planType, period }) => {
  const checkoutRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (clientSecret && checkoutRef.current) {
      initializeCheckout();
    }
  }, [clientSecret]);

  const initializeCheckout = async () => {
    const stripe = await stripePromise;
    const checkout = await stripe.initEmbeddedCheckout({
      fetchClientSecret: async () => clientSecret
    });
    
    if (checkoutRef.current) {
      checkout.mount(checkoutRef.current);
    }
  };
  
  return <div ref={checkoutRef} id="embedded-checkout" />;
};
```

## 🔗 Webhook Configuration

### 1. Stripe Dashboard Setup

1. Go to **Developers > Webhooks** in your Stripe dashboard
2. Click **Add endpoint**
3. Set URL to: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `payment_intent.succeeded`

### 2. Webhook Secret

1. After creating the webhook, click on it
2. Copy the **Signing secret** (starts with `whsec_`)
3. Add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

## 🧪 Testing

### 1. Run Integration Tests

```bash
# Set test environment variables
export STRIPE_SECRET_KEY=sk_test_...
export VITE_STRIPE_PUBLIC_KEY=pk_test_...
export STRIPE_WEBHOOK_SECRET=whsec_...

# Run the test script
node stripe-integration-test.js
```

### 2. Test Cards

Use these test card numbers in development:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

### 3. Webhook Testing

Use Stripe CLI for local webhook testing:

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## 🚨 Common Issues and Solutions

### 1. Webhook Signature Verification Failed

**Problem**: `Webhook signature verification failed`

**Solution**: 
- Ensure webhook secret is correct
- Make sure webhook endpoint uses `express.raw({type: 'application/json'})`
- Verify webhook URL is accessible from Stripe

### 2. Price ID Not Found

**Problem**: `No such price: price_xxx`

**Solution**:
- Verify price IDs in environment variables
- Ensure prices are created in the correct Stripe account
- Check if prices are active (not archived)

### 3. Customer Creation Failed

**Problem**: `Invalid email address`

**Solution**:
- Validate email format before creating customers
- Ensure email is unique (or handle duplicates gracefully)

### 4. Embedded Checkout Not Loading

**Problem**: Checkout form doesn't appear

**Solution**:
- Verify `VITE_STRIPE_PUBLIC_KEY` is set correctly
- Check browser console for JavaScript errors
- Ensure client secret is valid

## 📊 Monitoring and Analytics

### 1. Stripe Dashboard

Monitor payments, customers, and subscriptions in the Stripe dashboard:
- **Payments**: Track successful and failed payments
- **Customers**: Manage customer data and subscriptions
- **Webhooks**: Monitor webhook delivery and failures

### 2. Application Logs

Key events to log:
- Checkout session creation
- Payment completion
- Subscription status changes
- Webhook processing

### 3. Error Handling

Implement comprehensive error handling:
- Network failures
- Invalid payment methods
- Insufficient funds
- Card declined

## 🔒 Security Considerations

### 1. API Key Security

- **Never expose secret keys** in client-side code
- Use environment variables for all sensitive data
- Rotate keys regularly
- Use different keys for development and production

### 2. Webhook Security

- Always verify webhook signatures
- Use HTTPS for webhook endpoints
- Implement idempotency for webhook handlers
- Log all webhook events for audit trails

### 3. Data Protection

- Encrypt sensitive customer data
- Comply with PCI DSS requirements
- Implement proper access controls
- Regular security audits

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Set production Stripe keys
- [ ] Configure webhook endpoint
- [ ] Test all payment flows
- [ ] Verify webhook handling
- [ ] Set up monitoring and alerts
- [ ] Implement error handling
- [ ] Test with real payment methods
- [ ] Review security measures

## 📞 Support

For Stripe-related issues:
- **Stripe Documentation**: [stripe.com/docs](https://stripe.com/docs)
- **Stripe Support**: Available through your Stripe dashboard
- **Community**: [Stripe Discord](https://discord.gg/stripe)

For Sharp Shot integration issues:
- Check the application logs
- Review webhook delivery status
- Verify environment variable configuration
- Test with Stripe test cards

---

**Note**: This integration is production-ready but requires proper testing with real payment methods before going live. Always test thoroughly in a staging environment first.
