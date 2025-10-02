#!/usr/bin/env node

/**
 * Simple Stripe Validation Script
 * Validates Stripe configuration and basic functionality
 */

console.log('🔍 Validating Stripe Integration...\n');

// Check environment variables
const requiredEnvVars = [
  'STRIPE_SECRET_KEY',
  'VITE_STRIPE_PUBLIC_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_BASIC_MONTHLY_PRICE_ID',
  'STRIPE_BASIC_ANNUAL_PRICE_ID',
  'STRIPE_PRO_MONTHLY_PRICE_ID',
  'STRIPE_PRO_ANNUAL_PRICE_ID'
];

console.log('📋 Environment Variables Check:');
console.log('================================');

let allEnvVarsPresent = true;
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value && value !== `your_${varName.toLowerCase()}` && !value.includes('...')) {
    console.log(`✅ ${varName}: Set`);
  } else {
    console.log(`❌ ${varName}: Missing or placeholder`);
    allEnvVarsPresent = false;
  }
});

console.log('\n🔧 Configuration Check:');
console.log('========================');

// Check if Stripe keys are properly formatted
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublicKey = process.env.VITE_STRIPE_PUBLIC_KEY;

if (stripeSecretKey) {
  if (stripeSecretKey.startsWith('sk_live_') || stripeSecretKey.startsWith('sk_test_')) {
    console.log('✅ STRIPE_SECRET_KEY: Valid format');
  } else {
    console.log('❌ STRIPE_SECRET_KEY: Invalid format (should start with sk_live_ or sk_test_)');
    allEnvVarsPresent = false;
  }
} else {
  console.log('❌ STRIPE_SECRET_KEY: Not set');
  allEnvVarsPresent = false;
}

if (stripePublicKey) {
  if (stripePublicKey.startsWith('pk_live_') || stripePublicKey.startsWith('pk_test_')) {
    console.log('✅ VITE_STRIPE_PUBLIC_KEY: Valid format');
  } else {
    console.log('❌ VITE_STRIPE_PUBLIC_KEY: Invalid format (should start with pk_live_ or pk_test_)');
    allEnvVarsPresent = false;
  }
} else {
  console.log('❌ VITE_STRIPE_PUBLIC_KEY: Not set');
  allEnvVarsPresent = false;
}

// Check webhook secret
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (webhookSecret && webhookSecret.startsWith('whsec_')) {
  console.log('✅ STRIPE_WEBHOOK_SECRET: Valid format');
} else {
  console.log('❌ STRIPE_WEBHOOK_SECRET: Invalid format (should start with whsec_)');
  allEnvVarsPresent = false;
}

// Check price IDs
const priceIds = [
  'STRIPE_BASIC_MONTHLY_PRICE_ID',
  'STRIPE_BASIC_ANNUAL_PRICE_ID',
  'STRIPE_PRO_MONTHLY_PRICE_ID',
  'STRIPE_PRO_ANNUAL_PRICE_ID'
];

priceIds.forEach(priceIdVar => {
  const priceId = process.env[priceIdVar];
  if (priceId && priceId.startsWith('price_')) {
    console.log(`✅ ${priceIdVar}: Valid format`);
  } else {
    console.log(`❌ ${priceIdVar}: Invalid format (should start with price_)`);
    allEnvVarsPresent = false;
  }
});

console.log('\n📁 File Structure Check:');
console.log('========================');

const fs = require('fs');
const path = require('path');

// Check if required files exist
const requiredFiles = [
  'server/routes.ts',
  'client/src/pages/Subscribe.tsx',
  'client/src/pages/Success.tsx',
  'package.json'
];

requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}: Exists`);
  } else {
    console.log(`❌ ${file}: Missing`);
    allEnvVarsPresent = false;
  }
});

console.log('\n📊 Summary:');
console.log('===========');

if (allEnvVarsPresent) {
  console.log('🎉 All checks passed! Stripe integration appears to be properly configured.');
  console.log('\nNext steps:');
  console.log('1. Test the payment flow in development');
  console.log('2. Set up webhook endpoint in Stripe dashboard');
  console.log('3. Test with Stripe test cards');
  console.log('4. Deploy to production with live keys');
} else {
  console.log('⚠️  Some issues found. Please fix the problems above before proceeding.');
  console.log('\nCommon fixes:');
  console.log('1. Set missing environment variables');
  console.log('2. Update placeholder values with real Stripe keys');
  console.log('3. Create products and prices in Stripe dashboard');
  console.log('4. Set up webhook endpoint');
}

console.log('\n📚 Documentation:');
console.log('- Stripe Integration Guide: STRIPE_INTEGRATION_README.md');
console.log('- Stripe Dashboard: https://dashboard.stripe.com');
console.log('- Stripe Docs: https://stripe.com/docs');
