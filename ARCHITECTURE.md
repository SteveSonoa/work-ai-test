# Architecture Documentation

## System Overview

This is a full-stack banking transfer management system built with Next.js 16, featuring:
- Role-based access control
- Human-in-the-loop approval workflows
- Comprehensive audit trails
- AA accessibility compliance
- 100% test coverage target

## Technology Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Backend**: Next.js API Routes, PostgreSQL, node-postgres (pg)
- **Authentication**: NextAuth v4 with Credentials Provider
- **Testing**: Jest, React Testing Library
- **Language**: TypeScript

## Database Architecture

### Schema Design Principles

1. **Referential Integrity**: All foreign keys with proper constraints
2. **Audit Trail**: Immutable audit logs with JSONB for flexibility
3. **Status Tracking**: Enums for transaction and approval states
4. **Performance**: Indexes on frequently queried columns
5. **Timestamps**: Automatic tracking with triggers

### Key Tables

#### users
Stores user information and roles. Password hashed with bcrypt (10 rounds).

#### accounts
Bank accounts with balance tracking and minimum balance requirements.

#### transactions
Transfer records with status tracking and approval requirements.
- Amounts over $1M automatically require approval
- Constraint: `from_account_id != to_account_id`
- Constraint: `amount > 0`

#### approvals
Tracks approval workflow for high-value transfers.
- Linked to transactions via FK
- Stores approver, decision, and notes

#### audit_logs
Immutable audit trail for all system actions.
- JSONB details for flexible metadata
- IP address and user agent tracking
- No UPDATE or DELETE operations

## Application Architecture

### Layered Architecture

```
┌─────────────────────────────────────┐
│   Presentation Layer (UI)           │
│   - React Components                │
│   - Pages (Server Components)       │
│   - Client Components (Forms)       │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│   API Layer (Route Handlers)        │
│   - Authentication checks           │
│   - Input validation                │
│   - Error handling                  │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│   Service Layer (Business Logic)    │
│   - Transfer validation             │
│   - Approval workflow               │
│   - Audit logging                   │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│   Data Access Layer (Database)      │
│   - Connection pooling              │
│   - Transaction management          │
│   - Query execution                 │
└─────────────────────────────────────┘
```

### Service Layer

Each service is a TypeScript module with focused responsibilities:

**audit.service.ts**: Audit trail management
- Creates immutable audit logs
- Supports complex filtering
- Joins with related entities

**transfer.service.ts**: Transfer operations
- Balance validation
- Minimum balance checks
- Transfer execution
- Status tracking

**approval.service.ts**: Approval workflow
- Assigns to admins (excluding initiator)
- Tracks approval decisions
- Triggers transfer execution

**account.service.ts**: Account management
- Balance queries
- Transaction history
- Account validation

**user.service.ts**: User management
- Authentication (bcrypt)
- Role management
- Permission checks

**dashboard.service.ts**: Statistics and health
- Real-time metrics
- System health checks
- Recent activity

## Authentication & Authorization

### NextAuth Configuration

- **Provider**: Credentials (email/password)
- **Session**: JWT (24-hour expiry)
- **Callbacks**: Custom JWT and session callbacks
- **Pages**: Custom sign-in page

### Role-Based Access Control (RBAC)

| Permission | CONTROLLER | AUDIT | ADMIN |
|-----------|-----------|-------|-------|
| View Dashboard | ✅ | ✅ | ✅ |
| View Accounts | ✅ | ✅ | ✅ |
| Initiate Transfer | ✅ | ❌ | ✅ |
| Approve Transfer | ❌ | ❌ | ✅ |
| View Audit Logs | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ✅ |

### Authorization Checks

1. **Server-side** (preferred):
   ```typescript
   const user = await requireRole(['ADMIN', 'CONTROLLER']);
   ```

2. **API Routes**:
   ```typescript
   const session = await getServerSession(authOptions);
   if (!session?.user) return 401;
   if (!canInitiateTransfers(session.user)) return 403;
   ```

3. **Client-side** (UI only):
   ```typescript
   const { data: session } = useSession();
   {canApprove && <Button>Approve</Button>}
   ```

## Transfer Flow

### Standard Transfer (≤ $1M)

```
[User Initiates] → [Validate] → [Execute] → [Complete]
       ↓               ↓            ↓            ↓
  [Audit Log]    [Audit Log]  [Audit Log]  [Audit Log]
```

### High-Value Transfer (> $1M)

```
[User Initiates] → [Validate] → [Awaiting Approval]
       ↓               ↓                  ↓
  [Audit Log]    [Audit Log]        [Audit Log]
                                          ↓
                            [Admin Reviews (not initiator)]
                                          ↓
                                 [Approved / Rejected]
                                          ↓
                                    [Audit Log]
                                          ↓
                                   [If Approved]
                                          ↓
                                     [Execute]
                                          ↓
                                    [Complete]
                                          ↓
                                    [Audit Log]
```

### Validation Rules

1. **Amount**: Must be > 0
2. **Accounts**: Must be different
3. **Source Account**: Must have sufficient balance
4. **Minimum Balance**: Source must maintain minimum after transfer
5. **Account Status**: Both accounts must be active

### Error Handling

- Validation errors: Return 400 with descriptive message
- Insufficient balance: Return 400 with current balance
- Database errors: Return 500, log to audit trail
- Failed transfers: Mark as FAILED in database

## API Design

### RESTful Conventions

- **GET**: Read operations
- **POST**: Create operations
- **PATCH**: Update operations
- **DELETE**: Delete operations (rare, audit trail)

### Response Format

Success:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

Error:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE" // Optional
}
```

### Query Parameters

All list endpoints support:
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)
- `startDate`: Filter by start date
- `endDate`: Filter by end date

### Authentication

All API routes except `/api/auth/*` require authentication.

## Audit Trail

### Audit Actions

- `USER_LOGIN` / `USER_LOGOUT`
- `TRANSFER_INITIATED`
- `TRANSFER_VALIDATED`
- `TRANSFER_AWAITING_APPROVAL`
- `TRANSFER_APPROVED` / `TRANSFER_REJECTED`
- `TRANSFER_COMPLETED` / `TRANSFER_FAILED`
- `BALANCE_CHECKED`
- `USER_ROLE_CHANGED`
- `ACCOUNT_VIEWED`
- `AUDIT_LOG_VIEWED`

### Audit Log Structure

```typescript
{
  id: UUID,
  action: AuditAction,
  user_id?: UUID,
  transaction_id?: UUID,
  account_id?: UUID,
  details: JSONB,        // Flexible metadata
  ip_address: string,
  user_agent: string,
  created_at: Date
}
```

### Details JSONB Examples

```json
// Transfer initiated
{
  "from_account_id": "...",
  "to_account_id": "...",
  "amount": 150000,
  "requires_approval": false
}

// Transfer approved
{
  "approved_by": "admin-user-id",
  "notes": "Verified with accounting department"
}

// Role changed
{
  "target_user_id": "...",
  "old_role": "CONTROLLER",
  "new_role": "ADMIN"
}
```

## Accessibility (A11Y)

### Implementation Checklist

✅ **Semantic HTML**
- `<main>`, `<nav>`, `<section>`, `<article>`
- Proper heading hierarchy (h1 → h2 → h3)
- `<form>` elements for all forms

✅ **ARIA Attributes**
- `aria-label` on icon buttons
- `aria-describedby` on form inputs
- `aria-live="polite"` for dynamic content
- `aria-busy` for loading states
- `aria-current` for navigation

✅ **Keyboard Navigation**
- All interactive elements focusable
- Logical tab order
- Visible focus indicators
- Escape to close modals

✅ **Form Accessibility**
- `<label>` associated with inputs
- Required fields marked with `aria-required`
- Error messages with `role="alert"`
- Helper text with `aria-describedby`

✅ **Color Contrast**
- Text: 4.5:1 minimum (AA)
- Large text: 3:1 minimum
- UI components: 3:1 minimum

✅ **Screen Reader Support**
- Alt text on images
- Table headers with `scope`
- `sr-only` classes for context
- Descriptive link text

### Testing A11Y

```bash
# Using jest-axe
npm run test:a11y

# Manual testing
# 1. Navigate with keyboard only
# 2. Test with screen reader (NVDA/JAWS)
# 3. Use browser DevTools Lighthouse
```

## Performance Optimization

### Database

1. **Connection Pooling**: Max 20 connections
2. **Indexes**: All foreign keys and frequently queried columns
3. **Prepared Statements**: Parameterized queries
4. **Transactions**: ACID compliance for transfers

### Application

1. **Server Components**: Default for static content
2. **Client Components**: Only for interactivity
3. **Data Fetching**: Server-side in Server Components
4. **Caching**: `cache: 'no-store'` for real-time data

### Frontend

1. **Code Splitting**: Automatic with Next.js
2. **Lazy Loading**: Dynamic imports for heavy components
3. **Image Optimization**: Next.js Image component
4. **CSS**: Tailwind with purging

## Security

### Best Practices Implemented

1. **Password Security**
   - bcrypt hashing (10 rounds)
   - Never stored in plain text
   - Never returned in API responses

2. **SQL Injection Prevention**
   - Parameterized queries only
   - No string concatenation in SQL
   - Input validation before database

3. **XSS Prevention**
   - React automatic escaping
   - DOMPurify for user-generated HTML (if needed)
   - Content Security Policy headers

4. **CSRF Protection**
   - NextAuth built-in CSRF tokens
   - Same-Site cookies
   - Origin validation

5. **Authentication**
   - JWT with expiry
   - Secure session management
   - Server-side session validation

6. **Authorization**
   - Role checks on every API route
   - Server-side authorization (never client-only)
   - Principle of least privilege

7. **Audit Trail**
   - All sensitive actions logged
   - IP address and user agent tracking
   - Immutable logs

### Security Headers

```typescript
// middleware.ts
{
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=()'
}
```

## Testing Strategy

### Test Pyramid

```
       ┌───────────────┐
       │  E2E Tests    │ 10%
       │   (Cypress)   │
       ├───────────────┤
       │ Integration   │ 30%
       │     Tests     │
       ├───────────────┤
       │   Unit Tests  │ 60%
       │  (Jest + RTL) │
       └───────────────┘
```

### Unit Tests

- Services (business logic)
- Utilities and helpers
- Pure functions
- Coverage: 100%

### Integration Tests

- API routes
- Database operations
- Service interactions
- Coverage: 100%

### Component Tests

- UI components
- User interactions
- Accessibility
- Coverage: 100%

### E2E Tests (Future)

- Critical user flows
- Transfer workflow
- Approval workflow

## Deployment

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Strong NEXTAUTH_SECRET set
- [ ] Database backups configured
- [ ] Error tracking (Sentry)
- [ ] Logging configured
- [ ] SSL/TLS certificates
- [ ] Rate limiting configured
- [ ] Security headers set
- [ ] CORS configured
- [ ] Health check endpoint
- [ ] Performance monitoring

### Recommended Infrastructure

```
[Load Balancer]
      ↓
[Next.js App] × N instances
      ↓
[PostgreSQL Primary]
      ↓
[PostgreSQL Replica] (Read)
      ↓
[Backup Storage]
```

## Monitoring

### Key Metrics

1. **Performance**
   - API response times
   - Database query times
   - Page load times

2. **Business**
   - Transfers per hour
   - Pending approvals
   - Failed transfers
   - Average transfer amount

3. **System**
   - Database connections
   - Memory usage
   - CPU usage
   - Error rates

4. **Security**
   - Failed login attempts
   - Permission denials
   - Unusual access patterns

## Future Enhancements

1. **Email Notifications**: Approval requests, completed transfers
2. **Webhook Support**: Integration with external systems
3. **Bulk Transfers**: Upload CSV for multiple transfers
4. **Scheduled Transfers**: Future-dated transfers
5. **Transfer Templates**: Save frequent transfer patterns
6. **Advanced Reporting**: Export capabilities, charts
7. **2FA**: Two-factor authentication
8. **API Rate Limiting**: Prevent abuse
9. **Websockets**: Real-time updates
10. **Mobile App**: React Native companion app
