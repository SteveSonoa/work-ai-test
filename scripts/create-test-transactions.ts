import * as dotenv from 'dotenv';
import { query } from '../lib/db/connection';

dotenv.config({ path: '.env.local' });

/**
 * Create test transactions with different statuses for testing the status page
 */
async function createTestTransactions() {
  console.log('Creating test transactions...\n');

  try {
    // Get test accounts
    const accountsResult = await query('SELECT id, account_number FROM "ai-accounts" LIMIT 2');
    const accounts = accountsResult.rows;

    if (accounts.length < 2) {
      console.error('❌ Need at least 2 accounts in database. Run npm run db:seed first.');
      process.exit(1);
    }

    const account1 = accounts[0];
    const account2 = accounts[1];

    // Get test user
    const userResult = await query("SELECT id FROM \"ai-users\" WHERE email = 'controller1@bank.com'");
    const user = userResult.rows[0];

    if (!user) {
      console.error('❌ Need controller1@bank.com user. Run npm run db:seed first.');
      process.exit(1);
    }

    // 1. Create a completed transaction (small amount, no approval needed)
    const completed = await query(
      `INSERT INTO "ai-transactions" 
        (from_account_id, to_account_id, amount, status, initiated_by, requires_approval, description, completed_at)
       VALUES ($1, $2, $3, 'COMPLETED', $4, false, 'Test completed transfer', CURRENT_TIMESTAMP)
       RETURNING id, status, amount`,
      [account1.id, account2.id, 5000, user.id]
    );
    console.log('✅ Created COMPLETED transaction:', completed.rows[0].id);
    console.log(`   Amount: $${completed.rows[0].amount}, Status: ${completed.rows[0].status}`);
    console.log(`   View at: http://localhost:3000/transactions/${completed.rows[0].id}\n`);

    // 2. Create a pending transaction (processing)
    const pending = await query(
      `INSERT INTO "ai-transactions" 
        (from_account_id, to_account_id, amount, status, initiated_by, requires_approval, description)
       VALUES ($1, $2, $3, 'PENDING', $4, false, 'Test pending transfer')
       RETURNING id, status, amount`,
      [account1.id, account2.id, 2500, user.id]
    );
    console.log('✅ Created PENDING transaction:', pending.rows[0].id);
    console.log(`   Amount: $${pending.rows[0].amount}, Status: ${pending.rows[0].status}`);
    console.log(`   View at: http://localhost:3000/transactions/${pending.rows[0].id}\n`);

    // 3. Create a transaction awaiting approval (large amount)
    const awaiting = await query(
      `INSERT INTO "ai-transactions" 
        (from_account_id, to_account_id, amount, status, initiated_by, requires_approval, description)
       VALUES ($1, $2, $3, 'AWAITING_APPROVAL', $4, true, 'Test large transfer requiring approval')
       RETURNING id, status, amount`,
      [account1.id, account2.id, 1500000, user.id]
    );
    
    // Create approval record
    await query(
      `INSERT INTO "ai-approvals" (transaction_id, status) VALUES ($1, 'PENDING')`,
      [awaiting.rows[0].id]
    );
    
    console.log('✅ Created AWAITING_APPROVAL transaction:', awaiting.rows[0].id);
    console.log(`   Amount: $${awaiting.rows[0].amount}, Status: ${awaiting.rows[0].status}`);
    console.log(`   View at: http://localhost:3000/transactions/${awaiting.rows[0].id}\n`);

    // 4. Create a rejected transaction
    const rejected = await query(
      `INSERT INTO "ai-transactions" 
        (from_account_id, to_account_id, amount, status, initiated_by, requires_approval, description)
       VALUES ($1, $2, $3, 'REJECTED', $4, true, 'Test rejected transfer')
       RETURNING id, status, amount`,
      [account1.id, account2.id, 2000000, user.id]
    );
    
    // Create rejection record
    await query(
      `INSERT INTO "ai-approvals" (transaction_id, status, decision, decision_notes, decided_at)
       VALUES ($1, 'REJECTED', 'REJECT', 'Risk assessment failed - amount too high', CURRENT_TIMESTAMP)`,
      [rejected.rows[0].id]
    );
    
    console.log('✅ Created REJECTED transaction:', rejected.rows[0].id);
    console.log(`   Amount: $${rejected.rows[0].amount}, Status: ${rejected.rows[0].status}`);
    console.log(`   View at: http://localhost:3000/transactions/${rejected.rows[0].id}\n`);

    // 5. Create a failed transaction
    const failed = await query(
      `INSERT INTO "ai-transactions" 
        (from_account_id, to_account_id, amount, status, initiated_by, requires_approval, description, error_message)
       VALUES ($1, $2, $3, 'FAILED', $4, false, 'Test failed transfer', 'Insufficient funds after validation')
       RETURNING id, status, amount`,
      [account1.id, account2.id, 7500, user.id]
    );
    
    console.log('✅ Created FAILED transaction:', failed.rows[0].id);
    console.log(`   Amount: $${failed.rows[0].amount}, Status: ${failed.rows[0].status}`);
    console.log(`   View at: http://localhost:3000/transactions/${failed.rows[0].id}\n`);

    // 6. Create an approved transaction (approved but not yet executed)
    const approved = await query(
      `INSERT INTO "ai-transactions" 
        (from_account_id, to_account_id, amount, status, initiated_by, requires_approval, description, approved_at)
       VALUES ($1, $2, $3, 'APPROVED', $4, true, 'Test approved transfer', CURRENT_TIMESTAMP)
       RETURNING id, status, amount`,
      [account1.id, account2.id, 1200000, user.id]
    );
    
    await query(
      `INSERT INTO "ai-approvals" (transaction_id, status, decision, decision_notes, decided_at)
       VALUES ($1, 'APPROVED', 'APPROVE', 'Approved by senior admin', CURRENT_TIMESTAMP)`,
      [approved.rows[0].id]
    );
    
    console.log('✅ Created APPROVED transaction:', approved.rows[0].id);
    console.log(`   Amount: $${approved.rows[0].amount}, Status: ${approved.rows[0].status}`);
    console.log(`   View at: http://localhost:3000/transactions/${approved.rows[0].id}\n`);

    console.log('\n📊 Summary of test transactions:');
    console.log('   1. COMPLETED - Small transfer finished successfully');
    console.log('   2. PENDING - Transfer currently being processed');
    console.log('   3. AWAITING_APPROVAL - Large transfer waiting for admin approval');
    console.log('   4. REJECTED - Transfer was rejected by approver');
    console.log('   5. FAILED - Transfer failed during validation/execution');
    console.log('   6. APPROVED - Transfer approved but not yet executed');
    console.log('\n✅ All test transactions created successfully!');
    console.log('🌐 Visit http://localhost:3000/accounts and click "View Status" on any transaction');

  } catch (error) {
    console.error('❌ Error creating test transactions:', error);
    process.exit(1);
  }

  process.exit(0);
}

createTestTransactions();
