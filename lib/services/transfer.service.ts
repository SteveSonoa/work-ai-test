import { PoolClient } from 'pg';
import { query, transaction } from '@/lib/db/connection';
import { Account, Transaction, TransactionStatus, TransactionWithDetails } from '@/lib/types/database';
import { createAuditLog } from './audit.service';

const APPROVAL_THRESHOLD = 1000000; // $1,000,000

interface InitiateTransferParams {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  initiatedBy: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Check if account has sufficient balance for transfer
 */
export async function checkBalance(
  accountId: string,
  amount: number
): Promise<ValidationResult> {
  const result = await query<Account>(
    'SELECT * FROM accounts WHERE id = $1 AND is_active = true',
    [accountId]
  );

  if (result.rows.length === 0) {
    return { valid: false, error: 'Account not found or inactive' };
  }

  const account = result.rows[0];
  const remainingBalance = Number(account.balance) - amount;

  if (remainingBalance < 0) {
    return { 
      valid: false, 
      error: `Insufficient funds. Current balance: $${account.balance}` 
    };
  }

  if (remainingBalance < Number(account.minimum_balance)) {
    return { 
      valid: false, 
      error: `Transfer would violate minimum balance requirement of $${account.minimum_balance}` 
    };
  }

  return { valid: true };
}

/**
 * Validate transfer request
 */
export async function validateTransfer(
  fromAccountId: string,
  toAccountId: string,
  amount: number
): Promise<ValidationResult> {
  // Check amount is positive
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  // Check accounts are different
  if (fromAccountId === toAccountId) {
    return { valid: false, error: 'Cannot transfer to the same account' };
  }

  // Check from account exists and has sufficient balance
  const balanceCheck = await checkBalance(fromAccountId, amount);
  if (!balanceCheck.valid) {
    return balanceCheck;
  }

  // Check to account exists and is active
  const toAccountResult = await query<Account>(
    'SELECT * FROM accounts WHERE id = $1 AND is_active = true',
    [toAccountId]
  );

  if (toAccountResult.rows.length === 0) {
    return { valid: false, error: 'Destination account not found or inactive' };
  }

  return { valid: true };
}

/**
 * Initiate a transfer
 */
export async function initiateTransfer(
  params: InitiateTransferParams
): Promise<Transaction> {
  const {
    fromAccountId,
    toAccountId,
    amount,
    initiatedBy,
    description,
    ipAddress,
    userAgent,
  } = params;

  return await transaction(async (client: PoolClient) => {
    // Validate transfer
    const validation = await validateTransfer(fromAccountId, toAccountId, amount);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Determine if approval is required
    const requiresApproval = amount > APPROVAL_THRESHOLD;
    const initialStatus: TransactionStatus = requiresApproval 
      ? 'AWAITING_APPROVAL' 
      : 'PENDING';

    // Create transaction record
    const transactionResult = await client.query<Transaction>(
      `INSERT INTO transactions (
        from_account_id, to_account_id, amount, status, 
        initiated_by, requires_approval, description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        fromAccountId,
        toAccountId,
        amount,
        initialStatus,
        initiatedBy,
        requiresApproval,
        description || null,
      ]
    );

    const newTransaction = transactionResult.rows[0];

    // Create audit log for initiation
    await createAuditLog({
      action: 'TRANSFER_INITIATED',
      userId: initiatedBy,
      transactionId: newTransaction.id,
      accountId: fromAccountId,
      details: {
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount,
        requires_approval: requiresApproval,
      },
      ipAddress,
      userAgent,
      client,
    });

    // Log validation
    await createAuditLog({
      action: 'TRANSFER_VALIDATED',
      userId: initiatedBy,
      transactionId: newTransaction.id,
      accountId: fromAccountId,
      details: { validation_passed: true },
      ipAddress,
      userAgent,
      client,
    });

    // If approval required, create approval record
    if (requiresApproval) {
      await client.query(
        `INSERT INTO approvals (transaction_id, status)
         VALUES ($1, 'PENDING')`,
        [newTransaction.id]
      );

      await createAuditLog({
        action: 'TRANSFER_AWAITING_APPROVAL',
        userId: initiatedBy,
        transactionId: newTransaction.id,
        details: { amount, threshold: APPROVAL_THRESHOLD },
        ipAddress,
        userAgent,
        client,
      });
    } else {
      // Execute transfer immediately
      await executeTransfer(client, newTransaction.id, ipAddress, userAgent);
    }

    return newTransaction;
  });
}

/**
 * Execute the actual transfer (move money between accounts)
 */
export async function executeTransfer(
  client: PoolClient,
  transactionId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  // Get transaction details
  const transactionResult = await client.query<Transaction>(
    'SELECT * FROM transactions WHERE id = $1',
    [transactionId]
  );

  if (transactionResult.rows.length === 0) {
    throw new Error('Transaction not found');
  }

  const txn = transactionResult.rows[0];

  try {
    // Deduct from source account
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [txn.amount, txn.from_account_id]
    );

    // Add to destination account
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [txn.amount, txn.to_account_id]
    );

    // Update transaction status
    await client.query(
      `UPDATE transactions 
       SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [transactionId]
    );

    // Create audit log
    await createAuditLog({
      action: 'TRANSFER_COMPLETED',
      userId: txn.initiated_by,
      transactionId: txn.id,
      accountId: txn.from_account_id,
      details: {
        from_account_id: txn.from_account_id,
        to_account_id: txn.to_account_id,
        amount: txn.amount,
      },
      ipAddress,
      userAgent,
      client,
    });
  } catch (error) {
    // Update transaction with error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await client.query(
      `UPDATE transactions 
       SET status = 'FAILED', error_message = $1
       WHERE id = $2`,
      [errorMessage, transactionId]
    );

    await createAuditLog({
      action: 'TRANSFER_FAILED',
      userId: txn.initiated_by,
      transactionId: txn.id,
      details: { error: errorMessage },
      ipAddress,
      userAgent,
      client,
    });

    throw error;
  }
}

/**
 * Get transaction by ID with details
 */
export async function getTransactionById(
  transactionId: string
): Promise<TransactionWithDetails | null> {
  const result = await query(
    `SELECT 
      t.*,
      jsonb_build_object(
        'id', fa.id,
        'account_number', fa.account_number,
        'account_name', fa.account_name,
        'balance', fa.balance
      ) as from_account,
      jsonb_build_object(
        'id', ta.id,
        'account_number', ta.account_number,
        'account_name', ta.account_name,
        'balance', ta.balance
      ) as to_account,
      jsonb_build_object(
        'id', iu.id,
        'email', iu.email,
        'first_name', iu.first_name,
        'last_name', iu.last_name,
        'role', iu.role
      ) as initiator,
      jsonb_build_object(
        'id', au.id,
        'email', au.email,
        'first_name', au.first_name,
        'last_name', au.last_name,
        'role', au.role
      ) as approver,
      a.* as approval
    FROM transactions t
    LEFT JOIN accounts fa ON t.from_account_id = fa.id
    LEFT JOIN accounts ta ON t.to_account_id = ta.id
    LEFT JOIN users iu ON t.initiated_by = iu.id
    LEFT JOIN users au ON t.approved_by = au.id
    LEFT JOIN approvals a ON t.id = a.transaction_id
    WHERE t.id = $1`,
    [transactionId]
  );

  return result.rows.length > 0 ? (result.rows[0] as unknown as TransactionWithDetails) : null;
}

/**
 * Get transactions with filters
 */
export async function getTransactions(filters: {
  accountId?: string;
  initiatedBy?: string;
  status?: TransactionStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<{ transactions: TransactionWithDetails[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramCount = 1;

  if (filters.accountId) {
    conditions.push(`(t.from_account_id = $${paramCount} OR t.to_account_id = $${paramCount})`);
    params.push(filters.accountId);
    paramCount++;
  }

  if (filters.initiatedBy) {
    conditions.push(`t.initiated_by = $${paramCount}`);
    params.push(filters.initiatedBy);
    paramCount++;
  }

  if (filters.status) {
    conditions.push(`t.status = $${paramCount}`);
    params.push(filters.status);
    paramCount++;
  }

  if (filters.startDate) {
    conditions.push(`t.created_at >= $${paramCount}`);
    params.push(filters.startDate);
    paramCount++;
  }

  if (filters.endDate) {
    conditions.push(`t.created_at <= $${paramCount}`);
    params.push(filters.endDate);
    paramCount++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM transactions t ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  // Get transactions
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const result = await query(
    `SELECT 
      t.*,
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
        'last_name', iu.last_name,
        'role', iu.role
      ) as initiator
    FROM transactions t
    LEFT JOIN accounts fa ON t.from_account_id = fa.id
    LEFT JOIN accounts ta ON t.to_account_id = ta.id
    LEFT JOIN users iu ON t.initiated_by = iu.id
    ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
    [...params, limit, offset]
  );

  return {
    transactions: result.rows as unknown as TransactionWithDetails[],
    total,
  };
}
