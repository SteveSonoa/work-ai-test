import * as dotenv from 'dotenv';
import { query } from '../lib/db/connection';

dotenv.config({ path: '.env.local' });

/**
 * Seed database with audit logs from July 1, 2025 through December 11, 2025
 * Includes all valid audit action types except AUDIT_LOG_VIEWED
 */
async function seedAuditLogs() {
  console.log('🌱 Seeding audit logs (July 1, 2025 - Dec 11, 2025)...\n');

  try {
    // Get test users
    const usersResult = await query('SELECT id, email, first_name, last_name FROM users');
    const users = usersResult.rows;

    if (users.length === 0) {
      console.error('❌ Need users in database. Run npm run db:seed first.');
      process.exit(1);
    }

    // Get test accounts
    const accountsResult = await query('SELECT id, account_number FROM accounts');
    const accounts = accountsResult.rows;

    // Get test transactions
    const transactionsResult = await query(
      'SELECT id, from_account_id, to_account_id, amount, status FROM transactions WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at',
      ['2025-07-01', '2025-12-11']
    );
    const transactions = transactionsResult.rows;

    console.log(`Found ${users.length} users, ${accounts.length} accounts, and ${transactions.length} transactions\n`);

    const auditActions = [
      'USER_LOGIN',
      'USER_LOGOUT',
      'TRANSFER_INITIATED',
      'TRANSFER_VALIDATED',
      'TRANSFER_AWAITING_APPROVAL',
      'TRANSFER_APPROVED',
      'TRANSFER_REJECTED',
      'TRANSFER_COMPLETED',
      'TRANSFER_FAILED',
      'BALANCE_CHECKED',
      'USER_ROLE_CHANGED',
      'ACCOUNT_VIEWED',
    ];

    let totalCreated = 0;
    const actionCounts: Record<string, number> = {};

    // Initialize counts
    auditActions.forEach(action => {
      actionCounts[action] = 0;
    });

    // Generate audit logs from July 1, 2025 to Dec 11, 2025
    const startDate = new Date('2025-07-01');
    const endDate = new Date('2025-12-11');
    
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      // Generate 10-30 audit log entries per day
      const entriesPerDay = Math.floor(Math.random() * 21) + 10;
      
      for (let i = 0; i < entriesPerDay; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        
        // Random time during the day
        const hours = Math.floor(Math.random() * 24);
        const minutes = Math.floor(Math.random() * 60);
        const seconds = Math.floor(Math.random() * 60);
        
        const timestamp = new Date(currentDate);
        timestamp.setHours(hours, minutes, seconds);

        // Select random action type
        const action = auditActions[Math.floor(Math.random() * auditActions.length)];
        
        const details: Record<string, unknown> = {
          timestamp: timestamp.toISOString(),
          ip_address: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          user_agent: Math.random() > 0.5 ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        };

        // Add action-specific details
        switch (action) {
          case 'USER_LOGIN':
          case 'USER_LOGOUT':
            details.session_id = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            break;

          case 'TRANSFER_INITIATED':
          case 'TRANSFER_VALIDATED':
          case 'TRANSFER_AWAITING_APPROVAL':
          case 'TRANSFER_APPROVED':
          case 'TRANSFER_REJECTED':
          case 'TRANSFER_COMPLETED':
          case 'TRANSFER_FAILED':
            if (transactions.length > 0) {
              const transaction = transactions[Math.floor(Math.random() * transactions.length)];
              details.transaction_id = transaction.id;
              details.amount = parseFloat(transaction.amount);
              details.from_account = transaction.from_account_id;
              details.to_account = transaction.to_account_id;
              details.status = transaction.status;
              
              if (action === 'TRANSFER_REJECTED') {
                const reasons = [
                  'Insufficient documentation',
                  'Exceeds daily limit',
                  'Suspicious activity detected',
                  'Invalid recipient account',
                  'Compliance review required',
                ];
                details.rejection_reason = reasons[Math.floor(Math.random() * reasons.length)];
              }
              
              if (action === 'TRANSFER_FAILED') {
                const errors = [
                  'Network timeout',
                  'Bank API unavailable',
                  'Insufficient funds',
                  'Account locked',
                  'Invalid routing number',
                ];
                details.error_message = errors[Math.floor(Math.random() * errors.length)];
              }
            }
            break;

          case 'BALANCE_CHECKED':
            if (accounts.length > 0) {
              const account = accounts[Math.floor(Math.random() * accounts.length)];
              details.account_id = account.id;
              details.account_number = account.account_number;
              details.balance = (Math.random() * 100000 + 1000).toFixed(2);
            }
            break;

          case 'USER_ROLE_CHANGED':
            const targetUser = users[Math.floor(Math.random() * users.length)];
            const roles = ['CONTROLLER', 'AUDIT', 'ADMIN', 'NONE'];
            const oldRole = roles[Math.floor(Math.random() * roles.length)];
            const newRole = roles[Math.floor(Math.random() * roles.length)];
            details.target_user_id = targetUser.id;
            details.target_user_email = targetUser.email;
            details.old_role = oldRole;
            details.new_role = newRole;
            details.changed_by = randomUser.id;
            break;

          case 'ACCOUNT_VIEWED':
            if (accounts.length > 0) {
              const account = accounts[Math.floor(Math.random() * accounts.length)];
              details.account_id = account.id;
              details.account_number = account.account_number;
              details.view_type = Math.random() > 0.5 ? 'summary' : 'detailed';
            }
            break;
        }

        // Insert audit log
        await query(
          `INSERT INTO audit_logs (id, action, user_id, details, created_at)
           VALUES (uuid_generate_v4(), $1, $2, $3, $4)`,
          [action, randomUser.id, JSON.stringify(details), timestamp]
        );

        totalCreated++;
        actionCounts[action]++;
      }
      
      // Progress indicator every 10 days
      if (currentDate.getDate() % 10 === 0) {
        console.log(`Seeded up to ${currentDate.toISOString().split('T')[0]}... (${totalCreated} logs)`);
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`\n✅ Successfully seeded ${totalCreated} audit log entries!\n`);
    console.log('Breakdown by action type:');
    
    // Sort actions by count descending
    const sortedActions = Object.entries(actionCounts)
      .sort((a, b) => b[1] - a[1]);
    
    sortedActions.forEach(([action, count]) => {
      const percentage = ((count / totalCreated) * 100).toFixed(1);
      console.log(`  ${action.padEnd(30)} ${count.toString().padStart(5)} (${percentage}%)`);
    });
    
    console.log('\n🎉 Audit log seeding complete!');
  } catch (error) {
    console.error('❌ Error seeding audit logs:', error);
    throw error;
  }
}

// Run the seeding function
seedAuditLogs()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to seed audit logs:', error);
    process.exit(1);
  });
