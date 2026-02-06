import { PoolClient } from 'pg';
import { query, transaction } from '@/lib/db/connection';
import { Approval, Transaction, TransactionWithDetails } from '@/lib/types/database';
import { createAuditLog } from './audit.service';
import { executeTransfer } from './transfer.service';

interface ApproveTransferParams {
  transactionId: string;
  approverId: string;
  decision: 'APPROVED' | 'REJECTED';
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Get pending approvals for a specific admin
 */
export async function getPendingApprovalsForAdmin(
  adminId: string
): Promise<TransactionWithDetails[]> {
  const result = await query(
    `SELECT 
      t.*,
      a.id as approval_id,
      a.created_at as approval_created_at,
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
      ) as initiator
    FROM "ai-transactions" t
    INNER JOIN "ai-approvals" a ON t.id = a.transaction_id
    LEFT JOIN "ai-accounts" fa ON t.from_account_id = fa.id
    LEFT JOIN "ai-accounts" ta ON t.to_account_id = ta.id
    LEFT JOIN "ai-users" iu ON t.initiated_by = iu.id
    WHERE t.status = 'AWAITING_APPROVAL'
      AND a.status = 'PENDING'
      AND t.initiated_by != $1
    ORDER BY t.created_at ASC`,
    [adminId]
  );

  return result.rows as unknown as TransactionWithDetails[];
}

/**
 * Get all pending approvals (for admin view)
 */
export async function getAllPendingApprovals(): Promise<TransactionWithDetails[]> {
  const result = await query(
    `SELECT 
      t.*,
      a.id as approval_id,
      a.created_at as approval_created_at,
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
      ) as initiator
    FROM "ai-transactions" t
    INNER JOIN "ai-approvals" a ON t.id = a.transaction_id
    LEFT JOIN "ai-accounts" fa ON t.from_account_id = fa.id
    LEFT JOIN "ai-accounts" ta ON t.to_account_id = ta.id
    LEFT JOIN "ai-users" iu ON t.initiated_by = iu.id
    WHERE t.status = 'AWAITING_APPROVAL'
      AND a.status = 'PENDING'
    ORDER BY t.created_at ASC`
  );

  return result.rows as unknown as TransactionWithDetails[];
}

/**
 * Approve or reject a transfer
 */
export async function processApproval(
  params: ApproveTransferParams
): Promise<Transaction> {
  const {
    transactionId,
    approverId,
    decision,
    notes,
    ipAddress,
    userAgent,
  } = params;

  return await transaction(async (client: PoolClient) => {
    // Get transaction details
    const txnResult = await client.query<Transaction>(
      'SELECT * FROM "ai-transactions" WHERE id = $1',
      [transactionId]
    );

    if (txnResult.rows.length === 0) {
      throw new Error('Transaction not found');
    }

    const txn = txnResult.rows[0];

    // Verify transaction requires approval
    if (!txn.requires_approval) {
      throw new Error('Transaction does not require approval');
    }

    // Verify transaction is awaiting approval
    if (txn.status !== 'AWAITING_APPROVAL') {
      throw new Error('Transaction is not awaiting approval');
    }

    // Verify approver is not the initiator
    if (txn.initiated_by === approverId) {
      throw new Error('Cannot approve your own transaction');
    }

    // Update approval record
    await client.query(
      `UPDATE "ai-approvals" 
       SET assigned_to = $1, status = $2, decision = $3, 
           decision_notes = $4, decided_at = CURRENT_TIMESTAMP
       WHERE transaction_id = $5`,
      [approverId, decision, decision, notes || null, transactionId]
    );

    if (decision === 'APPROVED') {
      // Update transaction
      await client.query(
        `UPDATE "ai-transactions" 
         SET status = 'APPROVED', approved_by = $1, approved_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [approverId, transactionId]
      );

      // Create audit log
      await createAuditLog({
        action: 'TRANSFER_APPROVED',
        userId: approverId,
        transactionId,
        details: {
          approved_by: approverId,
          notes,
        },
        ipAddress,
        userAgent,
        client,
      });

      // Execute the transfer
      await executeTransfer(client, transactionId, ipAddress, userAgent);
    } else {
      // Update transaction to rejected
      await client.query(
        `UPDATE "ai-transactions" 
         SET status = 'REJECTED', approved_by = $1, approved_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [approverId, transactionId]
      );

      // Create audit log
      await createAuditLog({
        action: 'TRANSFER_REJECTED',
        userId: approverId,
        transactionId,
        details: {
          rejected_by: approverId,
          notes,
        },
        ipAddress,
        userAgent,
        client,
      });
    }

    // Get updated transaction
    const updatedResult = await client.query<Transaction>(
      'SELECT * FROM "ai-transactions" WHERE id = $1',
      [transactionId]
    );

    return updatedResult.rows[0];
  });
}

/**
 * Get approval by transaction ID
 */
export async function getApprovalByTransactionId(
  transactionId: string
): Promise<Approval | null> {
  const result = await query<Approval>(
    'SELECT * FROM "ai-approvals" WHERE transaction_id = $1',
    [transactionId]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}
