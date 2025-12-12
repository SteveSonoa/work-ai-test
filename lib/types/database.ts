// Database types based on schema
export type UserRole = 'CONTROLLER' | 'AUDIT' | 'ADMIN' | 'NONE';

export type TransactionStatus = 
  | 'PENDING' 
  | 'AWAITING_APPROVAL' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'COMPLETED' 
  | 'FAILED';

export type AuditAction =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'TRANSFER_INITIATED'
  | 'TRANSFER_VALIDATED'
  | 'TRANSFER_AWAITING_APPROVAL'
  | 'TRANSFER_APPROVED'
  | 'TRANSFER_REJECTED'
  | 'TRANSFER_COMPLETED'
  | 'TRANSFER_FAILED'
  | 'BALANCE_CHECKED'
  | 'USER_ROLE_CHANGED'
  | 'ACCOUNT_VIEWED'
  | 'AUDIT_LOG_VIEWED';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Account {
  id: string;
  account_number: string;
  account_name: string;
  balance: number;
  minimum_balance: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Transaction {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  status: TransactionStatus;
  initiated_by: string;
  approved_by?: string;
  approved_at?: Date;
  requires_approval: boolean;
  description?: string;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
}

export interface Approval {
  id: string;
  transaction_id: string;
  assigned_to?: string;
  status: string;
  decision?: string;
  decision_notes?: string;
  decided_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  user_id?: string;
  transaction_id?: string;
  account_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

// DTOs and extended types
export type UserWithoutPassword = Omit<User, 'password_hash'>;

export interface TransactionWithDetails extends Transaction {
  from_account?: Account;
  to_account?: Account;
  initiator?: UserWithoutPassword;
  approver?: UserWithoutPassword;
  approval?: Approval;
}

export interface DashboardStats {
  total_transactions: number;
  pending_approvals: number;
  completed_today: number;
  total_volume_today: number;
  failed_transactions: number;
  active_accounts: number;
}

export interface AuditLogWithDetails extends AuditLog {
  user?: UserWithoutPassword;
  account?: Account;
  transaction?: Transaction;
}
