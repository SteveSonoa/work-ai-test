#!/usr/bin/env node

/**
 * Test signin with browser-like request
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function testBrowserLogin() {
  console.log('Testing browser-like login...\n');

  try {
    // Step 1: Visit signin page to get initial cookies
    console.log('1. Visiting signin page...');
    const signinPageResponse = await fetch('http://localhost:3000/auth/signin');
    const cookies = signinPageResponse.headers.get('set-cookie') || '';
    console.log('   Cookies:', cookies.substring(0, 100) + '...');

    // Extract CSRF token from cookies
    const csrfMatch = cookies.match(/next-auth\.csrf-token=([^;]+)/);
    if (!csrfMatch) {
      throw new Error('No CSRF cookie found');
    }
    
    const csrfCookie = csrfMatch[1];
    const csrfToken = decodeURIComponent(csrfCookie.split('%7C')[0]);
    console.log('   CSRF token from cookie:', csrfToken);

    // Step 2: Submit login form
    console.log('\n2. Submitting login form...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies.split(',').map(c => c.split(';')[0].trim()).join('; '),
      },
      body: new URLSearchParams({
        email: 'admin1@bank.com',
        password: 'password123',
        csrfToken: csrfToken,
        callbackUrl: '/dashboard',
      }).toString(),
      redirect: 'manual',
    });

    console.log('   Status:', loginResponse.status);
    console.log('   Location:', loginResponse.headers.get('location'));
    
    const loginCookies = loginResponse.headers.get('set-cookie');
    console.log('   Session cookie:', loginCookies ? (loginCookies.includes('next-auth.session-token') ? '✅ Found' : '❌ Not found') : '❌ No cookies');
    
    const responseText = await loginResponse.text();
    console.log('   Response:', responseText.substring(0, 200));

    console.log('\n✅ Test complete');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

testBrowserLogin();
