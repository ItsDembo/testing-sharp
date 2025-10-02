#!/usr/bin/env node

/**
 * Stripe Integration Test Script
 * Tests the complete Stripe payment flow for Sharp Shot
 */

import Stripe from 'stripe';

// Test configuration
const TEST_CONFIG = {
  // Use test keys for validation
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_...',
  STRIPE_PUBLIC_KEY: process.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_...',
  WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_...',
  
  // Test price IDs (replace with your actual test price IDs)
  BASIC_MONTHLY_PRICE_ID: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID || 'price_test_basic_monthly',
  BASIC_ANNUAL_PRICE_ID: process.env.STRIPE_BASIC_ANNUAL_PRICE_ID || 'price_test_basic_annual',
  PRO_MONTHLY_PRICE_ID: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_test_pro_monthly',
  PRO_ANNUAL_PRICE_ID: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || 'price_test_pro_annual',
};

class StripeIntegrationTester {
  constructor() {
    this.stripe = new Stripe(TEST_CONFIG.STRIPE_SECRET_KEY, {
      apiVersion: '2025-07-30.basil',
    });
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🚀 Starting Stripe Integration Tests...\n');
    
    try {
      await this.testStripeConnection();
      await this.testPriceConfiguration();
      await this.testCheckoutSessionCreation();
      await this.testWebhookHandling();
      await this.testCustomerManagement();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async testStripeConnection() {
    console.log('🔌 Testing Stripe Connection...');
    
    try {
      const account = await this.stripe.accounts.retrieve();
      this.addResult('Stripe Connection', true, `Connected to account: ${account.id}`);
    } catch (error) {
      this.addResult('Stripe Connection', false, `Failed to connect: ${error.message}`);
    }
  }

  async testPriceConfiguration() {
    console.log('💰 Testing Price Configuration...');
    
    const priceIds = [
      TEST_CONFIG.BASIC_MONTHLY_PRICE_ID,
      TEST_CONFIG.BASIC_ANNUAL_PRICE_ID,
      TEST_CONFIG.PRO_MONTHLY_PRICE_ID,
      TEST_CONFIG.PRO_ANNUAL_PRICE_ID,
    ];

    for (const priceId of priceIds) {
      try {
        const price = await this.stripe.prices.retrieve(priceId);
        this.addResult(`Price ${priceId}`, true, `Active: $${price.unit_amount / 100} ${price.currency.toUpperCase()}`);
      } catch (error) {
        this.addResult(`Price ${priceId}`, false, `Invalid price ID: ${error.message}`);
      }
    }
  }

  async testCheckoutSessionCreation() {
    console.log('🛒 Testing Checkout Session Creation...');
    
    try {
      const session = await this.stripe.checkout.sessions.create({
        ui_mode: 'embedded',
        line_items: [{
          price: TEST_CONFIG.BASIC_MONTHLY_PRICE_ID,
          quantity: 1,
        }],
        mode: 'subscription',
        return_url: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
        metadata: {
          userId: '123',
          planType: 'basic',
          period: 'monthly',
        },
      });

      this.addResult('Checkout Session Creation', true, `Session created: ${session.id}`);
    } catch (error) {
      this.addResult('Checkout Session Creation', false, `Failed: ${error.message}`);
    }
  }

  async testWebhookHandling() {
    console.log('🔗 Testing Webhook Configuration...');
    
    try {
      // Test webhook signature verification
      const testPayload = JSON.stringify({
        id: 'evt_test_webhook',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_session',
            customer: 'cus_test_customer',
            subscription: 'sub_test_subscription',
            amount_total: 999,
            currency: 'usd',
            metadata: {
              userId: '123',
              planType: 'basic',
              period: 'monthly',
            },
          },
        },
      });

      const signature = this.stripe.webhooks.generateTestHeaderString({
        payload: testPayload,
        secret: TEST_CONFIG.WEBHOOK_SECRET,
      });

      const event = this.stripe.webhooks.constructEvent(
        testPayload,
        signature,
        TEST_CONFIG.WEBHOOK_SECRET
      );

      this.addResult('Webhook Signature Verification', true, `Event type: ${event.type}`);
    } catch (error) {
      this.addResult('Webhook Signature Verification', false, `Failed: ${error.message}`);
    }
  }

  async testCustomerManagement() {
    console.log('👤 Testing Customer Management...');
    
    try {
      const customer = await this.stripe.customers.create({
        email: 'test@sharpshot.com',
        metadata: {
          userId: '123',
        },
      });

      this.addResult('Customer Creation', true, `Customer created: ${customer.id}`);

      // Clean up test customer
      await this.stripe.customers.del(customer.id);
      this.addResult('Customer Cleanup', true, 'Test customer deleted');
    } catch (error) {
      this.addResult('Customer Management', false, `Failed: ${error.message}`);
    }
  }

  addResult(testName, success, message) {
    this.testResults.push({
      test: testName,
      success,
      message,
    });
    
    const icon = success ? '✅' : '❌';
    console.log(`  ${icon} ${testName}: ${message}`);
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const passed = this.testResults.filter(r => r.success).length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (passed === total) {
      console.log('\n🎉 All tests passed! Stripe integration is ready.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the issues above.');
    }
  }
}

// Environment validation
function validateEnvironment() {
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'VITE_STRIPE_PUBLIC_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`  - ${varName}`));
    console.error('\nPlease set these variables before running the test.');
    process.exit(1);
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  validateEnvironment();
  
  const tester = new StripeIntegrationTester();
  tester.runAllTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

export default StripeIntegrationTester;
