#!/usr/bin/env node

/**
 * Admin Utility Script for Subscription Management
 * 
 * Usage:
 *   node admin-utils.js grant-trial <user-id>
 *   node admin-utils.js toggle-test <user-id> <true|false>
 *   node admin-utils.js check-access <user-id>
 *   node admin-utils.js list-trials
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required');
  process.exit(1);
}

async function login() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      })
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract cookies for session
    const cookies = response.headers.get('set-cookie');
    return cookies;
  } catch (error) {
    console.error('❌ Login error:', error.message);
    process.exit(1);
  }
}

async function grantTrial(userId, sessionCookies) {
  try {
    const response = await fetch(`${BASE_URL}/api/admin/grant-trial`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookies
      },
      body: JSON.stringify({ userId: parseInt(userId) })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅', data.message);
    } else {
      console.error('❌ Error:', data.error);
    }
  } catch (error) {
    console.error('❌ Request error:', error.message);
  }
}

async function toggleTestAccount(userId, isTestAccount, sessionCookies) {
  try {
    const response = await fetch(`${BASE_URL}/api/admin/toggle-test-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookies
      },
      body: JSON.stringify({ 
        userId: parseInt(userId), 
        isTestAccount: isTestAccount === 'true' 
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅', data.message);
    } else {
      console.error('❌ Error:', data.error);
    }
  } catch (error) {
    console.error('❌ Request error:', error.message);
  }
}

async function checkAccess(userId, sessionCookies) {
  try {
    const response = await fetch(`${BASE_URL}/api/admin/user/${userId}/subscription`, {
      method: 'GET',
      headers: {
        'Cookie': sessionCookies
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('\n📊 User Subscription Details:');
      console.log('=====================================');
      console.log('User ID:', data.user.id);
      console.log('Username:', data.user.username);
      console.log('Email:', data.user.email);
      console.log('Subscription Status:', data.user.subscriptionStatus);
      console.log('Subscription Plan:', data.user.subscriptionPlan || 'None');
      console.log('Trial Status:', data.user.trialStatus);
      console.log('Trial Ends:', data.user.trialEndsAt || 'N/A');
      console.log('Test Account:', data.user.isTestAccount);
      console.log('\n🔐 Access Check:');
      console.log('Has Access:', data.accessCheck.hasAccess);
      console.log('Access Type:', data.accessCheck.accessType);
      console.log('Message:', data.accessCheck.message);
      console.log('Days Remaining:', data.accessCheck.daysRemaining || 'N/A');
    } else {
      console.error('❌ Error:', data.error);
    }
  } catch (error) {
    console.error('❌ Request error:', error.message);
  }
}

async function main() {
  const command = process.argv[2];
  const userId = process.argv[3];
  const extraParam = process.argv[4];

  if (!command) {
    console.log('Usage:');
    console.log('  node admin-utils.js grant-trial <user-id>');
    console.log('  node admin-utils.js toggle-test <user-id> <true|false>');
    console.log('  node admin-utils.js check-access <user-id>');
    console.log('\nEnvironment variables required:');
    console.log('  ADMIN_EMAIL - Admin user email');
    console.log('  ADMIN_PASSWORD - Admin user password');
    console.log('  BASE_URL - API base URL (default: http://localhost:5000)');
    process.exit(1);
  }

  console.log('🔐 Logging in as admin...');
  const sessionCookies = await login();
  console.log('✅ Logged in successfully\n');

  switch (command) {
    case 'grant-trial':
      if (!userId) {
        console.error('❌ Error: User ID is required');
        process.exit(1);
      }
      await grantTrial(userId, sessionCookies);
      break;

    case 'toggle-test':
      if (!userId || !extraParam) {
        console.error('❌ Error: User ID and true/false value are required');
        process.exit(1);
      }
      await toggleTestAccount(userId, extraParam, sessionCookies);
      break;

    case 'check-access':
      if (!userId) {
        console.error('❌ Error: User ID is required');
        process.exit(1);
      }
      await checkAccess(userId, sessionCookies);
      break;

    default:
      console.error('❌ Error: Unknown command:', command);
      process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
