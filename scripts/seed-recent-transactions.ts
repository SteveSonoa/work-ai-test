import * as dotenv from 'dotenv';
import { query } from '../lib/db/connection';

dotenv.config({ path: '.env.local' });

/**
 * Seed database with transactions from August 2024 through December 11, 2025
 * Success rate: ~89%, Failure rate: 1%, Rejected rate: 10%
 */
async function seedRecentTransactions() {
  console.log('🌱 Seeding recent transactions (Aug 2024 - Dec 11, 2025)...\n');

  try {
    // Get test accounts
    const accountsResult = await query('SELECT id, account_number FROM accounts');
    const accounts = accountsResult.rows;

    if (accounts.length < 4) {
      console.error('❌ Need at least 4 accounts in database. Run npm run db:seed first.');
      process.exit(1);
    }

    // Get test users
    const usersResult = await query('SELECT id, email FROM users WHERE role IN ($1, $2)', ['CONTROLLER', 'ADMIN']);
    const users = usersResult.rows;

    if (users.length < 2) {
      console.error('❌ Need at least 2 users (CONTROLLER or ADMIN). Run npm run db:seed first.');
      process.exit(1);
    }

    console.log(`Found ${accounts.length} accounts and ${users.length} users\n`);

    // Generate transactions from Aug 1, 2024 to Dec 11, 2025
    const startDate = new Date('2024-08-01');
    const endDate = new Date('2025-12-11');
    
    let totalCreated = 0;
    const statusCounts = {
      COMPLETED: 0,
      FAILED: 0,
      REJECTED: 0,
      PENDING: 0,
      AWAITING_APPROVAL: 0,
      APPROVED: 0,
    };

    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      // Create 3-7 transactions per day
      const transactionsPerDay = 3 + Math.floor(Math.random() * 5);
      
      for (let i = 0; i < transactionsPerDay; i++) {
        // Random accounts
        const fromAccount = accounts[Math.floor(Math.random() * accounts.length)];
        let toAccount = accounts[Math.floor(Math.random() * accounts.length)];
        
        // Ensure different accounts
        while (toAccount.id === fromAccount.id && accounts.length > 1) {
          toAccount = accounts[Math.floor(Math.random() * accounts.length)];
        }

        // Random user
        const user = users[Math.floor(Math.random() * users.length)];

        // Random amount between $100 and $50,000
        const amount = (Math.random() * 49900 + 100).toFixed(2);
        const requiresApproval = parseFloat(amount) > 10000;

        // Determine status with specific probabilities
        // 89% COMPLETED, 1% FAILED, 10% REJECTED
        const statusRoll = Math.random() * 100;
        let status: string;
        let approvalStatus: string | null = null;
        let errorMessage: string | null = null;
        let completedAt: Date | null = null;
        const approvedAt: Date | null = null;

        if (statusRoll < 89) {
          // COMPLETED - 89%
          status = 'COMPLETED';
          completedAt = new Date(currentDate);
          completedAt.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
        } else if (statusRoll < 90) {
          // FAILED - 1%
          status = 'FAILED';
          errorMessage = getRandomErrorMessage();
        } else {
          // REJECTED - 10% (only for amounts requiring approval)
          if (requiresApproval) {
            status = 'REJECTED';
            approvalStatus = 'REJECTED';
          } else {
            // If doesn't require approval, make it completed instead
            status = 'COMPLETED';
            completedAt = new Date(currentDate);
            completedAt.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
          }
        }

        // Set transaction timestamp
        const transactionTime = new Date(currentDate);
        transactionTime.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));

        // Insert transaction
        const txResult = await query(
          `INSERT INTO transactions 
            (from_account_id, to_account_id, amount, status, initiated_by, requires_approval, 
             description, error_message, completed_at, approved_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id`,
          [
            fromAccount.id,
            toAccount.id,
            amount,
            status,
            user.id,
            requiresApproval,
            getRandomDescription(),
            errorMessage,
            completedAt,
            approvedAt,
            transactionTime
          ]
        );

        const transactionId = txResult.rows[0].id;

        // Create approval record if needed
        if (approvalStatus) {
          const decidedAt = status === 'REJECTED' ? transactionTime : null;
          await query(
            `INSERT INTO approvals 
              (transaction_id, status, decision, decision_notes, decided_at, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              transactionId,
              approvalStatus,
              approvalStatus === 'REJECTED' ? 'REJECT' : null,
              approvalStatus === 'REJECTED' ? getRandomRejectionReason() : null,
              decidedAt,
              transactionTime
            ]
          );
        }

        statusCounts[status as keyof typeof statusCounts]++;
        totalCreated++;
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      
      // Progress indicator
      if (totalCreated % 100 === 0) {
        process.stdout.write(`\r📊 Created ${totalCreated} transactions...`);
      }
    }

    console.log(`\n\n✅ Successfully seeded ${totalCreated} transactions (Aug 2024 - Dec 11, 2025)!\n`);
    console.log('📈 Status breakdown:');
    console.log(`   COMPLETED: ${statusCounts.COMPLETED} (${((statusCounts.COMPLETED/totalCreated)*100).toFixed(1)}%)`);
    console.log(`   FAILED: ${statusCounts.FAILED} (${((statusCounts.FAILED/totalCreated)*100).toFixed(1)}%)`);
    console.log(`   REJECTED: ${statusCounts.REJECTED} (${((statusCounts.REJECTED/totalCreated)*100).toFixed(1)}%)`);
    console.log(`   PENDING: ${statusCounts.PENDING} (${((statusCounts.PENDING/totalCreated)*100).toFixed(1)}%)`);
    console.log(`   AWAITING_APPROVAL: ${statusCounts.AWAITING_APPROVAL} (${((statusCounts.AWAITING_APPROVAL/totalCreated)*100).toFixed(1)}%)`);
    console.log(`   APPROVED: ${statusCounts.APPROVED} (${((statusCounts.APPROVED/totalCreated)*100).toFixed(1)}%)`);
    console.log('\n🌐 View transactions at: http://localhost:3000/transactions');
    console.log('📊 View dashboard charts at: http://localhost:3000/dashboard');

  } catch (error) {
    console.error('❌ Error seeding transactions:', error);
    process.exit(1);
  }

  process.exit(0);
}

function getRandomDescription(): string {
  const descriptions = [
    'Wire transfer for services',
    'Payment for invoice',
    'Monthly payroll transfer',
    'Vendor payment',
    'Supplier payment',
    'Equipment purchase',
    'Office supplies',
    'Consulting fees',
    'Software subscription',
    'Marketing expenses',
    'Travel reimbursement',
    'Contract payment',
    'Utility bill payment',
    'Insurance premium',
    'Rent payment',
    'Loan payment',
    'Tax payment',
    'Legal fees',
    'Accounting services',
    'IT services',
    'Professional development',
    'Employee benefits',
    'Research and development',
    'Maintenance services',
    'Client refund',
  ];
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

function getRandomErrorMessage(): string {
  const errors = [
    'Insufficient funds after validation',
    'Account temporarily locked',
    'Daily transfer limit exceeded',
    'Invalid account number',
    'Network timeout during transfer',
    'Duplicate transaction detected',
    'Account not authorized for transfers',
    'System maintenance in progress',
  ];
  return errors[Math.floor(Math.random() * errors.length)];
}

function getRandomRejectionReason(): string {
  const reasons = [
    'Amount exceeds authorized limit',
    'Risk assessment flagged this transaction',
    'Insufficient documentation provided',
    'Unverified recipient account',
    'Compliance review required',
    'Budget allocation not approved',
    'Duplicate payment request',
    'Account on watchlist',
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
}

seedRecentTransactions();
