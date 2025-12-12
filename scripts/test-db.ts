#!/usr/bin/env node

/**
 * Test database connection
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { checkDatabaseHealth, query } from '../lib/db/connection';

async function testConnection() {
  console.log('Testing database connection...\n');
  
  console.log('Environment variables:');
  console.log('  DB_HOST:', process.env.DB_HOST || 'localhost');
  console.log('  DB_PORT:', process.env.DB_PORT || '5432');
  console.log('  DB_NAME:', process.env.DB_NAME || 'banking_system');
  console.log('  DB_USER:', process.env.DB_USER || 'postgres');
  console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'not set');
  console.log('');

  try {
    // Test basic connection
    const health = await checkDatabaseHealth();
    console.log('Database health check:', health);
    
    if (!health.healthy) {
      console.error('\n❌ Database connection failed!');
      console.error('Message:', health.message);
      process.exit(1);
    }

    // Test if tables exist
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('\nTables found:', tablesResult.rows.length);
    tablesResult.rows.forEach((row) => {
      console.log('  -', (row as { table_name: string }).table_name);
    });

    // Test if users exist
    const usersResult = await query('SELECT COUNT(*) as count FROM users');
    console.log('\nUsers count:', usersResult.rows[0].count);

    if (parseInt(usersResult.rows[0].count) === 0) {
      console.log('\n⚠️  No users found. Run: npm run db:seed');
    }

    // Test a user login
    const testUser = await query(`
      SELECT id, email, first_name, last_name, role 
      FROM users 
      WHERE email = 'admin1@bank.com'
      LIMIT 1
    `);

    if (testUser.rows.length > 0) {
      console.log('\nTest user found:', testUser.rows[0].email);
      console.log('  Name:', testUser.rows[0].first_name, testUser.rows[0].last_name);
      console.log('  Role:', testUser.rows[0].role);
    } else {
      console.log('\n⚠️  admin1@bank.com user not found');
    }

    console.log('\n✅ Database connection successful!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

testConnection();
