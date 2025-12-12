import * as dotenv from 'dotenv';
import { query } from '../lib/db/connection';

dotenv.config({ path: '.env.local' });

/**
 * Seed database with a full year of sample transactions (2024)
 * Creates at least 3 transactions per day with varied statuses
 */
async function seedYearTransactions() {
  console.log('🌱 Seeding database with year of transactions (2024)...\n');

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

    // Generate transactions for each day of 2024
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');
    
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

        // Determine status with weighted probabilities
        // 70% COMPLETED, 15% FAILED, 10% REJECTED, 5% other states
        const statusRoll = Math.random();
        let status: string;
        let approvalStatus: string | null = null;
        let errorMessage: string | null = null;
        let completedAt: Date | null = null;
        let approvedAt: Date | null = null;

        if (statusRoll < 0.70) {
          // COMPLETED
          status = 'COMPLETED';
          completedAt = new Date(currentDate);
          completedAt.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
        } else if (statusRoll < 0.85) {
          // FAILED
          status = 'FAILED';
          errorMessage = getRandomErrorMessage();
        } else if (statusRoll < 0.95) {
          // REJECTED (only for amounts requiring approval)
          if (requiresApproval) {
            status = 'REJECTED';
            approvalStatus = 'REJECTED';
          } else {
            status = 'COMPLETED';
            completedAt = new Date(currentDate);
            completedAt.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
          }
        } else {
          // Other states (PENDING, AWAITING_APPROVAL, APPROVED)
          const otherStateRoll = Math.random();
          if (otherStateRoll < 0.33) {
            status = 'PENDING';
          } else if (otherStateRoll < 0.66 && requiresApproval) {
            status = 'AWAITING_APPROVAL';
            approvalStatus = 'PENDING';
          } else {
            status = requiresApproval ? 'APPROVED' : 'COMPLETED';
            if (status === 'APPROVED') {
              approvalStatus = 'APPROVED';
              approvedAt = new Date(currentDate);
              approvedAt.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
            } else {
              completedAt = new Date(currentDate);
              completedAt.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
            }
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
          const decidedAt = status === 'REJECTED' || status === 'APPROVED' ? transactionTime : null;
          await query(
            `INSERT INTO approvals 
              (transaction_id, status, decision, decision_notes, decided_at, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              transactionId,
              approvalStatus,
              approvalStatus === 'PENDING' ? null : (approvalStatus === 'APPROVED' ? 'APPROVE' : 'REJECT'),
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

    console.log(`\n\n✅ Successfully seeded ${totalCreated} transactions for 2024!\n`);
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

seedYearTransactions();
