# AI Chatbot Conversation Examples
## Banking Transfer System - Practical Usage Scenarios

---

## Overview

This document provides practical examples of how an AI chatbot should interact with users for common banking operations. Each example includes:
- User intent
- Required permissions check
- API calls to make
- Response formatting
- Error handling

---

## Table of Contents

1. [Transfer Operations](#transfer-operations)
2. [Approval Operations](#approval-operations)
3. [Account Queries](#account-queries)
4. [Transaction Queries](#transaction-queries)
5. [User Management](#user-management)
6. [Audit Log Queries](#audit-log-queries)
7. [Error Scenarios](#error-scenarios)

---

## Transfer Operations

### Example 1: Simple Transfer Request

**User:** "Transfer $500 from Operating Account to Savings Account"

**Chatbot Logic:**

1. **Check Session:**
```typescript
const session = await getServerSession(authOptions);
if (!session?.user) {
  return "I need you to sign in first to perform transfers.";
}
```

2. **Check Permissions:**
```typescript
if (!canInitiateTransfers(session.user)) {
  return `I'm sorry, ${session.user.first_name}. Your role (${session.user.role}) doesn't allow initiating transfers. Only CONTROLLER and ADMIN users can initiate transfers.`;
}
```

3. **Get Accounts:**
```typescript
const response = await fetch('/api/accounts');
const { accounts } = await response.json();

// Find accounts by name (case-insensitive search)
const fromAccount = accounts.find(a => 
  a.account_name.toLowerCase().includes('operating')
);
const toAccount = accounts.find(a => 
  a.account_name.toLowerCase().includes('savings')
);

if (!fromAccount || !toAccount) {
  return "I couldn't find one or both of those accounts. Here are the available accounts:\n\n" +
    accounts.map(a => `• ${a.account_name} (${a.account_number})`).join('\n') +
    "\n\nPlease specify which accounts you'd like to use.";
}
```

4. **Check Available Balance:**
```typescript
const available = fromAccount.balance - fromAccount.minimum_balance;
if (available < 500) {
  return `The Operating Account doesn't have enough available funds.\n\n` +
    `Current Balance: $${fromAccount.balance.toFixed(2)}\n` +
    `Minimum Balance: $${fromAccount.minimum_balance.toFixed(2)}\n` +
    `Available: $${available.toFixed(2)}\n\n` +
    `You need $${(500 - available).toFixed(2)} more to complete this transfer.`;
}
```

5. **Initiate Transfer:**
```typescript
const response = await fetch('/api/transfers/initiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromAccountId: fromAccount.id,
    toAccountId: toAccount.id,
    amount: 500,
    description: 'Transfer requested via chatbot'
  })
});

const result = await response.json();
```

6. **Format Response:**
```typescript
if (result.success) {
  if (result.transaction.requires_approval) {
    return `✅ Transfer Submitted for Approval\n\n` +
      `From: ${fromAccount.account_name} (${fromAccount.account_number})\n` +
      `To: ${toAccount.account_name} (${toAccount.account_number})\n` +
      `Amount: $${result.transaction.amount.toFixed(2)}\n` +
      `Status: Awaiting Approval\n` +
      `Transaction ID: ${result.transaction.id}\n\n` +
      `This transfer requires approval because it exceeds $10,000. ` +
      `An admin will review it shortly.`;
  } else {
    return `✅ Transfer Completed Successfully!\n\n` +
      `From: ${fromAccount.account_name} (${fromAccount.account_number})\n` +
      `To: ${toAccount.account_name} (${toAccount.account_number})\n` +
      `Amount: $${result.transaction.amount.toFixed(2)}\n` +
      `Status: Completed\n` +
      `Transaction ID: ${result.transaction.id}\n` +
      `Completed At: ${new Date(result.transaction.completed_at).toLocaleString()}`;
  }
} else {
  return `❌ Transfer Failed\n\n` +
    `Error: ${result.error}\n\n` +
    `Please check the details and try again, or contact support if the issue persists.`;
}
```

---

### Example 2: Large Transfer (Requires Approval)

**User:** "I need to transfer $25,000 from Payroll to Vendor Payments"

**Chatbot Response Flow:**

```
[After permission and account checks]

⚠️ Large Transfer Notification

You're requesting to transfer $25,000.00. Transfers over $10,000 require 
approval from an ADMIN user.

Would you like me to proceed with submitting this transfer for approval?
```

**User:** "Yes, please"

**Chatbot:** 
```
✅ Transfer Submitted for Approval

From: Payroll Account (ACC-003)
To: Vendor Payments (ACC-004)
Amount: $25,000.00
Status: Awaiting Approval
Transaction ID: 550e8400-e29b-41d4-a716-446655440000

This transfer has been submitted and is now in the approval queue. You'll be 
notified once an admin reviews and approves or rejects it.

To check the status later, you can ask:
• "What's the status of transaction 550e8400-e29b-41d4-a716-446655440000?"
• "Show my pending transfers"
```

---

### Example 3: Transfer with Account Number

**User:** "Send $1200 from ACC-001 to ACC-002 for monthly rent"

**Chatbot Logic:**

```typescript
// Find accounts by number instead of name
const fromAccount = accounts.find(a => a.account_number === 'ACC-001');
const toAccount = accounts.find(a => a.account_number === 'ACC-002');

// Include description in transfer
const response = await fetch('/api/transfers/initiate', {
  method: 'POST',
  body: JSON.stringify({
    fromAccountId: fromAccount.id,
    toAccountId: toAccount.id,
    amount: 1200,
    description: 'Monthly rent payment'
  })
});
```

**Chatbot Response:**
```
✅ Transfer Completed Successfully!

From: Operating Account (ACC-001)
To: Savings Account (ACC-002)
Amount: $1,200.00
Description: Monthly rent payment
Status: Completed
Transaction ID: 660e8400-e29b-41d4-a716-446655440001

The transfer was completed immediately because it's under the $10,000 
approval threshold.
```

---

## Approval Operations

### Example 4: View Pending Approvals

**User:** "Show me pending approvals" or "What transfers need approval?"

**Chatbot Logic:**

1. **Check Permissions:**
```typescript
if (!canApproveTransfers(session.user)) {
  return `Only ADMIN users can view and process approvals. Your current role is ${session.user.role}.`;
}
```

2. **Get Pending Approvals:**
```typescript
const response = await fetch('/api/approvals/pending?limit=50');
const { approvals, total } = await response.json();
```

3. **Format Response:**
```typescript
if (approvals.length === 0) {
  return "📋 No Pending Approvals\n\nThere are currently no transfers awaiting approval. All clear! ✨";
}

let message = `📋 Pending Approvals (${approvals.length} of ${total})\n\n`;

approvals.forEach((approval, index) => {
  message += `${index + 1}. Transaction ${approval.transaction_id.substring(0, 8)}...\n`;
  message += `   Amount: $${parseFloat(approval.amount).toFixed(2)}\n`;
  message += `   From: ${approval.from_account_name} (${approval.from_account_number})\n`;
  message += `   To: ${approval.to_account_name} (${approval.to_account_number})\n`;
  message += `   Initiated By: ${approval.initiated_by_name} (${approval.initiated_by_email})\n`;
  message += `   Requested: ${new Date(approval.created_at).toLocaleString()}\n`;
  if (approval.description) {
    message += `   Description: ${approval.description}\n`;
  }
  message += '\n';
});

message += 'To approve or reject any of these, say:\n';
message += '• "Approve transaction #1"\n';
message += '• "Reject transaction 550e8400... because [reason]"';

return message;
```

**Chatbot Response:**
```
📋 Pending Approvals (2 of 2)

1. Transaction 550e8400...
   Amount: $25,000.00
   From: Payroll Account (ACC-003)
   To: Vendor Payments (ACC-004)
   Initiated By: John Controller (controller@example.com)
   Requested: 12/11/2025, 10:30:00 AM
   Description: Vendor payment for December

2. Transaction 660e8400...
   Amount: $15,500.00
   From: Operating Account (ACC-001)
   To: Investment Account (ACC-005)
   Initiated By: John Controller (controller@example.com)
   Requested: 12/11/2025, 11:15:00 AM
   Description: Quarterly investment

To approve or reject any of these, say:
• "Approve transaction #1"
• "Reject transaction 550e8400... because [reason]"
```

---

### Example 5: Approve Transfer

**User:** "Approve transaction #1"

**Chatbot Logic:**

1. **Get Transaction ID from Context:**
```typescript
// Maintain conversation context with previously shown approvals
const transactionId = previousApprovals[0].transaction_id;
```

2. **Process Approval:**
```typescript
const response = await fetch('/api/approvals/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transactionId: transactionId,
    decision: 'APPROVED',
    notes: 'Approved via chatbot by admin'
  })
});

const result = await response.json();
```

3. **Format Response:**
```typescript
if (result.success) {
  return `✅ Transfer Approved and Completed\n\n` +
    `Transaction ID: ${result.transaction.id}\n` +
    `Amount: $${result.transaction.amount.toFixed(2)}\n` +
    `Status: ${result.transaction.status}\n` +
    `Approved By: ${session.user.first_name} ${session.user.last_name}\n` +
    `Approved At: ${new Date(result.transaction.approved_at).toLocaleString()}\n` +
    `Completed At: ${new Date(result.transaction.completed_at).toLocaleString()}\n\n` +
    `The funds have been transferred successfully.`;
}
```

**Chatbot Response:**
```
✅ Transfer Approved and Completed

Transaction ID: 550e8400-e29b-41d4-a716-446655440000
Amount: $25,000.00
Status: COMPLETED
Approved By: Jane Admin
Approved At: 12/11/2025, 2:45:30 PM
Completed At: 12/11/2025, 2:45:30 PM

The funds have been transferred successfully.
```

---

### Example 6: Reject Transfer

**User:** "Reject transaction 550e8400-e29b-41d4-a716-446655440000 because exceeds monthly budget"

**Chatbot Logic:**

```typescript
const response = await fetch('/api/approvals/process', {
  method: 'POST',
  body: JSON.stringify({
    transactionId: '550e8400-e29b-41d4-a716-446655440000',
    decision: 'REJECTED',
    notes: 'Exceeds monthly budget - requested via chatbot'
  })
});
```

**Chatbot Response:**
```
❌ Transfer Rejected

Transaction ID: 550e8400-e29b-41d4-a716-446655440000
Status: REJECTED
Rejected By: Jane Admin
Rejected At: 12/11/2025, 2:50:00 PM
Reason: Exceeds monthly budget

The transfer has been rejected and will not be processed. The initiator will 
be notified of this decision.
```

---

## Account Queries

### Example 7: Check Account Balance

**User:** "What's the balance of Operating Account?"

**Chatbot Logic:**

```typescript
const response = await fetch('/api/accounts');
const { accounts } = await response.json();

const account = accounts.find(a => 
  a.account_name.toLowerCase().includes('operating')
);

if (!account) {
  return "I couldn't find an account named 'Operating Account'. Here are the available accounts:\n\n" +
    accounts.map(a => `• ${a.account_name} (${a.account_number})`).join('\n');
}

const available = account.balance - account.minimum_balance;
```

**Chatbot Response:**
```
💰 Operating Account (ACC-001)

Current Balance: $50,125.50
Minimum Balance: $1,000.00
Available for Transfer: $49,125.50

Account Status: Active
Last Updated: 12/11/2025, 2:30:00 PM
```

---

### Example 8: List All Accounts

**User:** "Show me all accounts" or "What accounts do we have?"

**Chatbot Response:**
```
🏦 Bank Accounts

1. Operating Account (ACC-001)
   Balance: $50,125.50
   Available: $49,125.50
   Status: Active

2. Savings Account (ACC-002)
   Balance: $75,890.00
   Available: $74,890.00
   Status: Active

3. Payroll Account (ACC-003)
   Balance: $102,450.25
   Available: $97,450.25
   Status: Active

4. Vendor Payments (ACC-004)
   Balance: $28,340.00
   Available: $23,340.00
   Status: Active

Total Across All Accounts: $256,805.75

To check details of a specific account, ask:
• "What's the balance of [account name]?"
• "Show me details for ACC-001"
```

---

## Transaction Queries

### Example 9: View Recent Transactions

**User:** "Show my recent transfers" or "What transactions did I initiate?"

**Chatbot Logic:**

```typescript
const response = await fetch(
  `/api/transactions?initiatedBy=${session.user.id}&limit=10`
);
const { transactions, total } = await response.json();
```

**Chatbot Response:**
```
📊 Your Recent Transactions (Showing 10 of 156)

1. $500.00 - Operating to Savings
   Status: ✅ Completed
   Date: 12/11/2025, 2:45 PM
   ID: 770e8400...

2. $25,000.00 - Payroll to Vendor Payments
   Status: ⏳ Awaiting Approval
   Date: 12/11/2025, 10:30 AM
   ID: 550e8400...

3. $1,200.00 - Operating to Savings
   Status: ✅ Completed
   Date: 12/10/2025, 3:15 PM
   ID: 880e8400...

4. $750.00 - Operating to Payroll
   Status: ✅ Completed
   Date: 12/10/2025, 9:00 AM
   ID: 990e8400...

To see more transactions or filter by date/status, ask:
• "Show transactions from last week"
• "Show completed transactions"
• "Show details for transaction 770e8400..."
```

---

### Example 10: Transaction Details

**User:** "Show details for transaction 550e8400-e29b-41d4-a716-446655440000"

**Chatbot Logic:**

```typescript
const response = await fetch(
  `/api/transfers/${transactionId}`
);
const transaction = await response.json();
```

**Chatbot Response:**
```
📋 Transaction Details

Transaction ID: 550e8400-e29b-41d4-a716-446655440000

TRANSFER INFORMATION
Amount: $25,000.00
Status: ⏳ Awaiting Approval
Description: Vendor payment for December

FROM ACCOUNT
Name: Payroll Account
Number: ACC-003
Balance: $102,450.25

TO ACCOUNT
Name: Vendor Payments
Number: ACC-004
Balance: $28,340.00

WORKFLOW
Initiated By: John Controller (controller@example.com)
Initiated At: 12/11/2025, 10:30:00 AM

Approval Required: Yes (amount > $10,000)
Approval Status: Pending
Assigned To: Any Admin user

TIMELINE
• Created: 12/11/2025, 10:30:00 AM
• Validated: 12/11/2025, 10:30:01 AM
• Awaiting Approval: 12/11/2025, 10:30:01 AM

If you're an admin, you can approve or reject this transaction by saying:
• "Approve this transaction"
• "Reject this transaction because [reason]"
```

---

### Example 11: Filter Transactions by Date

**User:** "Show me all transfers from last week"

**Chatbot Logic:**

```typescript
const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - 7);

const response = await fetch(
  `/api/transactions?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&limit=50`
);
const { transactions, total } = await response.json();
```

**Chatbot Response:**
```
📊 Transactions from Last Week (Dec 4 - Dec 11)

Found ${total} transactions

COMPLETED: 18 transactions, $156,780.50 total
AWAITING APPROVAL: 2 transactions, $40,500.00 total
REJECTED: 1 transaction, $5,000.00
FAILED: 0 transactions

Recent Transactions:
[List formatted as before]

Summary by Status:
✅ Completed: 18 ($156,780.50)
⏳ Awaiting Approval: 2 ($40,500.00)
❌ Rejected: 1 ($5,000.00)

Would you like to:
• See details for any specific transaction
• Filter by status or amount
• Export this data
```

---

## User Management

### Example 12: View My Role and Permissions

**User:** "What's my role?" or "What can I do?"

**Chatbot Response:**
```
👤 Your Profile

Name: John Controller
Email: controller@example.com
Role: CONTROLLER
Account Status: Active
Member Since: Jan 1, 2024

YOUR PERMISSIONS:

✅ You CAN:
• Initiate transfers between accounts
• View transaction history
• Check account balances
• View dashboard statistics
• View your own transaction details

❌ You CANNOT:
• Approve or reject pending transfers (requires ADMIN role)
• View audit logs (requires AUDIT or ADMIN role)
• Manage user roles (requires ADMIN role)
• Deactivate users (requires ADMIN role)

If you need additional permissions, please contact an administrator.
```

---

### Example 13: List Users (Admin Only)

**User:** "Show me all users"

**Chatbot Logic:**

```typescript
if (!canManageUsers(session.user)) {
  return `Only ADMIN users can view the user list. Your current role is ${session.user.role}.`;
}

const response = await fetch('/api/users');
const { users } = await response.json();
```

**Chatbot Response:**
```
👥 System Users (8 total)

ADMINS (2):
1. Jane Admin (admin@example.com)
   Status: Active
   ID: admin-uuid-1

2. Mike Admin (mike@example.com)
   Status: Active
   ID: admin-uuid-2

CONTROLLERS (3):
3. John Controller (controller@example.com)
   Status: Active
   ID: controller-uuid-1

4. Sarah Controller (sarah@example.com)
   Status: Active
   ID: controller-uuid-2

5. Tom Controller (tom@example.com)
   Status: Inactive
   ID: controller-uuid-3

AUDIT (2):
6. Bob Audit (audit@example.com)
   Status: Active
   ID: audit-uuid-1

7. Lisa Audit (lisa@example.com)
   Status: Active
   ID: audit-uuid-2

NONE (1):
8. New User (newuser@example.com)
   Status: Active
   ID: new-uuid-1

To manage users, you can:
• "Change role of newuser@example.com to CONTROLLER"
• "Deactivate user tom@example.com"
```

---

### Example 14: Change User Role (Admin Only)

**User:** "Change newuser@example.com to CONTROLLER role"

**Chatbot Logic:**

```typescript
if (!canManageUsers(session.user)) {
  return `Only ADMIN users can change user roles.`;
}

// Find user by email
const usersResponse = await fetch('/api/users');
const { users } = await usersResponse.json();
const targetUser = users.find(u => u.email === 'newuser@example.com');

if (!targetUser) {
  return "I couldn't find a user with that email address.";
}

// Update role
const response = await fetch('/api/users', {
  method: 'PATCH',
  body: JSON.stringify({
    userId: targetUser.id,
    role: 'CONTROLLER'
  })
});
```

**Chatbot Response:**
```
✅ User Role Updated

User: New User (newuser@example.com)
Previous Role: NONE
New Role: CONTROLLER
Updated By: Jane Admin
Updated At: 12/11/2025, 3:00:00 PM

The user now has CONTROLLER permissions and can:
• Initiate transfers between accounts
• View transaction history
• Check account balances
• View dashboard statistics

This change has been logged in the audit trail.
```

---

## Audit Log Queries

### Example 15: View Recent System Activity (Audit/Admin Only)

**User:** "Show me recent system activity" or "What happened in the last hour?"

**Chatbot Logic:**

```typescript
if (!canViewAuditLogs(session.user)) {
  return `Only AUDIT and ADMIN users can view audit logs. Your role is ${session.user.role}.`;
}

const oneHourAgo = new Date();
oneHourAgo.setHours(oneHourAgo.getHours() - 1);

const response = await fetch(
  `/api/audit?startDate=${oneHourAgo.toISOString()}&limit=50`
);
const { logs, total } = await response.json();
```

**Chatbot Response:**
```
🔍 Recent System Activity (Last Hour)

Found ${total} audit log entries

TRANSFERS (12):
• 8 Transfers Initiated
• 2 Transfers Approved
• 2 Transfers Completed

USER ACTIVITY (5):
• 3 User Logins
• 1 User Role Changed
• 1 User Logout

ACCOUNT ACTIVITY (3):
• 3 Accounts Viewed

Recent Events:
━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ 2:45 PM - TRANSFER_COMPLETED
   User: John Controller
   Amount: $500.00
   From: ACC-001 → To: ACC-002

⏰ 2:44 PM - TRANSFER_APPROVED
   User: Jane Admin
   Transaction: 550e8400...
   Decision: APPROVED

⏰ 2:30 PM - USER_LOGIN
   User: John Controller
   IP: 192.168.1.100

⏰ 2:15 PM - TRANSFER_INITIATED
   User: John Controller
   Amount: $500.00

⏰ 2:00 PM - USER_ROLE_CHANGED
   Admin: Jane Admin
   Target: New User
   Old: NONE → New: CONTROLLER

[Showing 5 of ${total}]

To see more details or filter by action type:
• "Show only transfer activities"
• "Show activities for user john@example.com"
• "Show all activities from today"
```

---

### Example 16: Filter Audit Logs by Action Type

**User:** "Show me all transfer approvals from today"

**Chatbot Logic:**

```typescript
const today = new Date().toISOString().split('T')[0];

const response = await fetch(
  `/api/audit?action=TRANSFER_APPROVED&action=TRANSFER_REJECTED&startDate=${today}&limit=100`
);
const { logs, total } = await response.json();
```

**Chatbot Response:**
```
🔍 Transfer Approval Activity - Today (Dec 11, 2025)

Found ${total} approval decisions

APPROVED: 5 transfers, $87,250.00 total
REJECTED: 1 transfer, $5,000.00

APPROVED TRANSFERS:
━━━━━━━━━━━━━━━━━━━━━━━━━━
1. $25,000.00 - Payroll → Vendor Payments
   Approved by: Jane Admin
   Time: 2:45 PM
   Transaction: 550e8400...

2. $15,500.00 - Operating → Investment
   Approved by: Mike Admin
   Time: 1:30 PM
   Transaction: 660e8400...

[...3 more]

REJECTED TRANSFERS:
━━━━━━━━━━━━━━━━━━━━━━━━━━
1. $5,000.00 - Operating → External
   Rejected by: Jane Admin
   Time: 11:00 AM
   Reason: Exceeds daily transfer limit
   Transaction: 770e8400...

Summary:
• Total Decisions: 6
• Approval Rate: 83.3%
• Total Value Approved: $87,250.00
• Average Approved Amount: $17,450.00
```

---

## Error Scenarios

### Example 17: Permission Denied

**User (AUDIT role):** "Transfer $500 from ACC-001 to ACC-002"

**Chatbot Response:**
```
❌ Permission Denied

I'm sorry, Bob. Your current role (AUDIT) doesn't allow you to initiate transfers.

Your permissions allow you to:
✅ View audit logs
✅ View transaction history
✅ View account information
✅ View dashboard statistics

To initiate transfers, you need one of these roles:
• CONTROLLER - Can initiate transfers
• ADMIN - Can initiate and approve transfers

If you believe you should have these permissions, please contact an 
administrator to update your role.

Current Admins:
• Jane Admin (admin@example.com)
• Mike Admin (mike@example.com)
```

---

### Example 18: Insufficient Funds

**User:** "Transfer $50,000 from ACC-004 to ACC-001"

**Chatbot Response:**
```
❌ Transfer Failed - Insufficient Funds

The Vendor Payments account doesn't have enough available funds for this transfer.

CURRENT ACCOUNT STATUS:
Account: Vendor Payments (ACC-004)
Current Balance: $28,340.00
Minimum Balance: $5,000.00
Available for Transfer: $23,340.00

REQUESTED TRANSFER:
Amount: $50,000.00
Shortfall: $26,660.00

WHAT YOU CAN DO:
1. Reduce the transfer amount to $23,340 or less
2. Transfer funds into this account first
3. Choose a different source account

Available accounts with sufficient funds:
• Operating Account (ACC-001) - $49,125.50 available
• Savings Account (ACC-002) - $74,890.00 available
• Payroll Account (ACC-003) - $97,450.25 available

Would you like me to help you transfer from a different account?
```

---

### Example 19: Account Not Found

**User:** "Transfer $500 from Marketing Account to Sales Account"

**Chatbot Response:**
```
❌ Account Not Found

I couldn't find accounts named "Marketing Account" or "Sales Account" in the system.

Here are the available accounts:

1. Operating Account (ACC-001)
   Balance: $50,125.50

2. Savings Account (ACC-002)
   Balance: $75,890.00

3. Payroll Account (ACC-003)
   Balance: $102,450.25

4. Vendor Payments (ACC-004)
   Balance: $28,340.00

Please specify your transfer using one of these accounts. You can use either:
• The account name: "Operating Account"
• The account number: "ACC-001"

Example: "Transfer $500 from Operating Account to Savings Account"
```

---

### Example 20: Session Expired

**User:** "Transfer $500 from ACC-001 to ACC-002"

**Chatbot Response:**
```
🔒 Session Expired

Your session has expired for security reasons. Sessions last 24 hours from your last login.

Please sign in again to continue:
1. Click the "Sign In" button
2. Enter your email and password
3. Return to our conversation

Don't worry - your request was saved. After you sign in, I'll help you complete the transfer.

For security, make sure to:
• Use a secure connection
• Don't share your credentials
• Sign out when finished
```

---

### Example 21: Invalid Transaction ID

**User:** "Show details for transaction xyz-invalid-id"

**Chatbot Response:**
```
❌ Transaction Not Found

I couldn't find a transaction with ID "xyz-invalid-id".

This could mean:
• The transaction ID is incorrect (check for typos)
• The transaction doesn't exist
• You don't have permission to view it

Transaction IDs are UUIDs that look like:
550e8400-e29b-41d4-a716-446655440000

To find the correct transaction:
• "Show my recent transactions"
• "Show all transactions from today"
• "Show transaction [correct-id-here]"

Would you like me to show your recent transactions instead?
```

---

## Natural Language Processing Examples

### Example 22: Conversational Follow-ups

**User:** "Show pending approvals"

**Chatbot:** [Shows list of 3 pending approvals]

**User:** "Approve the first one"

**Chatbot Logic:**
```typescript
// Use conversation context to remember the list shown
const transactionId = conversationContext.lastApprovalList[0].transaction_id;
// Process approval...
```

**User:** "What about the second one?"

**Chatbot:**
```
📋 Transaction #2 Details

Amount: $15,500.00
From: Operating Account (ACC-001)
To: Investment Account (ACC-005)
Initiated By: John Controller
Requested: 12/11/2025, 11:15 AM
Description: Quarterly investment

Would you like to:
• "Approve this transaction"
• "Reject this transaction"
• "See more details"
• "Skip to the next one"
```

---

### Example 23: Ambiguous Requests

**User:** "Transfer 500"

**Chatbot Response:**
```
I'd be happy to help with that transfer! I need a few more details:

1. From which account?
   • Operating Account (ACC-001)
   • Savings Account (ACC-002)
   • Payroll Account (ACC-003)
   • Vendor Payments (ACC-004)

2. To which account? [Same list]

3. Is that $500.00? (I'm assuming USD)

You can tell me all at once, like:
"Transfer $500 from Operating to Savings"

or I can guide you through each step.
```

---

### Example 24: Confirmation Requests

**User:** "Transfer $50,000 from Payroll to Vendor Payments"

**Chatbot Response:**
```
⚠️ Large Transfer Confirmation

You're requesting a large transfer. Let me confirm the details:

From: Payroll Account (ACC-003)
      Current Balance: $102,450.25
      Available: $97,450.25

To: Vendor Payments (ACC-004)
    Current Balance: $28,340.00

Amount: $50,000.00

This transfer:
✅ Has sufficient funds available
⚠️ Will require ADMIN approval (amount > $10,000)
⚠️ Will reduce Payroll available balance to $47,450.25

Is this correct? Please confirm:
• "Yes, proceed with the transfer"
• "No, let me change the amount"
• "Cancel"
```

---

## Best Practices Summary

### 1. Always Check Permissions First
```typescript
const session = await getServerSession(authOptions);
if (!session?.user) return "Please sign in";
if (!hasRequiredPermission(session.user)) return "Permission denied message";
```

### 2. Provide Context and Alternatives
- When operation fails, suggest alternatives
- Show available options when user provides invalid input
- Explain why something cannot be done

### 3. Use Clear Formatting
- Use emojis sparingly for visual hierarchy
- Format amounts consistently: $1,234.56
- Format dates consistently: 12/11/2025, 2:45 PM
- Use bullet points for lists
- Use sections with clear headers

### 4. Maintain Conversation Context
- Remember previous queries
- Allow follow-up questions
- Support references like "the first one", "this transaction"

### 5. Confirm Sensitive Operations
- Large transfers
- Approvals/rejections
- Role changes
- Account modifications

### 6. Provide Helpful Next Steps
- Suggest related actions
- Offer to perform follow-up tasks
- Provide examples of valid commands

### 7. Error Recovery
- Explain what went wrong in plain language
- Suggest corrections
- Offer to help fix the issue
- Don't just say "error" - be specific

---

**End of Conversation Examples**
