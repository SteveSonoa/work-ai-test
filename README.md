# Bank Transfer System

A comprehensive banking transfer management system with human-in-the-loop approval workflows, role-based access control, and full audit trail capabilities.

## Features

- ✅ **Authentication & Authorization**: NextAuth with email/password, role-based access control (ADMIN, CONTROLLER, AUDIT)
- ✅ **Transfer Management**: Initiate transfers with balance validation and minimum balance checks
- ✅ **Approval Workflow**: Automatic approval requirement for transfers over $1,000,000
- ✅ **Transaction Status Tracking**: Visual flowchart showing transfer progress with color-coded status indicators
- ✅ **Audit Trail**: Comprehensive logging of all actions for compliance
- ✅ **Dashboard**: Real-time statistics and system health monitoring
- ✅ **Account Management**: View accounts, balances, and transaction history
- ✅ **User Management**: Admin interface for role assignment
- ✅ **Accessibility**: AA compliant with semantic HTML, ARIA labels, and keyboard navigation

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.local.example .env.local
# Edit .env.local with your database credentials
```

### 3. Setup Database
```bash
createdb banking_system  # Create PostgreSQL database
npm run db:setup          # Initialize schema and seed data
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with:
- **Admin**: admin1@bank.com / password123
- **Controller**: controller1@bank.com / password123
- **Audit**: audit1@bank.com / password123

## Architecture

This system implements a complete banking transfer workflow with:

### Core Features
- **Transfer Management**: Initiate, validate, and execute transfers
- **Approval Workflow**: Transfers over $1,000,000 require admin approval
- **Balance Validation**: Ensures sufficient funds and minimum balance requirements
- **Audit Trail**: Every action logged with user, timestamp, and IP address
- **Role-Based Access**: Four role types with granular permissions
- **API Health Monitoring**: Dashboard shows real-time system status

### Technology Stack
- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Backend**: Next.js API Routes, PostgreSQL, node-postgres
- **Auth**: NextAuth v4 with JWT sessions
- **Testing**: Jest + React Testing Library (setup complete)

### Database Schema
- `users` - Authentication and role management
- `accounts` - Bank accounts with balance tracking
- `transactions` - Transfer records with status tracking
- `approvals` - Human-in-the-loop approval workflow
- `audit_logs` - Immutable audit trail

## Project Structure

```
work-ai-test/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard page
│   ├── accounts/          # Account pages
│   ├── transfer/          # Transfer form
│   ├── approvals/         # Approval queue
│   ├── transactions/      # Transaction status pages
│   ├── users/             # User management
│   ├── audit/             # Audit log viewer
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── Navigation.tsx    # Main navigation
├── lib/                   # Business logic
│   ├── auth/             # Authentication utilities
│   ├── db/               # Database connection
│   ├── services/         # Business logic services
│   └── types/            # TypeScript types
├── scripts/              # Utility scripts
└── __tests__/            # Test files

## Documentation

- **[QUICKSTART.md](./QUICKSTART.md)**: 5-minute quick start guide
- **[SETUP.md](./SETUP.md)**: Detailed setup instructions and troubleshooting
- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: System architecture and design decisions
- **[IMPLEMENTATION.md](./IMPLEMENTATION.md)**: Complete implementation status
- **[TRANSACTION_STATUS.md](./TRANSACTION_STATUS.md)**: Transaction status page feature guide
- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)**: Comprehensive project overview
- **[.env.local.example](./.env.local.example)**: Environment configuration template

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Demo Accounts

All accounts use password: `password123`

### Admin Users (Full Access)
- admin1@bank.com - Can initiate and approve transfers
- admin2@bank.com - Can initiate and approve transfers

### Controller Users (Initiate Transfers)
- controller1@bank.com - Can initiate transfers
- controller2@bank.com - Can initiate transfers

### Audit Users (View Only)
- audit1@bank.com - Can view audit logs
- audit2@bank.com - Can view audit logs

## Database Management

```bash
npm run db:setup   # Initialize and seed (first time)
npm run db:init    # Create schema only
npm run db:seed    # Add seed data only
npm run db:reset   # Reset everything (deletes all data!)
```

## Development

```bash
npm run dev    # Start development server
npm run build  # Build for production
npm run start  # Start production server
npm run lint   # Run ESLint
```

## Support

For detailed information, see:
- Setup issues: [SETUP.md](./SETUP.md)
- Architecture questions: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Implementation status: [IMPLEMENTATION.md](./IMPLEMENTATION.md)

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
