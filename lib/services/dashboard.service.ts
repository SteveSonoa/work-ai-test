import { query } from '@/lib/db/connection';
import { DashboardStats, TransactionWithDetails } from '@/lib/types/database';

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  // Total transactions
  const totalTransactionsResult = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM transactions'
  );
  const total_transactions = parseInt(totalTransactionsResult.rows[0].count);

  // Pending approvals
  const pendingApprovalsResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count 
     FROM transactions 
     WHERE status = 'AWAITING_APPROVAL'`
  );
  const pending_approvals = parseInt(pendingApprovalsResult.rows[0].count);

  // Completed today
  const completedTodayResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count 
     FROM transactions 
     WHERE status = 'COMPLETED' 
       AND DATE(completed_at) = CURRENT_DATE`
  );
  const completed_today = parseInt(completedTodayResult.rows[0].count);

  // Total volume today
  const volumeTodayResult = await query<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) as total 
     FROM transactions 
     WHERE status = 'COMPLETED' 
       AND DATE(completed_at) = CURRENT_DATE`
  );
  const total_volume_today = Number(volumeTodayResult.rows[0].total);

  // Failed transactions
  const failedTransactionsResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count 
     FROM transactions 
     WHERE status = 'FAILED'`
  );
  const failed_transactions = parseInt(failedTransactionsResult.rows[0].count);

  // Active accounts
  const activeAccountsResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count 
     FROM accounts 
     WHERE is_active = true`
  );
  const active_accounts = parseInt(activeAccountsResult.rows[0].count);

  return {
    total_transactions,
    pending_approvals,
    completed_today,
    total_volume_today,
    failed_transactions,
    active_accounts,
  };
}

/**
 * Get recent transactions
 */
export async function getRecentTransactions(limit: number = 10): Promise<TransactionWithDetails[]> {
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
        'last_name', iu.last_name
      ) as initiator
    FROM transactions t
    LEFT JOIN accounts fa ON t.from_account_id = fa.id
    LEFT JOIN accounts ta ON t.to_account_id = ta.id
    LEFT JOIN users iu ON t.initiated_by = iu.id
    ORDER BY t.created_at DESC
    LIMIT $1`,
    [limit]
  );

  return result.rows as unknown as TransactionWithDetails[];
}

/**
 * Get transaction statistics by status
 */
export async function getTransactionsByStatus(): Promise<Array<{ status: string; count: string; total_amount: string }>> {
  const result = await query(
    `SELECT 
      status,
      COUNT(*) as count,
      COALESCE(SUM(amount), 0) as total_amount
    FROM transactions
    GROUP BY status
    ORDER BY count DESC`
  );

  return result.rows as unknown as Array<{ status: string; count: string; total_amount: string }>;
}

/**
 * Get daily transaction volume for the last N days
 */
export async function getDailyTransactionVolume(days: number = 7): Promise<Array<{ date: string; count: string; total_volume: string }>> {
  const result = await query(
    `SELECT 
      DATE(created_at) as date,
      COUNT(*) as count,
      COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN amount ELSE 0 END), 0) as total_volume
    FROM transactions
    WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
    GROUP BY DATE(created_at)
    ORDER BY date DESC`
  );

  return result.rows as unknown as Array<{ date: string; count: string; total_volume: string }>;
}

/**
 * Get transaction count per day for the specified number of days
 */
export async function getTransactionTrends(days: number): Promise<Array<{ date: string; count: number }>> {
  const result = await query<{ date: string; count: string }>(
    `SELECT 
      DATE(created_at) as date,
      COUNT(*) as count
    FROM transactions
    WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC`
  );

  return result.rows.map(row => ({
    date: row.date,
    count: parseInt(row.count),
  }));
}

/**
 * Get transaction volume per day for the specified number of days
 */
export async function getVolumeTrends(days: number): Promise<Array<{ date: string; volume: number }>> {
  const result = await query<{ date: string; volume: string }>(
    `SELECT 
      DATE(created_at) as date,
      COALESCE(SUM(amount), 0) as volume
    FROM transactions
    WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      AND status = 'COMPLETED'
    GROUP BY DATE(created_at)
    ORDER BY date ASC`
  );

  return result.rows.map(row => ({
    date: row.date,
    volume: Number(row.volume),
  }));
}

/**
 * Get transaction status breakdown for the specified number of days
 */
export async function getStatusBreakdown(days: number): Promise<Array<{ name: string; value: number }>> {
  const result = await query<{ status: string; count: string }>(
    `SELECT 
      CASE 
        WHEN status = 'COMPLETED' THEN 'Success'
        WHEN status IN ('PENDING', 'AWAITING_APPROVAL', 'APPROVED') THEN 'In Progress'
        WHEN status IN ('FAILED', 'REJECTED') THEN 'Failed'
        ELSE 'Other'
      END as status,
      COUNT(*) as count
    FROM transactions
    WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
    GROUP BY 
      CASE 
        WHEN status = 'COMPLETED' THEN 'Success'
        WHEN status IN ('PENDING', 'AWAITING_APPROVAL', 'APPROVED') THEN 'In Progress'
        WHEN status IN ('FAILED', 'REJECTED') THEN 'Failed'
        ELSE 'Other'
      END`
  );

  return result.rows.map(row => ({
    name: row.status,
    value: parseInt(row.count),
  }));
}
