import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { join } from 'path';
import { query, transaction } from './connection';

/**
 * Initialize database schema
 */
export async function initializeDatabase(): Promise<void> {
  try {
    const schemaPath = join(process.cwd(), 'lib', 'db', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    // Execute the entire schema as one statement
    // PostgreSQL can handle multiple statements in one query
    await query(schema);
    
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

/**
 * Seed database with initial data
 */
export async function seedDatabase(): Promise<void> {
  try {
    await transaction(async (client) => {
      // Check if data already exists
      const userCheck = await client.query('SELECT COUNT(*) FROM "ai-users"');
      if (parseInt(userCheck.rows[0].count) > 0) {
        console.log('Database already seeded, skipping...');
        return;
      }

      // Hash password for all users (password: "password123")
      const passwordHash = await bcrypt.hash('password123', 10);

      // Insert users
      const users = [
        // 2 ADMIN users
        { email: 'admin1@bank.com', first_name: 'Admin', last_name: 'One', role: 'ADMIN' },
        { email: 'admin2@bank.com', first_name: 'Admin', last_name: 'Two', role: 'ADMIN' },
        // 2 CONTROLLER users
        { email: 'controller1@bank.com', first_name: 'Controller', last_name: 'One', role: 'CONTROLLER' },
        { email: 'controller2@bank.com', first_name: 'Controller', last_name: 'Two', role: 'CONTROLLER' },
        // 2 AUDIT users
        { email: 'audit1@bank.com', first_name: 'Audit', last_name: 'One', role: 'AUDIT' },
        { email: 'audit2@bank.com', first_name: 'Audit', last_name: 'Two', role: 'AUDIT' },
        // 2 users with no role
        { email: 'user1@bank.com', first_name: 'User', last_name: 'One', role: 'NONE' },
        { email: 'user2@bank.com', first_name: 'User', last_name: 'Two', role: 'NONE' },
      ];

      for (const user of users) {
        await client.query(
          `INSERT INTO "ai-users" (email, password_hash, first_name, last_name, role) 
           VALUES ($1, $2, $3, $4, $5)`,
          [user.email, passwordHash, user.first_name, user.last_name, user.role]
        );
      }

      console.log('Seeded 8 users');

      // Insert 6 bank accounts
      const accounts = [
        { account_number: 'ACC-001', account_name: 'Corporate Operating Account', balance: 5000000, minimum_balance: 100000 },
        { account_number: 'ACC-002', account_name: 'Reserve Account', balance: 10000000, minimum_balance: 1000000 },
        { account_number: 'ACC-003', account_name: 'Payroll Account', balance: 2500000, minimum_balance: 50000 },
        { account_number: 'ACC-004', account_name: 'Investment Account', balance: 15000000, minimum_balance: 500000 },
        { account_number: 'ACC-005', account_name: 'Treasury Account', balance: 8000000, minimum_balance: 200000 },
        { account_number: 'ACC-006', account_name: 'General Operating Account', balance: 3000000, minimum_balance: 75000 },
      ];

      for (const account of accounts) {
        await client.query(
          `INSERT INTO "ai-accounts" (account_number, account_name, balance, minimum_balance) 
           VALUES ($1, $2, $3, $4)`,
          [account.account_number, account.account_name, account.balance, account.minimum_balance]
        );
      }

      console.log('Seeded 6 bank accounts');
    });

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

/**
 * Reset database (drop all tables and reinitialize)
 */
export async function resetDatabase(): Promise<void> {
  try {
    // Drop all tables
    await query('DROP TABLE IF EXISTS "ai-audit_logs" CASCADE');
    await query('DROP TABLE IF EXISTS "ai-approvals" CASCADE');
    await query('DROP TABLE IF EXISTS "ai-transactions" CASCADE');
    await query('DROP TABLE IF EXISTS "ai-accounts" CASCADE');
    await query('DROP TABLE IF EXISTS "ai-users" CASCADE');
    await query('DROP TYPE IF EXISTS user_role CASCADE');
    await query('DROP TYPE IF EXISTS transaction_status CASCADE');
    await query('DROP TYPE IF EXISTS audit_action CASCADE');
    
    console.log('Database reset completed');
    
    // Reinitialize
    await initializeDatabase();
    await seedDatabase();
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  }
}
