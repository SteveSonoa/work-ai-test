import { query } from '@/lib/db/connection';
import { Transaction, Approval, AuditLog } from '@/lib/types/database';

export interface TransactionWithDetails extends Transaction {
  from_account_number?: string;
  from_account_name?: string;
  to_account_number?: string;
  to_account_name?: string;
  initiated_by_email?: string;
  initiated_by_first_name?: string;
  initiated_by_last_name?: string;
  approved_by_email?: string;
  approved_by_first_name?: string;
  approved_by_last_name?: string;
  approval?: Approval;
}

/**
 * Get transaction by ID with all related details
 */
export async function getTransactionById(
  transactionId: string
): Promise<TransactionWithDetails | null> {
  const result = await query<TransactionWithDetails>(
    `SELECT 
      t.*,
      fa.account_number as from_account_number,
      fa.account_name as from_account_name,
      ta.account_number as to_account_number,
      ta.account_name as to_account_name,
      iu.email as initiated_by_email,
      iu.first_name as initiated_by_first_name,
      iu.last_name as initiated_by_last_name,
      au.email as approved_by_email,
      au.first_name as approved_by_first_name,
      au.last_name as approved_by_last_name
    FROM transactions t
    LEFT JOIN accounts fa ON t.from_account_id = fa.id
    LEFT JOIN accounts ta ON t.to_account_id = ta.id
    LEFT JOIN users iu ON t.initiated_by = iu.id
    LEFT JOIN users au ON t.approved_by = au.id
    WHERE t.id = $1`,
    [transactionId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const transaction = result.rows[0];

  // Get approval details if exists
  if (transaction.requires_approval) {
    const approvalResult = await query<Approval>(
      'SELECT * FROM approvals WHERE transaction_id = $1',
      [transactionId]
    );

    if (approvalResult.rows.length > 0) {
      transaction.approval = approvalResult.rows[0];
    }
  }

  return transaction;
}

/**
 * Get audit logs for a specific transaction
 */
export async function getTransactionAuditLogs(
  transactionId: string
): Promise<AuditLog[]> {
  const result = await query<AuditLog>(
    `SELECT al.*, 
     u.email as user_email,
     u.first_name as user_first_name,
     u.last_name as user_last_name
     FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     WHERE al.transaction_id = $1
     ORDER BY al.created_at ASC`,
    [transactionId]
  );

  return result.rows;
}
