#!/usr/bin/env node

/**
 * Database initialization script
 * Run this script to set up the database schema and seed initial data
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { initializeDatabase, seedDatabase, resetDatabase } from '../lib/db/seed';
import { closePool } from '../lib/db/connection';

const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case 'init':
        console.log('Initializing database schema...');
        await initializeDatabase();
        console.log('✓ Database schema initialized');
        break;
      
      case 'seed':
        console.log('Seeding database with initial data...');
        await seedDatabase();
        console.log('✓ Database seeded');
        break;
      
      case 'reset':
        console.log('Resetting database (this will delete all data)...');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        
        rl.question('Are you sure you want to reset the database? (yes/no): ', async (answer: string) => {
          if (answer.toLowerCase() === 'yes') {
            await resetDatabase();
            console.log('✓ Database reset complete');
          } else {
            console.log('Reset cancelled');
          }
          rl.close();
          await closePool();
          process.exit(0);
        });
        return; // Don't close pool yet
      
      case 'setup':
        console.log('Setting up database (init + seed)...');
        await initializeDatabase();
        await seedDatabase();
        console.log('✓ Database setup complete');
        break;
      
      default:
        console.log(`
Database Management Script

Usage: npm run db:<command>

Commands:
  init    - Initialize database schema
  seed    - Seed database with initial data
  setup   - Initialize and seed database (init + seed)
  reset   - Reset database (drops all data and reinitializes)

Example:
  npm run db:setup
        `);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    if (command !== 'reset') {
      await closePool();
      process.exit(0);
    }
  }
}

main();
