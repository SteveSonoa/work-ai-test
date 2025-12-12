#!/usr/bin/env node

/**
 * Test complete login flow with form submission
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function testCompleteLogin() {
  console.log('Testing complete login flow...\n');

  try {
    // Step 1: Get CSRF token
    console.log('1. Getting CSRF token...');
    const csrfResponse = await fetch('http://localhost:3000/api/auth/csrf');
    const csrfData = await csrfResponse.json();
    console.log('   CSRF token:', csrfData.csrfToken ? 'received' : 'missing');

    if (!csrfData.csrfToken) {
      throw new Error('No CSRF token received');
    }

    // Step 2: Attempt signin
    console.log('\n2. Attempting signin with credentials...');
    const formData = new URLSearchParams();
    formData.append('email', 'admin1@bank.com');
    formData.append('password', 'password123');
    formData.append('csrfToken', csrfData.csrfToken);
    formData.append('callbackUrl', 'http://localhost:3000/dashboard');
    formData.append('json', 'true');

    const signinResponse = await fetch('http://localhost:3000/api/auth/signin/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      redirect: 'manual', // Don't follow redirects
    });

    console.log('   Status:', signinResponse.status);
    console.log('   Status text:', signinResponse.statusText);
    console.log('   Headers:', JSON.stringify(Object.fromEntries(signinResponse.headers), null, 2));

    const responseText = await signinResponse.text();
    console.log('   Response body:', responseText);

    try {
      const responseJson = JSON.parse(responseText);
      console.log('\n   Parsed response:', JSON.stringify(responseJson, null, 2));
    } catch {
      console.log('\n   ⚠️  Response is not JSON');
    }

    // Check for Set-Cookie headers
    const cookies = signinResponse.headers.get('set-cookie');
    if (cookies) {
      console.log('\n   Cookies set:', cookies.includes('next-auth.session-token') ? '✅ Session cookie found' : '❌ No session cookie');
    }

    console.log('\n✅ Login test complete');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

testCompleteLogin();
