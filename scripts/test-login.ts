#!/usr/bin/env node

/**
 * Test login flow
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function testLogin() {
  console.log('Testing login flow...\n');

  try {
    // Test the session endpoint
    console.log('1. Testing /api/auth/session endpoint...');
    const sessionResponse = await fetch('http://localhost:3000/api/auth/session');
    console.log('   Status:', sessionResponse.status);
    console.log('   Headers:', Object.fromEntries(sessionResponse.headers));
    const sessionText = await sessionResponse.text();
    console.log('   Response body:', sessionText);
    
    try {
      const sessionJson = JSON.parse(sessionText);
      console.log('   Parsed JSON:', JSON.stringify(sessionJson, null, 2));
    } catch (e) {
      console.log('   ❌ Failed to parse JSON:', e);
    }

    // Test the signin page
    console.log('\n2. Testing /auth/signin page...');
    const signinResponse = await fetch('http://localhost:3000/auth/signin');
    console.log('   Status:', signinResponse.status);
    console.log('   Content-Type:', signinResponse.headers.get('content-type'));
    const signinText = await signinResponse.text();
    console.log('   Response length:', signinText.length, 'characters');
    
    // Test the credentials endpoint
    console.log('\n3. Testing login with credentials...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin1@bank.com',
        password: 'password123',
        redirect: false,
        json: true,
      }),
    });
    console.log('   Status:', loginResponse.status);
    const loginText = await loginResponse.text();
    console.log('   Response:', loginText);

    console.log('\n✅ Test complete');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

testLogin();
