import * as dotenv from 'dotenv';
import { resolve } from 'path';
import bcrypt from 'bcryptjs';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { query } from '../lib/db/connection';

async function testLogin() {
  console.log('Testing login credentials...\n');

  try {
    // Get user from database
    const result = await query(
      'SELECT id, email, first_name, last_name, role, password_hash, is_active FROM "ai-users" WHERE email = $1',
      ['admin1@bank.com']
    );

    if (result.rows.length === 0) {
      console.error('❌ User admin1@bank.com not found in database');
      process.exit(1);
    }

    const user = result.rows[0];
    console.log('✅ User found:');
    console.log('   Email:', user.email);
    console.log('   Name:', user.first_name, user.last_name);
    console.log('   Role:', user.role);
    console.log('   Active:', user.is_active);
    console.log('   Password hash:', user.password_hash.substring(0, 20) + '...');
    console.log('');

    // Test password
    const testPassword = 'password123';
    const isValid = await bcrypt.compare(testPassword, user.password_hash);

    if (isValid) {
      console.log('✅ Password "password123" is correct!');
      console.log('\nYou can now log in with:');
      console.log('   Email: admin1@bank.com');
      console.log('   Password: password123');
    } else {
      console.log('❌ Password "password123" does not match');
      console.log('\nTrying to create a new hash...');
      
      const newHash = await bcrypt.hash(testPassword, 10);
      console.log('New hash:', newHash.substring(0, 20) + '...');
      
      // Update the password in database
      await query(
        'UPDATE "ai-users" SET password_hash = $1 WHERE email = $2',
        [newHash, 'admin1@bank.com']
      );
      
      console.log('✅ Password updated! You can now log in with:');
      console.log('   Email: admin1@bank.com');
      console.log('   Password: password123');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

testLogin();
