import { PoolClient } from 'pg';
import { query } from '@/lib/db/connection';
import { AuditAction, AuditLog, AuditLogWithDetails } from '@/lib/types/database';

interface CreateAuditLogParams {
  action: AuditAction;
  userId?: string;
  transactionId?: string;
  accountId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  client?: PoolClient;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<AuditLog> {
  const {
    action,
    userId,
    transactionId,
    accountId,
    details,
    ipAddress,
    userAgent,
    client,
  } = params;

  const queryText = `INSERT INTO "ai-audit_logs" (action, user_id, transaction_id, account_id, details, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`;
  
  const queryParams = [
    action,
    userId || null,
    transactionId || null,
    accountId || null,
    details ? JSON.stringify(details) : null,
    ipAddress || null,
    userAgent || null,
  ];

  // Use provided client if in transaction, otherwise use global query
  const result = client 
    ? await client.query<AuditLog>(queryText, queryParams)
    : await query<AuditLog>(queryText, queryParams);

  return result.rows[0];
}

/**
 * Get audit logs with filters
 */
export async function getAuditLogs(filters: {
  userId?: string;
  transactionId?: string;
  accountId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<{ logs: AuditLog[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramCount = 1;

  if (filters.userId) {
    conditions.push(`user_id = $${paramCount}`);
    params.push(filters.userId);
    paramCount++;
  }

  if (filters.transactionId) {
    conditions.push(`transaction_id = $${paramCount}`);
    params.push(filters.transactionId);
    paramCount++;
  }

  if (filters.accountId) {
    conditions.push(`account_id = $${paramCount}`);
    params.push(filters.accountId);
    paramCount++;
  }

  if (filters.action) {
    conditions.push(`action = $${paramCount}`);
    params.push(filters.action);
    paramCount++;
  }

  if (filters.startDate) {
    conditions.push(`created_at >= $${paramCount}`);
    params.push(filters.startDate);
    paramCount++;
  }

  if (filters.endDate) {
    conditions.push(`created_at <= $${paramCount}`);
    params.push(filters.endDate);
    paramCount++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM "ai-audit_logs" ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  // Get logs with pagination
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  
  const logsResult = await query<AuditLog>(
    `SELECT * FROM "ai-audit_logs" 
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
    [...params, limit, offset]
  );

  return {
    logs: logsResult.rows,
    total,
  };
}

/**
 * Get audit logs with user, account, and transaction details
 */
export async function getAuditLogsWithDetails(filters: {
  userId?: string;
  initiatorId?: string;
  approverId?: string;
  transactionId?: string;
  accountId?: string;
  action?: AuditAction | AuditAction[];
  startDate?: Date;
  endDate?: Date;
  amountMin?: number;
  amountMax?: number;
  amountExact?: number;
  limit?: number;
  offset?: number;
}): Promise<{ logs: AuditLogWithDetails[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramCount = 1;

  if (filters.userId) {
    conditions.push(`al.user_id = $${paramCount}`);
    params.push(filters.userId);
    paramCount++;
  }

  if (filters.initiatorId) {
    conditions.push(`t.initiated_by = $${paramCount}`);
    params.push(filters.initiatorId);
    paramCount++;
  }

  if (filters.approverId) {
    conditions.push(`t.approved_by = $${paramCount}`);
    params.push(filters.approverId);
    paramCount++;
  }

  if (filters.transactionId) {
    conditions.push(`al.transaction_id = $${paramCount}`);
    params.push(filters.transactionId);
    paramCount++;
  }

  if (filters.accountId) {
    conditions.push(`al.account_id = $${paramCount}`);
    params.push(filters.accountId);
    paramCount++;
  }

  if (filters.action) {
    if (Array.isArray(filters.action)) {
      // Handle multiple actions with IN clause
      const placeholders = filters.action.map((_, index) => `$${paramCount + index}`).join(', ');
      conditions.push(`al.action IN (${placeholders})`);
      filters.action.forEach(action => params.push(action));
      paramCount += filters.action.length;
    } else {
      // Handle single action
      conditions.push(`al.action = $${paramCount}`);
      params.push(filters.action);
      paramCount++;
    }
  }

  if (filters.startDate) {
    conditions.push(`al.created_at >= $${paramCount}`);
    params.push(filters.startDate);
    paramCount++;
  }

  if (filters.endDate) {
    conditions.push(`al.created_at <= $${paramCount}`);
    params.push(filters.endDate);
    paramCount++;
  }

  if (filters.amountExact !== undefined) {
    conditions.push(`t.amount = $${paramCount}`);
    params.push(filters.amountExact);
    paramCount++;
  } else {
    if (filters.amountMin !== undefined) {
      conditions.push(`t.amount >= $${paramCount}`);
      params.push(filters.amountMin);
      paramCount++;
    }
    if (filters.amountMax !== undefined) {
      conditions.push(`t.amount <= $${paramCount}`);
      params.push(filters.amountMax);
      paramCount++;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count 
     FROM "ai-audit_logs" al
     LEFT JOIN "ai-users" u ON al.user_id = u.id
     LEFT JOIN "ai-transactions" t ON al.transaction_id = t.id
     LEFT JOIN "ai-accounts" a ON al.account_id = a.id
     ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  // Get logs with details
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  
  const logsResult = await query(
    `SELECT 
       al.*,
       jsonb_build_object(
         'id', u.id,
         'email', u.email,
         'first_name', u.first_name,
         'last_name', u.last_name,
         'role', u.role
       ) as user,
       jsonb_build_object(
         'id', a.id,
         'account_number', a.account_number,
         'account_name', a.account_name
       ) as account,
       jsonb_build_object(
         'id', t.id,
         'amount', t.amount,
         'status', t.status
       ) as transaction
     FROM "ai-audit_logs" al
     LEFT JOIN "ai-users" u ON al.user_id = u.id
     LEFT JOIN "ai-accounts" a ON al.account_id = a.id
     LEFT JOIN "ai-transactions" t ON al.transaction_id = t.id
     ${whereClause}
     ORDER BY al.created_at DESC
     LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
    [...params, limit, offset]
  );

  return {
    logs: logsResult.rows as unknown as AuditLogWithDetails[],
    total,
  };
}
