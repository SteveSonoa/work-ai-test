# Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- npm or yarn package manager

## Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=banking_system
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

### 3. Initialize Database
```bash
npm run db:setup
```

This creates tables and seeds test data.

### 4. Start Development Server
```bash
npm run dev
```

### 5. Open Application
Navigate to [http://localhost:3000](http://localhost:3000)

## Login
Use any of these test accounts:

**Admin** (full access):
- Email: `admin1@bank.com`
- Password: `password123`

**Controller** (initiate transfers):
- Email: `controller1@bank.com`
- Password: `password123`

**Audit** (view-only):
- Email: `audit1@bank.com`
- Password: `password123`

## Quick Tour

### As Admin
1. **Login** at `/auth/signin`
2. **Dashboard** - See overview statistics
3. **Accounts** - View all bank accounts
4. **Transfer** - Create a new transfer
   - Try amount < $1M (processes immediately)
   - Try amount > $1M (requires approval)
5. **Approvals** - Review and approve/reject pending transfers
6. **Users** - Manage user roles
7. **Audit** - View complete audit trail

### As Controller
1. **Dashboard** - View statistics
2. **Accounts** - Browse accounts
3. **Transfer** - Initiate transfers
   - Large transfers will show "Pending Approval" status

### As Audit
1. **Dashboard** - View statistics
2. **Accounts** - Browse accounts (read-only)
3. **Audit** - View full audit trail with filters

## Test the Approval Workflow

1. **Login as Controller** (`controller1@bank.com`)
2. **Create large transfer**: Go to `/transfer`
   - From: Select any account
   - To: Select different account
   - Amount: `1500000` ($1.5M)
   - Click "Initiate Transfer"
3. **View Transaction Status**: You'll be redirected to the status page
   - See visual flowchart with green checkmarks for completed steps
   - Yellow "Awaiting Approval" banner with spinner
   - View complete transaction details and audit trail
4. **Logout** and **Login as Admin** (`admin1@bank.com`)
5. **Go to Approvals**: `/approvals`
6. **Approve or Reject** the pending transfer
7. **View Updated Status**: Go back to transaction status page
   - If approved: See "Transfer In Progress" with execution spinner
   - If rejected: See red "Transfer Rejected" with error details

## Test Transaction Status Page

Create sample transactions with different statuses:
```bash
npm run db:test-transactions
```

This creates 6 test transactions demonstrating all possible states:
- **COMPLETED**: Small transfer finished successfully (green checkmarks)
- **PENDING**: Transfer currently being processed (blue spinner)
- **AWAITING_APPROVAL**: Large transfer waiting for approval (yellow banner)
- **REJECTED**: Transfer rejected by approver (red X with notes)
- **FAILED**: Transfer failed validation (red error message)
- **APPROVED**: Transfer approved but not yet executed (blue processing)

Visit the transaction URLs shown in the terminal output to see each status.

## Database Management

**Reset database** (deletes all data):
```bash
npm run db:reset
```

**Test connection**:
```bash
npm run db:test
```

**View database** (using psql):
```bash
psql -U your_user -d banking_system
```

Useful queries:
```sql
-- View all accounts
SELECT * FROM accounts;

-- View all transactions
SELECT * FROM transactions;

-- View pending approvals
SELECT t.*, a.status as approval_status 
FROM transactions t 
LEFT JOIN approvals a ON t.id = a.transaction_id 
WHERE t.requires_approval = true;

-- View audit log
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20;
```

## Common Issues

### Port 3000 already in use
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

### Database connection error
- Check PostgreSQL is running: `pg_isready`
- Verify credentials in `.env.local`
- Ensure database exists: `createdb banking_system`

### Can't login
- Verify database has seed data: `npm run db:seed`
- Check browser console for errors (F12)
- Ensure NEXTAUTH_SECRET is set in `.env.local`

### Middleware warning
The "middleware deprecated" warning is expected in Next.js 16 and can be ignored.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Project Structure
```
/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/signin/       # Login page
│   ├── dashboard/         # Dashboard page
│   ├── accounts/          # Accounts pages
│   ├── transfer/          # Transfer form
│   ├── approvals/         # Approval queue
│   ├── users/             # User management
│   └── audit/             # Audit log viewer
├── components/            # Reusable UI components
│   └── ui/               # Base UI components
├── lib/                   # Business logic
│   ├── db/               # Database utilities
│   ├── services/         # Service layer
│   ├── types/            # TypeScript types
│   └── utils/            # Utility functions
├── __tests__/            # Test files
└── scripts/              # Database scripts
```

## Next Steps

1. **Explore the Dashboard** - See system statistics
2. **Create Some Transfers** - Try different amounts
3. **Test Approval Workflow** - Create transfers > $1M
4. **View Audit Logs** - Track all actions
5. **Manage Users** - Assign roles (Admin only)

## Production Deployment

Before deploying to production:

1. **Change all default passwords**
2. **Use strong NEXTAUTH_SECRET**
3. **Set NODE_ENV=production**
4. **Configure production database**
5. **Enable HTTPS**
6. **Set up database backups**
7. **Configure logging**
8. **Set up monitoring**

## Support

For issues or questions, refer to:
- `README.md` - Project overview
- `SETUP.md` - Detailed setup guide
- `ARCHITECTURE.md` - System design
- `IMPLEMENTATION.md` - Technical details
- `PROJECT_SUMMARY.md` - Feature summary

## Development Tips

- **Hot reload** is enabled - changes reflect automatically
- **Check browser console** for client-side errors
- **Check terminal** for server-side errors
- **Use dev tools** - React DevTools and Network tab are helpful
- **Database GUI** - Consider using pgAdmin or TablePlus

Enjoy exploring the Banking Transfer System! 🏦
