# Transaction Status Page Feature

## Overview

The transaction status page provides a visual flowchart showing the complete lifecycle of a transfer, including validation, approval (if required), execution, and completion. Each step is displayed with color-coded status indicators and FontAwesome icons.

## Features

### Visual Status Flow
- **Green checkmark** - Completed steps
- **Red X** - Failed steps  
- **Blue spinner** - Ongoing steps
- **Gray** - Pending or skipped steps

### Transaction States

#### 1. COMPLETED
- **Description**: Transfer successfully executed and funds moved
- **Visual**: Green success banner with all steps showing checkmarks
- **Steps**: Initiated → Validated → [Approval if required] → Executed → Completed

#### 2. PENDING
- **Description**: Transfer currently being processed
- **Visual**: Blue processing banner with spinner on execution step
- **Steps**: Initiated ✓ → Validated ✓ → Executing... → Pending

#### 3. AWAITING_APPROVAL
- **Description**: Large transfer (>$1M) waiting for admin approval
- **Visual**: Yellow warning banner with spinner on approval step
- **Steps**: Initiated ✓ → Validated ✓ → Awaiting Approval... → Pending

#### 4. APPROVED
- **Description**: Transfer approved but not yet executed
- **Visual**: Blue banner with spinner on execution
- **Steps**: Initiated ✓ → Validated ✓ → Approved ✓ → Executing... → Pending

#### 5. REJECTED
- **Description**: Transfer rejected by approver
- **Visual**: Red error banner with X on approval step
- **Steps**: Initiated ✓ → Validated ✓ → Rejected ✗ → Skipped → Skipped
- **Shows**: Rejection reason/notes

#### 6. FAILED
- **Description**: Transfer failed during validation or execution
- **Visual**: Red error banner with X on failed step
- **Steps**: Shows failure point with error message
- **Shows**: Specific error details

## Page Components

### 1. Transaction Details Card
Shows complete transaction information:
- Transaction ID
- Current status badge
- Amount (formatted)
- From/To accounts
- Initiated by user
- Approved by user (if applicable)
- Description
- Approval notes (if rejected)
- Timestamps

### 2. Transfer Progress Section
Visual flowchart with 4-5 steps:
1. **Transfer Initiated** - Always completed
2. **Validation** - Can fail here (insufficient funds, invalid accounts)
3. **Approval Required** - Only shown for large transfers (>$1M)
4. **Transfer Execution** - Can fail here (database error, concurrent updates)
5. **Transfer Complete** - Final state

### 3. Audit Trail
Expandable log entries showing:
- Action type
- User who performed action
- Timestamp
- Detailed JSON data

## Usage

### Accessing Transaction Status

#### From Account Details
```
/accounts/[accountId] → Click "View Status →" on any transaction
```

#### After Creating Transfer
```
/transfer → Submit form → Auto-redirect to /transactions/[id]
```

#### Direct URL
```
/transactions/[transactionId]
```

### Testing Different States

Create test transactions with various states:
```bash
npm run db:test-transactions
```

This creates 6 sample transactions:
1. COMPLETED - $5,000 (no approval)
2. PENDING - $2,500 (processing)
3. AWAITING_APPROVAL - $1,500,000 (needs approval)
4. REJECTED - $2,000,000 (rejected)
5. FAILED - $7,500 (failed validation)
6. APPROVED - $1,200,000 (approved, pending execution)

## Technical Implementation

### Components

#### `/components/TransactionStatusFlow.tsx`
Reusable status visualization component

**Props:**
```typescript
interface TransactionStatusFlowProps {
  transactionStatus: TransactionStatus;
  requiresApproval: boolean;
  errorMessage?: string;
  createdAt: Date;
  approvedAt?: Date;
  completedAt?: Date;
}
```

**Features:**
- Conditional step rendering based on approval requirement
- Dynamic status determination
- Animated spinners for ongoing steps
- Color-coded borders and backgrounds
- Timestamp display for completed steps

#### `/app/transactions/[id]/page.tsx`
Server component for transaction status page

**Features:**
- Server-side data fetching
- Transaction details with approval info
- Audit log retrieval
- 404 handling for invalid transaction IDs

### Services

#### `/lib/services/transaction.service.ts`

**`getTransactionById(id)`**
- Fetches transaction with account and user details
- Joins approvals table for approval info
- Returns `TransactionWithDetails` type

**`getTransactionAuditLogs(id)`**
- Retrieves audit trail for transaction
- Orders by created_at chronologically
- Includes user email for each action

### Icons

Uses FontAwesome Free Solid icons:
- `faMoneyBillTransfer` - Transfer initiated
- `faClipboardCheck` - Validation
- `faUserCheck` - Approval required
- `faHourglassHalf` - Transfer execution
- `faCircleCheck` - Transfer complete
- `faCheck` - Success checkmark
- `faTimes` - Failure X
- `faSpinner` - Processing spinner
- `faExclamationTriangle` - Warning/error

## Status Determination Logic

### Step Status Rules

**Validation Step:**
```
if status === 'FAILED' && errorMessage exists
  → FAILED with error
else
  → COMPLETED
```

**Approval Step (only if required):**
```
if status === 'REJECTED'
  → FAILED with rejection note
else if status === 'APPROVED' || 'COMPLETED'
  → COMPLETED
else if status === 'AWAITING_APPROVAL'
  → ONGOING with spinner
else
  → PENDING
```

**Execution Step:**
```
if status === 'COMPLETED'
  → COMPLETED with timestamp
else if status === 'FAILED'
  → FAILED with error message
else if status === 'REJECTED'
  → SKIPPED (won't execute)
else if status === 'APPROVED' || (no approval && 'PENDING')
  → ONGOING with spinner
else
  → PENDING
```

**Completion Step:**
```
if status === 'COMPLETED'
  → COMPLETED with checkmark
else if status === 'FAILED' || 'REJECTED'
  → SKIPPED
else
  → PENDING
```

## User Experience

### Success Flow (Small Transfer)
1. User submits transfer of $5,000
2. Redirected to status page
3. Sees green banner: "Transfer Completed Successfully"
4. All 4 steps show green checkmarks
5. Can view complete audit trail

### Approval Flow (Large Transfer)
1. User submits transfer of $1,500,000
2. Redirected to status page
3. Sees yellow banner: "Awaiting Approval"
4. Steps: ✓ Initiated → ✓ Validated → ⏳ Approval Required → ⏸ Execution → ⏸ Complete
5. Admin approves in /approvals
6. User refreshes page
7. Sees blue banner: "Transfer In Progress"
8. Steps: ✓ Initiated → ✓ Validated → ✓ Approved → ⏳ Executing → ⏸ Complete
9. After execution completes
10. Green banner: "Transfer Completed Successfully"
11. All steps show checkmarks

### Failure Flow
1. User attempts transfer with insufficient funds
2. Redirected to status page
3. Sees red banner: "Transfer Failed"
4. Steps: ✓ Initiated → ✗ Validation (shows error) → ⏸ Execution → ⏸ Complete
5. Error message displayed: "Insufficient funds. Current balance: $2,500"

### Rejection Flow
1. User submits large transfer of $2,000,000
2. Status shows yellow "Awaiting Approval"
3. Admin rejects with note: "Risk assessment failed - amount too high"
4. User sees red banner: "Transfer Rejected"
5. Steps: ✓ Initiated → ✓ Validated → ✗ Approval Required (shows rejection note) → ⊘ Execution → ⊘ Complete

## Styling

### Colors
- **Green**: Success (#10b981, #dcfce7)
- **Red**: Error/Failure (#ef4444, #fee2e2)
- **Yellow**: Warning/Awaiting (#eab308, #fef3c7)
- **Blue**: In Progress (#3b82f6, #dbeafe)
- **Gray**: Pending/Skipped (#9ca3af, #f9fafb)

### Borders
- 2px solid border for status banners
- 4px border on step icons
- Rounded corners (8px for cards, 9999px for pills)

### Icons
- 16px (1rem) for checkmarks/X in step circles
- 24px (1.5rem) for banner icons
- Animated spin for spinners (Tailwind `animate-spin`)

## Security

- Server-side authentication required (`requireAuth`)
- Users can view any transaction (no ownership check currently)
- Audit logs track all access
- Transaction IDs are UUIDs (not sequential)

## Performance

- Server-side rendering for SEO and fast initial load
- Single database query for transaction details
- Separate query for audit logs (optional display)
- No client-side state management needed

## Future Enhancements

1. **Real-time Updates**: WebSocket connection for live status changes
2. **Access Control**: Limit transaction viewing to involved parties
3. **Export**: Download audit trail as PDF or CSV
4. **Notifications**: Email/SMS alerts on status changes
5. **Rollback**: Admin ability to reverse completed transfers
6. **Comments**: Allow users to add notes to transactions
7. **Attachments**: Upload supporting documents
8. **Timeline**: More detailed timeline with sub-steps
9. **Metrics**: Show processing time for each step
10. **Similar Transactions**: Suggest related transfers

## Troubleshooting

### Page Shows 404
- Verify transaction ID exists in database
- Check UUID format is valid
- Ensure database connection is working

### Status Not Updating
- Refresh the page (no real-time updates currently)
- Check transaction status in database
- Verify approval workflow completed correctly

### Icons Not Displaying
- Ensure `@fortawesome/free-solid-svg-icons` is installed
- Check FontAwesome imports in component
- Verify no CSS conflicts

### Timestamps Not Showing
- Ensure `completed_at` and `approved_at` fields are populated
- Check date formatting in component
- Verify timezone is correct

## Related Pages
- `/accounts/[id]` - Account detail with transaction list
- `/transfer` - Create new transfer
- `/approvals` - Admin approval queue
- `/audit` - System-wide audit log

## API Endpoints Used
- None (server-side data fetching only)
- Uses `getTransactionById()` from transaction.service
- Uses `getTransactionAuditLogs()` from transaction.service

## Database Tables
- `transactions` - Main transaction record
- `approvals` - Approval workflow data
- `audit_logs` - Action history
- `accounts` - Account details
- `users` - User information
