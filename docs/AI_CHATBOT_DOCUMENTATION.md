# AI Chatbot Integration Documentation
## Banking Transfer System - Complete API & System Reference

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Workflows & Business Logic](#workflows--business-logic)
7. [Error Handling](#error-handling)
8. [Security Considerations](#security-considerations)

---

## System Overview

### Architecture
The Banking Transfer System is a Next.js 16 application with:
- **Frontend**: React 19.2 with TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (App Router)
- **Database**: PostgreSQL with pg driver
- **Authentication**: NextAuth.js v4 with JWT strategy
- **Session Duration**: 24 hours

### Core Functionality
1. **Transfer Initiation**: Users initiate money transfers between bank accounts
2. **Approval Workflow**: Transfers above certain thresholds or specific conditions require approval
3. **Audit Logging**: All system actions are logged for compliance
4. **Dashboard Analytics**: Real-time statistics and transaction trends
5. **User Management**: Admin functions for managing users and roles

---

## Authentication & Authorization

### Getting Current User Session

To determine the current user's identity and permissions, use NextAuth's session:

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const session = await getServerSession(authOptions);

if (!session?.user) {
  // User is not authenticated
  return { error: 'Unauthorized' };
}

// Access user properties
const userId = session.user.id;
const userEmail = session.user.email;
const userRole = session.user.role;
const userName = `${session.user.first_name} ${session.user.last_name}`;
```

### Session Object Structure

```typescript
interface Session {
  user: {
    id: string;              // UUID
    email: string;           // User's email address
    first_name: string;      // User's first name
    last_name: string;       // User's last name
    role: UserRole;          // 'CONTROLLER' | 'AUDIT' | 'ADMIN' | 'NONE'
    is_active: boolean;      // Account status
    created_at: Date;        // Account creation timestamp
    updated_at: Date;        // Last update timestamp
  };
}
```

### Authentication Endpoint

**POST** `/api/auth/signin`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (Success):**
- Sets session cookie
- Creates `USER_LOGIN` audit log entry
- Redirects to dashboard or returns session data

**Response (Failure):**
```json
{
  "error": "Invalid credentials"
}
```

---

## User Roles & Permissions

### Role Definitions

#### 1. CONTROLLER
- **Primary Function**: Initiate transfers
- **Can Do**:
  - Initiate transfers from any account
  - View their own initiated transfers
  - View dashboard statistics
  - View account information
- **Cannot Do**:
  - Approve transfers
  - View audit logs
  - Manage users
  - Change roles

#### 2. ADMIN
- **Primary Function**: Approve transfers and manage system
- **Can Do**:
  - Approve or reject pending transfers
  - Initiate transfers
  - View all transactions
  - Manage user roles
  - View dashboard statistics
  - View account information
- **Cannot Do**:
  - View detailed audit logs (use AUDIT role)
- **Special**: Can approve their own initiated transfers

#### 3. AUDIT
- **Primary Function**: Monitor system activity
- **Can Do**:
  - View all audit logs
  - View all transactions
  - View dashboard statistics
  - View account information
- **Cannot Do**:
  - Initiate transfers
  - Approve transfers
  - Manage users
  - Modify any data

#### 4. NONE
- **Primary Function**: Inactive/default role
- **Can Do**:
  - Sign in
  - View basic dashboard (limited)
- **Cannot Do**:
  - Any administrative or operational functions

### Permission Helper Functions

Location: `/lib/services/user.service.ts`

```typescript
// Check if user can initiate transfers
canInitiateTransfers(user: { role: UserRole }): boolean
// Returns: true if role is 'CONTROLLER' or 'ADMIN'

// Check if user can approve transfers
canApproveTransfers(user: { role: UserRole }): boolean
// Returns: true if role is 'ADMIN'

// Check if user can view audit logs
canViewAuditLogs(user: { role: UserRole }): boolean
// Returns: true if role is 'AUDIT' or 'ADMIN'

// Check if user can manage other users
canManageUsers(user: { role: UserRole }): boolean
// Returns: true if role is 'ADMIN'
```

### Usage Example

```typescript
import { canInitiateTransfers } from '@/lib/services/user.service';

const session = await getServerSession(authOptions);

if (!canInitiateTransfers(session.user)) {
  return { 
    error: 'Insufficient permissions to initiate transfers',
    status: 403 
  };
}
```

---

## Database Schema

### Tables Overview

#### Users Table
Stores user accounts and authentication data.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role user_role DEFAULT 'NONE',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Key Constraints:**
- Email must be unique
- Role must be one of: 'CONTROLLER', 'AUDIT', 'ADMIN', 'NONE'

#### Accounts Table
Bank accounts that can send/receive transfers.

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_number VARCHAR(50) UNIQUE NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  minimum_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Key Constraints:**
- Account number must be unique
- Balance must be >= 0
- Minimum balance must be >= 0

#### Transactions Table
Records of money transfers between accounts.

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_account_id UUID NOT NULL REFERENCES accounts(id),
  to_account_id UUID NOT NULL REFERENCES accounts(id),
  amount DECIMAL(15, 2) NOT NULL,
  status transaction_status DEFAULT 'PENDING',
  initiated_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  requires_approval BOOLEAN DEFAULT false,
  description TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);
```

**Transaction Status Values:**
- `PENDING`: Initial state, validation in progress
- `AWAITING_APPROVAL`: Requires approval from ADMIN
- `APPROVED`: Approved and ready for execution
- `REJECTED`: Rejected by approver
- `COMPLETED`: Successfully executed
- `FAILED`: Execution failed

**Key Constraints:**
- Amount must be > 0
- from_account_id and to_account_id must be different
- All foreign keys must reference valid records

#### Approvals Table
Tracks approval workflow for transactions.

```sql
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'PENDING',
  decision VARCHAR(50),
  decision_notes TEXT,
  decided_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Status Values:**
- `PENDING`: Awaiting decision
- `APPROVED`: Approved
- `REJECTED`: Rejected

#### Audit Logs Table
Comprehensive logging of all system actions.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action audit_action NOT NULL,
  user_id UUID REFERENCES users(id),
  transaction_id UUID REFERENCES transactions(id),
  account_id UUID REFERENCES accounts(id),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Audit Action Types:**
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

---

## API Endpoints

### 1. Transfer Initiation

**Endpoint:** `POST /api/transfers/initiate`

**Purpose:** Initiate a new money transfer between accounts

**Required Role:** CONTROLLER or ADMIN

**Request Body:**
```json
{
  "fromAccountId": "uuid-string",
  "toAccountId": "uuid-string",
  "amount": 1000.50,
  "description": "Optional description"
}
```

**Request Headers:**
- `Cookie`: NextAuth session cookie (automatic)

**Response (Success - No Approval Required):**
```json
{
  "success": true,
  "message": "Transfer completed successfully",
  "transaction": {
    "id": "uuid-string",
    "from_account_id": "uuid-string",
    "to_account_id": "uuid-string",
    "amount": 1000.50,
    "status": "COMPLETED",
    "initiated_by": "uuid-string",
    "requires_approval": false,
    "description": "Optional description",
    "created_at": "2025-12-11T10:30:00Z",
    "completed_at": "2025-12-11T10:30:00Z"
  }
}
```

**Response (Success - Approval Required):**
```json
{
  "success": true,
  "message": "Transfer initiated and awaiting approval",
  "transaction": {
    "id": "uuid-string",
    "from_account_id": "uuid-string",
    "to_account_id": "uuid-string",
    "amount": 1000.50,
    "status": "AWAITING_APPROVAL",
    "initiated_by": "uuid-string",
    "requires_approval": true,
    "description": "Optional description",
    "created_at": "2025-12-11T10:30:00Z"
  }
}
```

**Response (Error):**
```json
{
  "error": "Insufficient funds in source account"
}
```

**HTTP Status Codes:**
- `200`: Success
- `400`: Bad request (validation error)
- `401`: Unauthorized (not logged in)
- `403`: Forbidden (insufficient permissions)
- `500`: Internal server error

**Business Rules:**
1. Transfers > $10,000 require approval
2. From and to accounts must be different
3. From account must have sufficient balance
4. Both accounts must be active
5. Amount must be positive

**Audit Trail:**
- Creates `TRANSFER_INITIATED` audit log
- If approval required: Creates `TRANSFER_AWAITING_APPROVAL` audit log
- If completed immediately: Creates `TRANSFER_COMPLETED` audit log

---

### 2. Process Approval

**Endpoint:** `POST /api/approvals/process`

**Purpose:** Approve or reject a pending transfer

**Required Role:** ADMIN

**Request Body:**
```json
{
  "transactionId": "uuid-string",
  "decision": "APPROVED",
  "notes": "Optional approval/rejection notes"
}
```

**Decision Values:**
- `APPROVED`: Approve and execute the transfer
- `REJECTED`: Reject and cancel the transfer

**Response (Success - Approved):**
```json
{
  "success": true,
  "message": "Transfer approved and completed successfully",
  "transaction": {
    "id": "uuid-string",
    "from_account_id": "uuid-string",
    "to_account_id": "uuid-string",
    "amount": 1000.50,
    "status": "COMPLETED",
    "initiated_by": "uuid-string",
    "approved_by": "uuid-string",
    "approved_at": "2025-12-11T10:35:00Z",
    "completed_at": "2025-12-11T10:35:00Z",
    "requires_approval": true,
    "description": "Transfer description",
    "created_at": "2025-12-11T10:30:00Z"
  }
}
```

**Response (Success - Rejected):**
```json
{
  "success": true,
  "message": "Transfer rejected",
  "transaction": {
    "id": "uuid-string",
    "status": "REJECTED",
    "approved_by": "uuid-string",
    "approved_at": "2025-12-11T10:35:00Z"
  }
}
```

**HTTP Status Codes:**
- `200`: Success
- `400`: Bad request (invalid decision, transaction not found, or not awaiting approval)
- `401`: Unauthorized
- `403`: Forbidden
- `500`: Internal server error

**Audit Trail:**
- Creates `TRANSFER_APPROVED` or `TRANSFER_REJECTED` audit log
- If approved: Creates `TRANSFER_COMPLETED` audit log
- Updates approval record with decision

---

### 3. Get Pending Approvals

**Endpoint:** `GET /api/approvals/pending`

**Purpose:** Retrieve all transfers awaiting approval

**Required Role:** ADMIN

**Query Parameters:**
- `limit` (optional): Number of results (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "approvals": [
    {
      "transaction_id": "uuid-string",
      "amount": 15000.00,
      "from_account_number": "ACC-001",
      "from_account_name": "Operating Account",
      "to_account_number": "ACC-002",
      "to_account_name": "Savings Account",
      "initiated_by_email": "controller@example.com",
      "initiated_by_name": "John Doe",
      "description": "Large transfer",
      "created_at": "2025-12-11T10:30:00Z"
    }
  ],
  "total": 5
}
```

**HTTP Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden
- `500`: Internal server error

---

### 4. Get Transactions

**Endpoint:** `GET /api/transactions`

**Purpose:** Query transactions with filtering

**Required Role:** Any authenticated user

**Query Parameters:**
- `initiatedBy` (optional): Filter by initiator user ID
- `approvedBy` (optional): Filter by approver user ID
- `minAmount` (optional): Minimum transaction amount
- `maxAmount` (optional): Maximum transaction amount
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)
- `status` (optional): Transaction status
- `limit` (optional): Results per page (default: 100, max: 1000)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid-string",
      "from_account_id": "uuid-string",
      "from_account_number": "ACC-001",
      "from_account_name": "Operating Account",
      "to_account_id": "uuid-string",
      "to_account_number": "ACC-002",
      "to_account_name": "Savings Account",
      "amount": 1000.50,
      "status": "COMPLETED",
      "initiated_by": "uuid-string",
      "initiated_by_email": "user@example.com",
      "initiated_by_first_name": "John",
      "initiated_by_last_name": "Doe",
      "approved_by": null,
      "approved_by_email": null,
      "requires_approval": false,
      "description": "Monthly transfer",
      "error_message": null,
      "created_at": "2025-12-11T10:30:00Z",
      "updated_at": "2025-12-11T10:30:00Z",
      "completed_at": "2025-12-11T10:30:00Z"
    }
  ],
  "total": 156
}
```

**HTTP Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `500`: Internal server error

---

### 5. Get Single Transaction

**Endpoint:** `GET /api/transfers/[id]`

**Purpose:** Get detailed information about a specific transaction

**Required Role:** Any authenticated user

**URL Parameters:**
- `id`: Transaction UUID

**Response:**
```json
{
  "id": "uuid-string",
  "from_account": {
    "id": "uuid-string",
    "account_number": "ACC-001",
    "account_name": "Operating Account",
    "balance": 50000.00
  },
  "to_account": {
    "id": "uuid-string",
    "account_number": "ACC-002",
    "account_name": "Savings Account",
    "balance": 75000.00
  },
  "amount": 15000.00,
  "status": "COMPLETED",
  "initiator": {
    "id": "uuid-string",
    "email": "controller@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "CONTROLLER"
  },
  "approver": {
    "id": "uuid-string",
    "email": "admin@example.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "role": "ADMIN"
  },
  "approval": {
    "id": "uuid-string",
    "status": "APPROVED",
    "decision": "APPROVED",
    "decision_notes": "Approved for processing",
    "decided_at": "2025-12-11T10:35:00Z"
  },
  "requires_approval": true,
  "description": "Large quarterly transfer",
  "created_at": "2025-12-11T10:30:00Z",
  "approved_at": "2025-12-11T10:35:00Z",
  "completed_at": "2025-12-11T10:35:00Z"
}
```

**HTTP Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `404`: Transaction not found
- `500`: Internal server error

---

### 6. Get Accounts

**Endpoint:** `GET /api/accounts`

**Purpose:** List all bank accounts

**Required Role:** Any authenticated user

**Response:**
```json
{
  "accounts": [
    {
      "id": "uuid-string",
      "account_number": "ACC-001",
      "account_name": "Operating Account",
      "balance": 50000.00,
      "minimum_balance": 1000.00,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2025-12-11T10:30:00Z"
    }
  ]
}
```

**HTTP Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `500`: Internal server error

---

### 7. Get Single Account

**Endpoint:** `GET /api/accounts/[id]`

**Purpose:** Get detailed information about a specific account

**Required Role:** Any authenticated user

**URL Parameters:**
- `id`: Account UUID

**Response:**
```json
{
  "id": "uuid-string",
  "account_number": "ACC-001",
  "account_name": "Operating Account",
  "balance": 50000.00,
  "minimum_balance": 1000.00,
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2025-12-11T10:30:00Z"
}
```

**HTTP Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `404`: Account not found
- `500`: Internal server error

**Audit Trail:**
- Creates `ACCOUNT_VIEWED` audit log

---

### 8. Get Dashboard Statistics

**Endpoint:** `GET /api/dashboard`

**Purpose:** Get system-wide statistics for dashboard

**Required Role:** Any authenticated user

**Response:**
```json
{
  "stats": {
    "total_transactions": 4272,
    "pending_approvals": 5,
    "completed_today": 23,
    "total_volume_today": 156780.50,
    "failed_transactions": 12,
    "active_accounts": 8
  }
}
```

**HTTP Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `500`: Internal server error

---

### 9. Get Dashboard Charts Data

**Endpoint:** `GET /api/dashboard/charts`

**Purpose:** Get time-series data for dashboard charts

**Required Role:** Any authenticated user

**Query Parameters:**
- `days` (required): Number of days (7, 28, or 365)

**Response:**
```json
{
  "transactionTrends": [
    {
      "date": "2025-12-11",
      "count": 23
    },
    {
      "date": "2025-12-10",
      "count": 18
    }
  ],
  "volumeTrends": [
    {
      "date": "2025-12-11",
      "volume": 156780.50
    },
    {
      "date": "2025-12-10",
      "volume": 142350.00
    }
  ],
  "statusBreakdown": [
    {
      "name": "Success",
      "value": 3842
    },
    {
      "name": "In Progress",
      "value": 8
    },
    {
      "name": "Failed",
      "value": 422
    }
  ]
}
```

**HTTP Status Codes:**
- `200`: Success
- `400`: Invalid days parameter
- `401`: Unauthorized
- `500`: Internal server error

---

### 10. Get Audit Logs

**Endpoint:** `GET /api/audit`

**Purpose:** Query audit logs with filtering

**Required Role:** AUDIT or ADMIN

**Query Parameters:**
- `action` (optional, multiple): Filter by action type(s)
- `userId` (optional): Filter by user ID
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)
- `limit` (optional): Results per page (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Example Request:**
```
GET /api/audit?action=TRANSFER_INITIATED&action=TRANSFER_COMPLETED&startDate=2025-12-01&limit=50&offset=0
```

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid-string",
      "action": "TRANSFER_INITIATED",
      "user_id": "uuid-string",
      "user_email": "controller@example.com",
      "user_name": "John Doe",
      "transaction_id": "uuid-string",
      "account_id": null,
      "details": {
        "from_account": "uuid-string",
        "to_account": "uuid-string",
        "amount": 1000.50,
        "ip_address": "192.168.1.100",
        "user_agent": "Mozilla/5.0..."
      },
      "created_at": "2025-12-11T10:30:00Z"
    }
  ],
  "total": 3349
}
```

**HTTP Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden (not AUDIT or ADMIN role)
- `500`: Internal server error

**Audit Trail:**
- Creates `AUDIT_LOG_VIEWED` audit log

---

### 11. Get Users

**Endpoint:** `GET /api/users`

**Purpose:** List all users in the system

**Required Role:** ADMIN

**Response:**
```json
{
  "users": [
    {
      "id": "uuid-string",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "CONTROLLER",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2025-12-11T10:30:00Z"
    }
  ]
}
```

**HTTP Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden
- `500`: Internal server error

---

### 12. Update User Role

**Endpoint:** `PATCH /api/users`

**Purpose:** Change a user's role

**Required Role:** ADMIN

**Request Body:**
```json
{
  "userId": "uuid-string",
  "role": "ADMIN"
}
```

**Valid Roles:**
- `CONTROLLER`
- `AUDIT`
- `ADMIN`
- `NONE`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "ADMIN",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2025-12-11T10:30:00Z"
  }
}
```

**HTTP Status Codes:**
- `200`: Success
- `400`: Invalid role or user not found
- `401`: Unauthorized
- `403`: Forbidden
- `500`: Internal server error

**Audit Trail:**
- Creates `USER_ROLE_CHANGED` audit log

---

## Workflows & Business Logic

### Transfer Workflow

#### Scenario 1: Simple Transfer (No Approval Required)

**Conditions:**
- Amount ≤ $10,000
- Both accounts active
- Sufficient funds

**Flow:**
```
1. User calls POST /api/transfers/initiate
2. System validates:
   - User has CONTROLLER or ADMIN role
   - Both accounts exist and are active
   - From account has sufficient balance (amount + maintain minimum_balance)
   - from_account_id ≠ to_account_id
   - amount > 0
3. System creates transaction with status=PENDING
4. System logs TRANSFER_INITIATED
5. System executes transfer:
   - Deducts from source account
   - Adds to destination account
   - Updates transaction status=COMPLETED
   - Sets completed_at timestamp
6. System logs TRANSFER_COMPLETED
7. Returns success response
```

#### Scenario 2: Transfer Requiring Approval

**Conditions:**
- Amount > $10,000 OR
- Other approval trigger conditions

**Flow:**
```
1. User calls POST /api/transfers/initiate
2. System validates (same as above)
3. System creates transaction with:
   - status=AWAITING_APPROVAL
   - requires_approval=true
4. System creates approval record with status=PENDING
5. System logs TRANSFER_INITIATED
6. System logs TRANSFER_AWAITING_APPROVAL
7. Returns success response (transaction awaiting approval)

--- Separate interaction ---

8. Admin calls GET /api/approvals/pending to see pending transfers
9. Admin calls POST /api/approvals/process with decision

If APPROVED:
10a. System validates approver has ADMIN role
11a. System executes transfer (deduct/add balances)
12a. Updates transaction status=COMPLETED
13a. Updates approval record with decision=APPROVED
14a. Sets approved_by, approved_at, completed_at
15a. Logs TRANSFER_APPROVED
16a. Logs TRANSFER_COMPLETED
17a. Returns success response

If REJECTED:
10b. System validates approver has ADMIN role
11b. Updates transaction status=REJECTED
12b. Updates approval record with decision=REJECTED
13b. Sets approved_by, approved_at (no completed_at)
14b. Logs TRANSFER_REJECTED
15b. Returns success response
```

#### Scenario 3: Transfer Failure

**Conditions:**
- Validation fails OR
- Insufficient funds OR
- Account inactive OR
- Database error

**Flow:**
```
1. User calls POST /api/transfers/initiate
2. System validates
3. Validation fails or error occurs
4. System creates transaction with:
   - status=FAILED
   - error_message="Detailed error"
5. System logs TRANSFER_INITIATED
6. System logs TRANSFER_FAILED
7. Returns error response with 400 or 500 status
```

### Balance Check Logic

When validating sufficient funds:

```typescript
const requiredBalance = amount + fromAccount.minimum_balance;
if (fromAccount.balance < requiredBalance) {
  throw new Error('Insufficient funds');
}
```

**Example:**
- Account balance: $50,000
- Minimum balance: $1,000
- Transfer amount: $49,500
- Required: $49,500 + $1,000 = $50,500
- Result: FAIL (insufficient funds)

---

## Error Handling

### Standard Error Response Format

```json
{
  "error": "Human-readable error message"
}
```

### Common Error Scenarios

#### Authentication Errors (401)
```json
{
  "error": "Unauthorized"
}
```
**Cause:** No valid session found

#### Permission Errors (403)
```json
{
  "error": "Forbidden: Insufficient permissions to initiate transfers"
}
```
**Causes:**
- User role lacks required permission
- User account is inactive

#### Validation Errors (400)
```json
{
  "error": "Missing required fields: fromAccountId, toAccountId, amount"
}
```
**Causes:**
- Missing required fields
- Invalid data types
- Invalid values (negative amounts, invalid UUIDs, etc.)
- Business rule violations

#### Not Found Errors (404)
```json
{
  "error": "Transaction not found"
}
```
**Causes:**
- Resource doesn't exist
- User doesn't have access

#### Server Errors (500)
```json
{
  "error": "Internal server error"
}
```
**Causes:**
- Database connection failures
- Unexpected exceptions
- Data integrity violations

### Error Handling Best Practices for AI Chatbot

1. **Always check HTTP status code first**
2. **Parse error message for user-friendly explanation**
3. **For 401 errors:** Prompt user to sign in
4. **For 403 errors:** Explain permission requirements
5. **For 400 errors:** Help user correct input
6. **For 500 errors:** Suggest trying again or contacting support

---

## Security Considerations

### Authentication

1. **Session Management**
   - Sessions expire after 24 hours
   - Session stored as HTTP-only cookie
   - JWT tokens contain user role and ID

2. **Password Security**
   - Passwords hashed with bcrypt (10 rounds)
   - Never returned in API responses
   - Never logged in audit trails

### Authorization

1. **Role-Based Access Control (RBAC)**
   - Every endpoint checks user role
   - Helper functions centralize permission logic
   - Consistent enforcement across all routes

2. **Resource-Level Security**
   - Users can only see/modify authorized resources
   - Transactions linked to user accounts
   - Audit logs restricted to AUDIT/ADMIN roles

### Audit Trail

1. **Comprehensive Logging**
   - All state-changing operations logged
   - IP address and user agent captured
   - Immutable audit log (no updates/deletes)

2. **Audit Log Details**
   - User ID (who)
   - Action type (what)
   - Timestamp (when)
   - IP address (where from)
   - Related resource IDs (what resource)
   - JSON details (additional context)

### API Security

1. **Input Validation**
   - All inputs validated for type and format
   - SQL injection prevented via parameterized queries
   - Amount validation (positive, non-zero)
   - UUID format validation

2. **Rate Limiting**
   - Consider implementing rate limiting for production
   - Especially for authentication endpoints

3. **HTTPS**
   - Always use HTTPS in production
   - Protect session cookies in transit

---

## AI Chatbot Integration Guidelines

### Determining User Context

Before any operation, always:

1. **Get current session:**
```typescript
const session = await getServerSession(authOptions);
if (!session?.user) {
  return "You need to sign in first.";
}
```

2. **Check user role:**
```typescript
const userRole = session.user.role;
const userName = `${session.user.first_name} ${session.user.last_name}`;
```

3. **Verify permissions:**
```typescript
if (!canInitiateTransfers(session.user)) {
  return `Sorry ${userName}, your role (${userRole}) doesn't allow initiating transfers.`;
}
```

### Common User Requests

#### "Initiate a transfer"

1. **Check permission** (CONTROLLER or ADMIN)
2. **Ask for details:**
   - From account (number or name)
   - To account (number or name)
   - Amount
   - Description (optional)
3. **Get account IDs:**
   - Call `GET /api/accounts`
   - Match by account_number or account_name
4. **Call API:**
   - `POST /api/transfers/initiate`
5. **Interpret response:**
   - If requires_approval: "Transfer submitted for approval"
   - If completed: "Transfer completed successfully"
   - If error: Explain error and suggest correction

#### "Approve pending transfers"

1. **Check permission** (ADMIN only)
2. **Get pending approvals:**
   - Call `GET /api/approvals/pending`
3. **Present list to user**
4. **Get decision:**
   - Which transaction (by ID or select from list)
   - Approve or reject
   - Notes (optional)
5. **Call API:**
   - `POST /api/approvals/process`
6. **Confirm result**

#### "Check account balance"

1. **Any authenticated user can do this**
2. **Ask which account** (number or name)
3. **Call API:**
   - `GET /api/accounts`
   - Find matching account
4. **Return balance** with formatting

#### "View recent transactions"

1. **Any authenticated user can do this**
2. **Optional filters:**
   - Date range
   - Status
   - Amount range
3. **Call API:**
   - `GET /api/transactions` with query params
4. **Present results** in readable format

#### "View my role"

1. **Access session:**
   - `session.user.role`
2. **Explain role capabilities**

### Response Formatting

**Good Response Examples:**

```
✅ Transfer completed successfully!
   From: Operating Account (ACC-001)
   To: Savings Account (ACC-002)
   Amount: $1,000.50
   Status: Completed
   Transaction ID: abc-123-def
```

```
⏳ Transfer submitted for approval
   Amount: $15,000.00
   From: Operating Account
   To: Vendor Payment Account
   
   This transfer requires approval because it exceeds $10,000.
   An admin will review it shortly.
   Transaction ID: xyz-789-ghi
```

```
❌ Unable to complete transfer
   Error: Insufficient funds
   
   Operating Account has $5,000.00 available
   (Balance: $6,000.00 - Minimum: $1,000.00)
   You tried to transfer: $6,000.00
   
   Please reduce the amount or choose a different account.
```

### Error Recovery

When an error occurs:

1. **Explain what went wrong** in plain language
2. **Suggest corrective action**
3. **Offer alternatives** if available
4. **Ask if user wants to try again** with corrections

### Security Reminders

1. **Never expose:**
   - Password hashes
   - Session tokens
   - Internal error stack traces
   - Database query details

2. **Always validate:**
   - User has current session
   - User has required permissions
   - Input data types and formats
   - Business rules before API calls

3. **Provide helpful feedback:**
   - Clear error messages
   - Permission explanations
   - Next steps

---

## Quick Reference

### Permission Matrix

| Action | CONTROLLER | ADMIN | AUDIT | NONE |
|--------|-----------|-------|-------|------|
| Initiate Transfer | ✅ | ✅ | ❌ | ❌ |
| Approve Transfer | ❌ | ✅ | ❌ | ❌ |
| View Transactions | ✅ | ✅ | ✅ | ❌ |
| View Audit Logs | ❌ | ✅ | ✅ | ❌ |
| Manage Users | ❌ | ✅ | ❌ | ❌ |
| View Accounts | ✅ | ✅ | ✅ | ❌ |
| View Dashboard | ✅ | ✅ | ✅ | Limited |

### Status Flow

```
PENDING → AWAITING_APPROVAL → APPROVED → COMPLETED
                            ↘ REJECTED

PENDING → COMPLETED (if no approval required)

PENDING → FAILED (if validation fails)
```

### Key Business Rules

1. **Transfer amount > $10,000** → Requires approval
2. **Account balance** must cover amount + minimum_balance
3. **From and to accounts** must be different
4. **Amount** must be positive (> 0)
5. **Both accounts** must be active
6. **Admin can approve** their own transfers
7. **Session expires** after 24 hours

---

## Appendix: Sample Test Data

### Test Users

```
Email: controller@example.com
Role: CONTROLLER
Name: John Controller

Email: admin@example.com
Role: ADMIN
Name: Jane Admin

Email: audit@example.com
Role: AUDIT
Name: Bob Audit
```

### Test Accounts

```
Account Number: ACC-001
Name: Operating Account
Balance: ~$50,000

Account Number: ACC-002
Name: Savings Account
Balance: ~$75,000

Account Number: ACC-003
Name: Payroll Account
Balance: ~$100,000

Account Number: ACC-004
Name: Vendor Payments
Balance: ~$25,000
```

### Sample Transfer Scenarios

**Small Transfer (No Approval):**
- From: ACC-001
- To: ACC-002
- Amount: $500
- Expected: Immediate completion

**Large Transfer (Requires Approval):**
- From: ACC-003
- To: ACC-004
- Amount: $25,000
- Expected: Awaiting approval

**Insufficient Funds:**
- From: ACC-004
- To: ACC-001
- Amount: $30,000
- Expected: Error (balance $25,000)

---

## Document Version

**Version:** 1.0  
**Last Updated:** December 11, 2025  
**System Version:** Next.js 16.0.10, React 19.2.1  
**Database Schema Version:** 1.0

---

## Support & Troubleshooting

### Common Issues

**Issue:** 401 Unauthorized
- **Solution:** User needs to sign in via POST /api/auth/signin

**Issue:** 403 Forbidden
- **Solution:** Check user role and required permissions for the action

**Issue:** "Insufficient funds"
- **Solution:** Check account balance minus minimum_balance

**Issue:** "Transaction not found"
- **Solution:** Verify transaction ID is correct and user has access

**Issue:** Session expired
- **Solution:** User needs to sign in again (24-hour expiry)

### Getting Help

For issues not covered in this documentation:
1. Check audit logs for transaction history
2. Verify database schema matches version 1.0
3. Review server logs for detailed error messages
4. Ensure all environment variables are set correctly

---

**End of Documentation**
