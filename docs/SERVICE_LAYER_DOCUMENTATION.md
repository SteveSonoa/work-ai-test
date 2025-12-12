# Service Layer Documentation
## Banking Transfer System - Business Logic Reference

---

## Overview

This document details the service layer functions that implement core business logic. These functions are located in `/lib/services/` and handle all business rules, data validation, and database operations.

---

## Table of Contents

1. [Transfer Service](#transfer-service)
2. [Approval Service](#approval-service)
3. [User Service](#user-service)
4. [Audit Service](#audit-service)
5. [Dashboard Service](#dashboard-service)
6. [Account Service](#account-service)

---

## Transfer Service

**Location:** `/lib/services/transfer.service.ts`

### initiateTransfer()

Initiates a new money transfer between accounts with automatic approval logic.

**Function Signature:**
```typescript
async function initiateTransfer(params: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  initiatedBy: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<TransactionWithDetails>
```

**Parameters:**
- `fromAccountId`: UUID of source account
- `toAccountId`: UUID of destination account
- `amount`: Transfer amount (must be positive)
- `initiatedBy`: UUID of user initiating transfer
- `description`: Optional transfer description
- `ipAddress`: User's IP address for audit
- `userAgent`: User's browser user agent for audit

**Business Logic:**

1. **Validation Phase:**
   - Verifies both accounts exist
   - Checks both accounts are active
   - Validates accounts are different
   - Verifies source account has sufficient balance (balance - minimum_balance ≥ amount)

2. **Approval Decision:**
   - If amount > $10,000 → requires_approval = true
   - Otherwise → requires_approval = false

3. **Transaction Creation:**
   - Creates transaction record with status=PENDING
   - Sets requires_approval flag
   - Records initiator, timestamp, description

4. **Conditional Execution:**

   **If NO approval required:**
   - Executes transfer immediately
   - Deducts from source account
   - Adds to destination account
   - Updates status=COMPLETED
   - Sets completed_at timestamp
   - Creates audit logs:
     - TRANSFER_INITIATED
     - TRANSFER_VALIDATED
     - TRANSFER_COMPLETED

   **If approval required:**
   - Updates status=AWAITING_APPROVAL
   - Creates approval record
   - Creates audit logs:
     - TRANSFER_INITIATED
     - TRANSFER_VALIDATED
     - TRANSFER_AWAITING_APPROVAL

**Returns:**
- `TransactionWithDetails` object including account and user information

**Throws:**
- `Error('Account not found')` - If either account doesn't exist
- `Error('Account is inactive')` - If either account is not active
- `Error('Cannot transfer to the same account')` - If from and to are the same
- `Error('Insufficient funds in source account')` - If balance insufficient

**Example Usage:**
```typescript
const transaction = await initiateTransfer({
  fromAccountId: 'acc-uuid-1',
  toAccountId: 'acc-uuid-2',
  amount: 5000.00,
  initiatedBy: 'user-uuid-1',
  description: 'Monthly operational transfer',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...'
});

console.log(transaction.status); // 'COMPLETED' or 'AWAITING_APPROVAL'
console.log(transaction.requires_approval); // true or false
```

---

### getTransactionDetails()

Retrieves comprehensive details about a specific transaction.

**Function Signature:**
```typescript
async function getTransactionDetails(
  transactionId: string
): Promise<TransactionWithDetails | null>
```

**Parameters:**
- `transactionId`: UUID of transaction

**Returns:**
- `TransactionWithDetails` object including:
  - Transaction data
  - From account details
  - To account details
  - Initiator user details
  - Approver user details (if applicable)
  - Approval record (if applicable)
- `null` if transaction not found

**Example Usage:**
```typescript
const transaction = await getTransactionDetails('txn-uuid-123');

if (transaction) {
  console.log(`From: ${transaction.from_account.account_name}`);
  console.log(`To: ${transaction.to_account.account_name}`);
  console.log(`Amount: $${transaction.amount}`);
  console.log(`Status: ${transaction.status}`);
  
  if (transaction.approval) {
    console.log(`Approval Status: ${transaction.approval.status}`);
    console.log(`Decision: ${transaction.approval.decision}`);
  }
}
```

---

## Approval Service

**Location:** `/lib/services/approval.service.ts`

### processApproval()

Processes an approval decision (approve or reject) for a pending transfer.

**Function Signature:**
```typescript
async function processApproval(params: {
  transactionId: string;
  approverId: string;
  decision: 'APPROVED' | 'REJECTED';
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<TransactionWithDetails>
```

**Parameters:**
- `transactionId`: UUID of transaction to approve/reject
- `approverId`: UUID of user making decision (must have ADMIN role)
- `decision`: Either 'APPROVED' or 'REJECTED'
- `notes`: Optional decision notes
- `ipAddress`: User's IP address for audit
- `userAgent`: User's browser user agent for audit

**Business Logic:**

1. **Validation:**
   - Verifies transaction exists
   - Checks transaction status is AWAITING_APPROVAL
   - Validates decision is APPROVED or REJECTED

2. **If APPROVED:**
   - Validates accounts still have sufficient balance
   - Executes transfer (deduct/add balances)
   - Updates transaction:
     - status=COMPLETED
     - approved_by=approverId
     - approved_at=current timestamp
     - completed_at=current timestamp
   - Updates approval record:
     - decision=APPROVED
     - decision_notes=notes
     - decided_at=current timestamp
   - Creates audit logs:
     - TRANSFER_APPROVED
     - TRANSFER_COMPLETED

3. **If REJECTED:**
   - Updates transaction:
     - status=REJECTED
     - approved_by=approverId
     - approved_at=current timestamp
   - Updates approval record:
     - decision=REJECTED
     - decision_notes=notes
     - decided_at=current timestamp
   - Creates audit log:
     - TRANSFER_REJECTED

**Returns:**
- Updated `TransactionWithDetails` object

**Throws:**
- `Error('Transaction not found')` - If transaction doesn't exist
- `Error('Transaction is not awaiting approval')` - If status is not AWAITING_APPROVAL
- `Error('Insufficient funds')` - If approval granted but balance now insufficient
- `Error('Invalid decision')` - If decision is not APPROVED or REJECTED

**Example Usage:**
```typescript
// Approve a transfer
const approvedTxn = await processApproval({
  transactionId: 'txn-uuid-123',
  approverId: 'admin-uuid-1',
  decision: 'APPROVED',
  notes: 'Verified and approved for processing',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...'
});

console.log(approvedTxn.status); // 'COMPLETED'
console.log(approvedTxn.approved_by); // 'admin-uuid-1'

// Reject a transfer
const rejectedTxn = await processApproval({
  transactionId: 'txn-uuid-456',
  approverId: 'admin-uuid-1',
  decision: 'REJECTED',
  notes: 'Exceeds daily limit',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...'
});

console.log(rejectedTxn.status); // 'REJECTED'
```

---

### getPendingApprovals()

Retrieves all transfers awaiting approval decision.

**Function Signature:**
```typescript
async function getPendingApprovals(params?: {
  limit?: number;
  offset?: number;
}): Promise<{
  approvals: Array<ApprovalWithDetails>;
  total: number;
}>
```

**Parameters:**
- `limit`: Maximum number of results (default: 100)
- `offset`: Pagination offset (default: 0)

**Returns:**
- Object containing:
  - `approvals`: Array of pending approvals with transaction and account details
  - `total`: Total count of pending approvals

**Example Usage:**
```typescript
const { approvals, total } = await getPendingApprovals({
  limit: 50,
  offset: 0
});

console.log(`${approvals.length} approvals (${total} total)`);

approvals.forEach(approval => {
  console.log(`Transaction: ${approval.transaction_id}`);
  console.log(`Amount: $${approval.amount}`);
  console.log(`From: ${approval.from_account_name}`);
  console.log(`To: ${approval.to_account_name}`);
  console.log(`Initiated by: ${approval.initiated_by_email}`);
});
```

---

## User Service

**Location:** `/lib/services/user.service.ts`

### Permission Helper Functions

These functions determine what actions a user can perform based on their role.

#### canInitiateTransfers()

```typescript
function canInitiateTransfers(user: { role: UserRole }): boolean
```

**Returns:** `true` if user role is 'CONTROLLER' or 'ADMIN'

**Example:**
```typescript
if (canInitiateTransfers(session.user)) {
  // User can initiate transfers
}
```

---

#### canApproveTransfers()

```typescript
function canApproveTransfers(user: { role: UserRole }): boolean
```

**Returns:** `true` if user role is 'ADMIN'

**Example:**
```typescript
if (canApproveTransfers(session.user)) {
  // User can approve pending transfers
}
```

---

#### canViewAuditLogs()

```typescript
function canViewAuditLogs(user: { role: UserRole }): boolean
```

**Returns:** `true` if user role is 'AUDIT' or 'ADMIN'

**Example:**
```typescript
if (canViewAuditLogs(session.user)) {
  // User can view audit logs
}
```

---

#### canManageUsers()

```typescript
function canManageUsers(user: { role: UserRole }): boolean
```

**Returns:** `true` if user role is 'ADMIN'

**Example:**
```typescript
if (canManageUsers(session.user)) {
  // User can update roles and manage users
}
```

---

### User Management Functions

#### getUserById()

```typescript
async function getUserById(id: string): Promise<UserWithoutPassword | null>
```

**Returns:** User object without password hash, or null if not found

---

#### getUserByEmail()

```typescript
async function getUserByEmail(email: string): Promise<User | null>
```

**Returns:** User object (includes password hash for auth), or null if not found

---

#### getAllUsers()

```typescript
async function getAllUsers(): Promise<UserWithoutPassword[]>
```

**Returns:** Array of all users (without password hashes)

---

#### updateUserRole()

```typescript
async function updateUserRole(
  userId: string,
  newRole: UserRole,
  updatedBy: string,
  ipAddress?: string,
  userAgent?: string
): Promise<UserWithoutPassword>
```

**Parameters:**
- `userId`: UUID of user to update
- `newRole`: New role ('CONTROLLER' | 'AUDIT' | 'ADMIN' | 'NONE')
- `updatedBy`: UUID of user making the change
- `ipAddress`: IP for audit
- `userAgent`: User agent for audit

**Returns:** Updated user object

**Side Effects:**
- Creates USER_ROLE_CHANGED audit log

---

#### verifyPassword()

```typescript
async function verifyPassword(
  email: string,
  password: string
): Promise<UserWithoutPassword | null>
```

**Parameters:**
- `email`: User's email
- `password`: Plain text password to verify

**Returns:** 
- User object (without password) if credentials valid
- `null` if invalid credentials or user inactive

**Used by:** Authentication system during login

---

## Audit Service

**Location:** `/lib/services/audit.service.ts`

### createAuditLog()

Creates a new audit log entry for system activity tracking.

**Function Signature:**
```typescript
async function createAuditLog(params: {
  action: AuditAction;
  userId?: string;
  transactionId?: string;
  accountId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void>
```

**Parameters:**
- `action`: Type of action (see AuditAction enum)
- `userId`: UUID of user performing action (optional for system actions)
- `transactionId`: Related transaction UUID (optional)
- `accountId`: Related account UUID (optional)
- `details`: Additional JSON data (optional)
- `ipAddress`: User's IP address (optional)
- `userAgent`: User's browser user agent (optional)

**AuditAction Types:**
- `USER_LOGIN`
- `USER_LOGOUT`
- `TRANSFER_INITIATED`
- `TRANSFER_VALIDATED`
- `TRANSFER_AWAITING_APPROVAL`
- `TRANSFER_APPROVED`
- `TRANSFER_REJECTED`
- `TRANSFER_COMPLETED`
- `TRANSFER_FAILED`
- `BALANCE_CHECKED`
- `USER_ROLE_CHANGED`
- `ACCOUNT_VIEWED`
- `AUDIT_LOG_VIEWED`

**Example Usage:**
```typescript
// Log a transfer initiation
await createAuditLog({
  action: 'TRANSFER_INITIATED',
  userId: 'user-uuid-1',
  transactionId: 'txn-uuid-123',
  details: {
    from_account: 'acc-uuid-1',
    to_account: 'acc-uuid-2',
    amount: 5000.00
  },
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...'
});

// Log a role change
await createAuditLog({
  action: 'USER_ROLE_CHANGED',
  userId: 'admin-uuid-1',
  details: {
    target_user_id: 'user-uuid-2',
    old_role: 'NONE',
    new_role: 'CONTROLLER'
  },
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...'
});

// Log account viewing
await createAuditLog({
  action: 'ACCOUNT_VIEWED',
  userId: 'user-uuid-1',
  accountId: 'acc-uuid-1',
  details: {
    view_type: 'detailed'
  },
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...'
});
```

**Best Practices:**
- Always include userId for user-initiated actions
- Include relevant resource IDs (transactionId, accountId)
- Store meaningful details in JSON format
- Capture IP and user agent for security tracking

---

### getAuditLogsWithDetails()

Retrieves audit logs with user, account, and transaction details.

**Function Signature:**
```typescript
async function getAuditLogsWithDetails(params?: {
  action?: AuditAction | AuditAction[];
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  logs: AuditLogWithDetails[];
  total: number;
}>
```

**Parameters:**
- `action`: Filter by single action or array of actions
- `userId`: Filter by user ID
- `startDate`: Start date (YYYY-MM-DD format)
- `endDate`: End date (YYYY-MM-DD format)
- `limit`: Maximum results (default: 100)
- `offset`: Pagination offset (default: 0)

**Returns:**
- Object containing:
  - `logs`: Array of audit logs with user, account, transaction details
  - `total`: Total count matching filters

**Example Usage:**
```typescript
// Get all transfer-related logs for a user
const { logs, total } = await getAuditLogsWithDetails({
  action: [
    'TRANSFER_INITIATED',
    'TRANSFER_APPROVED',
    'TRANSFER_COMPLETED'
  ],
  userId: 'user-uuid-1',
  startDate: '2025-12-01',
  endDate: '2025-12-31',
  limit: 50,
  offset: 0
});

logs.forEach(log => {
  console.log(`${log.created_at}: ${log.action}`);
  console.log(`User: ${log.user?.email}`);
  console.log(`Details: ${JSON.stringify(log.details)}`);
});

// Get all audit actions except AUDIT_LOG_VIEWED
const { logs: activityLogs } = await getAuditLogsWithDetails({
  action: [
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
    'ACCOUNT_VIEWED'
  ],
  limit: 100
});
```

---

## Dashboard Service

**Location:** `/lib/services/dashboard.service.ts`

### getDashboardStats()

Retrieves current system-wide statistics for dashboard display.

**Function Signature:**
```typescript
async function getDashboardStats(): Promise<DashboardStats>
```

**Returns:**
```typescript
interface DashboardStats {
  total_transactions: number;    // All-time transaction count
  pending_approvals: number;     // Transactions awaiting approval
  completed_today: number;       // Transactions completed today
  total_volume_today: number;    // Sum of completed transaction amounts today
  failed_transactions: number;   // Count of failed transactions
  active_accounts: number;       // Count of active accounts
}
```

**Example Usage:**
```typescript
const stats = await getDashboardStats();

console.log(`Total Transactions: ${stats.total_transactions}`);
console.log(`Pending Approvals: ${stats.pending_approvals}`);
console.log(`Completed Today: ${stats.completed_today}`);
console.log(`Volume Today: $${stats.total_volume_today.toFixed(2)}`);
console.log(`Failed: ${stats.failed_transactions}`);
console.log(`Active Accounts: ${stats.active_accounts}`);
```

---

### getTransactionTrends()

Gets daily transaction count trends for charts.

**Function Signature:**
```typescript
async function getTransactionTrends(
  days: number
): Promise<Array<{ date: string; count: number }>>
```

**Parameters:**
- `days`: Number of days to look back (7, 28, or 365)

**Returns:** Array of objects with date and transaction count

**Example Usage:**
```typescript
const trends = await getTransactionTrends(28);

trends.forEach(({ date, count }) => {
  console.log(`${date}: ${count} transactions`);
});
```

---

### getVolumeTrends()

Gets daily transaction volume (sum of amounts) for charts.

**Function Signature:**
```typescript
async function getVolumeTrends(
  days: number
): Promise<Array<{ date: string; volume: number }>>
```

**Parameters:**
- `days`: Number of days to look back (7, 28, or 365)

**Returns:** Array of objects with date and total volume

**Example Usage:**
```typescript
const volumes = await getVolumeTrends(28);

volumes.forEach(({ date, volume }) => {
  console.log(`${date}: $${volume.toFixed(2)}`);
});
```

---

### getStatusBreakdown()

Gets transaction count by status for pie chart.

**Function Signature:**
```typescript
async function getStatusBreakdown(
  days: number
): Promise<Array<{ name: string; value: number }>>
```

**Parameters:**
- `days`: Number of days to look back (7, 28, or 365)

**Returns:** Array with three categories:
- `{ name: 'Success', value: count }` - COMPLETED transactions
- `{ name: 'In Progress', value: count }` - PENDING + AWAITING_APPROVAL
- `{ name: 'Failed', value: count }` - FAILED + REJECTED

**Example Usage:**
```typescript
const breakdown = await getStatusBreakdown(7);

breakdown.forEach(({ name, value }) => {
  console.log(`${name}: ${value}`);
});

// Output:
// Success: 145
// In Progress: 3
// Failed: 8
```

---

## Account Service

**Location:** `/lib/services/account.service.ts`

### getAllAccounts()

Retrieves all bank accounts in the system.

**Function Signature:**
```typescript
async function getAllAccounts(): Promise<Account[]>
```

**Returns:** Array of all accounts

**Example Usage:**
```typescript
const accounts = await getAllAccounts();

accounts.forEach(account => {
  console.log(`${account.account_number}: ${account.account_name}`);
  console.log(`Balance: $${account.balance.toFixed(2)}`);
  console.log(`Active: ${account.is_active}`);
});
```

---

### getAccountById()

Retrieves a specific account by UUID.

**Function Signature:**
```typescript
async function getAccountById(id: string): Promise<Account | null>
```

**Parameters:**
- `id`: Account UUID

**Returns:** Account object or null if not found

**Example Usage:**
```typescript
const account = await getAccountById('acc-uuid-1');

if (account) {
  console.log(`Account: ${account.account_name}`);
  console.log(`Number: ${account.account_number}`);
  console.log(`Balance: $${account.balance.toFixed(2)}`);
  console.log(`Minimum Balance: $${account.minimum_balance.toFixed(2)}`);
  
  const available = account.balance - account.minimum_balance;
  console.log(`Available: $${available.toFixed(2)}`);
}
```

---

## Common Patterns

### Transaction Workflow Pattern

```typescript
// 1. Get current user session
const session = await getServerSession(authOptions);

// 2. Check permissions
if (!canInitiateTransfers(session.user)) {
  throw new Error('Insufficient permissions');
}

// 3. Get accounts
const accounts = await getAllAccounts();
const fromAccount = accounts.find(a => a.account_number === 'ACC-001');
const toAccount = accounts.find(a => a.account_number === 'ACC-002');

// 4. Initiate transfer
const transaction = await initiateTransfer({
  fromAccountId: fromAccount.id,
  toAccountId: toAccount.id,
  amount: 5000.00,
  initiatedBy: session.user.id,
  description: 'Monthly operational transfer',
  ipAddress: request.headers.get('x-forwarded-for'),
  userAgent: request.headers.get('user-agent')
});

// 5. Check result
if (transaction.requires_approval) {
  console.log('Transfer awaiting approval');
} else {
  console.log('Transfer completed');
}
```

---

### Approval Workflow Pattern

```typescript
// 1. Get current user session
const session = await getServerSession(authOptions);

// 2. Check permissions
if (!canApproveTransfers(session.user)) {
  throw new Error('Insufficient permissions');
}

// 3. Get pending approvals
const { approvals } = await getPendingApprovals({ limit: 50 });

// 4. Select approval to process
const approval = approvals[0]; // or select by ID

// 5. Process approval
const transaction = await processApproval({
  transactionId: approval.transaction_id,
  approverId: session.user.id,
  decision: 'APPROVED',
  notes: 'Verified and approved',
  ipAddress: request.headers.get('x-forwarded-for'),
  userAgent: request.headers.get('user-agent')
});

console.log(`Transaction ${transaction.id} ${transaction.status}`);
```

---

### Audit Log Pattern

```typescript
// Always create audit logs for significant actions
async function performSensitiveAction(userId: string, details: any) {
  try {
    // Perform action
    const result = await someOperation();
    
    // Log success
    await createAuditLog({
      action: 'RELEVANT_ACTION_TYPE',
      userId: userId,
      details: {
        ...details,
        result: 'success'
      },
      ipAddress: getIpAddress(),
      userAgent: getUserAgent()
    });
    
    return result;
  } catch (error) {
    // Log failure
    await createAuditLog({
      action: 'RELEVANT_ACTION_TYPE',
      userId: userId,
      details: {
        ...details,
        result: 'failure',
        error: error.message
      },
      ipAddress: getIpAddress(),
      userAgent: getUserAgent()
    });
    
    throw error;
  }
}
```

---

## Performance Considerations

### Database Queries

1. **Use appropriate indexes:**
   - All foreign keys have indexes
   - created_at fields indexed for date filtering
   - status fields indexed for filtering

2. **Limit result sets:**
   - Always use limit/offset for pagination
   - Default limit: 100
   - Maximum recommended: 1000

3. **Optimize joins:**
   - getTransactionDetails uses LEFT JOINs
   - Only join necessary tables
   - Select specific columns when possible

### Caching Strategies

Consider caching for:
- Dashboard stats (cache for 1-5 minutes)
- Account lists (cache for 5-10 minutes)
- User permissions (cache for session duration)

Do NOT cache:
- Pending approvals (must be real-time)
- Transaction details (must be accurate)
- Audit logs (must be complete)

---

## Error Handling Patterns

### Service Layer Errors

```typescript
// Validation errors (throw immediately)
if (!fromAccountId || !toAccountId) {
  throw new Error('Missing required fields');
}

// Business rule errors (throw with descriptive message)
if (fromAccount.balance < amount + fromAccount.minimum_balance) {
  throw new Error('Insufficient funds in source account');
}

// Database errors (let propagate or wrap)
try {
  const result = await query('SELECT ...');
} catch (error) {
  console.error('Database error:', error);
  throw new Error('Failed to retrieve data');
}
```

### API Layer Error Handling

```typescript
try {
  const result = await serviceFunction();
  return NextResponse.json({ success: true, result });
} catch (error) {
  console.error('Service error:', error);
  
  // Determine appropriate status code
  const status = error.message.includes('not found') ? 404
    : error.message.includes('Insufficient') ? 400
    : error.message.includes('permissions') ? 403
    : 500;
  
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Internal server error' },
    { status }
  );
}
```

---

## Testing Recommendations

### Unit Testing Services

```typescript
// Mock database queries
jest.mock('@/lib/db/connection', () => ({
  query: jest.fn()
}));

describe('initiateTransfer', () => {
  it('should complete small transfers immediately', async () => {
    // Setup mocks
    // Call service function
    // Assert results
  });
  
  it('should require approval for large transfers', async () => {
    // Test approval logic
  });
  
  it('should throw error for insufficient funds', async () => {
    // Test validation
  });
});
```

---

**End of Service Documentation**
