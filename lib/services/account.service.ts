import { query } from '@/lib/db/connection';
import { Account, TransactionWithDetails } from '@/lib/types/database';
import { createAuditLog } from './audit.service';

/**
 * Get all accounts
 */
export async function getAllAccounts(): Promise<Account[]> {
  const result = await query<Account>(
    `SELECT * FROM "ai-accounts" 
     WHERE is_active = true 
     ORDER BY account_name`
  );

  return result.rows;
}

/**
 * Get account by ID
 */
export async function getAccountById(
  accountId: string,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<Account | null> {
  const result = await query<Account>(
    'SELECT * FROM "ai-accounts" WHERE id = $1',
    [accountId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  // Create audit log for viewing account
  if (userId) {
    await createAuditLog({
      action: 'ACCOUNT_VIEWED',
      userId,
      accountId,
      details: {
        account_number: result.rows[0].account_number,
      },
      ipAddress,
      userAgent,
    });
  }

  return result.rows[0];
}

/**
 * Get account by account number
 */
export async function getAccountByNumber(
  accountNumber: string
): Promise<Account | null> {
  const result = await query<Account>(
    'SELECT * FROM "ai-accounts" WHERE account_number = $1',
    [accountNumber]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get account balance
 */
export async function getAccountBalance(accountId: string): Promise<number> {
  const result = await query<{ balance: string }>(
    'SELECT balance FROM "ai-accounts" WHERE id = $1',
    [accountId]
  );

  if (result.rows.length === 0) {
    throw new Error('Account not found');
  }

  return Number(result.rows[0].balance);
}

/**
 * Create a new account
 */
export async function createAccount(
  accountNumber: string,
  accountName: string,
  initialBalance: number = 0,
  minimumBalance: number = 0
): Promise<Account> {
  const result = await query<Account>(
    `INSERT INTO "ai-accounts" (account_number, account_name, balance, minimum_balance)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [accountNumber, accountName, initialBalance, minimumBalance]
  );

  return result.rows[0];
}

/**
 * Update account balance (for testing/admin purposes)
 */
export async function updateAccountBalance(
  accountId: string,
  newBalance: number
): Promise<Account> {
  const result = await query<Account>(
    `UPDATE "ai-accounts" 
     SET balance = $1 
     WHERE id = $2 
     RETURNING *`,
    [newBalance, accountId]
  );

  if (result.rows.length === 0) {
    throw new Error('Account not found');
  }

  return result.rows[0];
}

/**
 * Get account transaction history
 */
export async function getAccountTransactionHistory(
  accountId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ transactions: TransactionWithDetails[]; total: number }> {
  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count 
     FROM "ai-transactions" 
     WHERE from_account_id = $1 OR to_account_id = $1`,
    [accountId]
  );
  const total = parseInt(countResult.rows[0].count);

  // Get transactions
  const result = await query(
    `SELECT 
      t.*,
      CASE 
        WHEN t.from_account_id = $1 THEN 'DEBIT'
        WHEN t.to_account_id = $1 THEN 'CREDIT'
      END as transaction_type,
      jsonb_build_object(
        'id', fa.id,
        'account_number', fa.account_number,
        'account_name', fa.account_name
      ) as from_account,
      jsonb_build_object(
        'id', ta.id,
        'account_number', ta.account_number,
        'account_name', ta.account_name
      ) as to_account,
      jsonb_build_object(
        'id', iu.id,
        'email', iu.email,
        'first_name', iu.first_name,
        'last_name', iu.last_name
      ) as initiator
    FROM "ai-transactions" t
    LEFT JOIN "ai-accounts" fa ON t.from_account_id = fa.id
    LEFT JOIN "ai-accounts" ta ON t.to_account_id = ta.id
    LEFT JOIN "ai-users" iu ON t.initiated_by = iu.id
    WHERE t.from_account_id = $1 OR t.to_account_id = $1
    ORDER BY t.created_at DESC
    LIMIT $2 OFFSET $3`,
    [accountId, limit, offset]
  );

  return {
    transactions: result.rows as unknown as TransactionWithDetails[],
    total,
  };
}
