# Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.0.0 or higher ([Download](https://nodejs.org/))
- **npm**: v9.0.0 or higher (comes with Node.js)
- **PostgreSQL**: v14.0 or higher ([Download](https://www.postgresql.org/download/))
- **Git**: For version control

### Verify Installations

```bash
node --version  # Should be v18+
npm --version   # Should be v9+
psql --version  # Should be v14+
```

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd work-ai-test
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js and React
- PostgreSQL client (pg)
- NextAuth for authentication
- Testing libraries (Jest, React Testing Library)
- TypeScript and type definitions

### 3. Configure PostgreSQL

#### Option A: Using Default PostgreSQL Installation

```bash
# Start PostgreSQL (macOS with Homebrew)
brew services start postgresql@14

# Or on Linux
sudo systemctl start postgresql

# Create the database
createdb banking_system

# Verify connection
psql banking_system -c "SELECT version();"
```

#### Option B: Using Docker

```bash
# Create docker-compose.yml
cat > docker-compose.yml << EOF
version: '3.8'
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: banking_system
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
EOF

# Start PostgreSQL
docker-compose up -d

# Verify
docker-compose ps
```

### 4. Configure Environment Variables

The `.env.local` file has been created for you with default values:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=banking_system
DB_USER=postgres
DB_PASSWORD=postgres

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=change-this-to-a-random-secret-in-production

NODE_ENV=development
```

**Important for Production**: Generate a secure NEXTAUTH_SECRET:

```bash
# Generate a random secret
openssl rand -base64 32
```

Then update `.env.local` or set environment variables in your deployment platform.

### 5. Initialize Database

Run the setup script to create tables and seed data:

```bash
npm run db:setup
```

This command will:
1. Create all database tables
2. Set up indexes and constraints
3. Create triggers for timestamp updates
4. Seed 8 users with different roles
5. Seed 6 bank accounts with balances

You should see output like:
```
Initializing database schema...
✓ Database schema initialized
Seeding database with initial data...
Seeded 8 users
Seeded 6 bank accounts
✓ Database seeded successfully
```

### 6. Verify Database Setup

```bash
# Connect to database
psql banking_system

# Check tables
\dt

# Verify users
SELECT email, role FROM users;

# Verify accounts
SELECT account_number, account_name, balance FROM accounts;

# Exit
\q
```

You should see:
- **Users**: 8 rows (2 admin, 2 controller, 2 audit, 2 no role)
- **Accounts**: 6 rows with various balances

### 7. Start Development Server

```bash
npm run dev
```

The application will start at: http://localhost:3000

### 8. Sign In

Navigate to http://localhost:3000 and sign in with any demo account:

**Admin Users** (can do everything):
- admin1@bank.com / password123
- admin2@bank.com / password123

**Controller Users** (can initiate transfers):
- controller1@bank.com / password123
- controller2@bank.com / password123

**Audit Users** (can view audit logs):
- audit1@bank.com / password123
- audit2@bank.com / password123

## Troubleshooting

### Database Connection Failed

**Problem**: Error connecting to PostgreSQL

**Solutions**:

1. Check if PostgreSQL is running:
   ```bash
   # macOS
   brew services list | grep postgresql
   
   # Linux
   sudo systemctl status postgresql
   
   # Docker
   docker-compose ps
   ```

2. Verify credentials in `.env.local` match your PostgreSQL setup

3. Test connection manually:
   ```bash
   psql -h localhost -U postgres -d banking_system
   ```

4. Check PostgreSQL logs:
   ```bash
   # macOS
   tail -f /usr/local/var/log/postgresql@14.log
   
   # Linux
   sudo tail -f /var/log/postgresql/postgresql-14-main.log
   
   # Docker
   docker-compose logs -f postgres
   ```

### Port 3000 Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solutions**:

1. Kill the process using port 3000:
   ```bash
   # macOS/Linux
   lsof -ti:3000 | xargs kill -9
   
   # Or change the port
   npm run dev -- -p 3001
   ```

2. Update NEXTAUTH_URL in `.env.local` if you change the port

### Database Schema Errors

**Problem**: Tables already exist or schema is corrupted

**Solution**: Reset the database:

```bash
npm run db:reset
```

Type `yes` when prompted. This will:
1. Drop all tables
2. Drop all enums
3. Recreate schema
4. Reseed data

**⚠️ Warning**: This deletes ALL data!

### NextAuth Configuration Error

**Problem**: `NEXTAUTH_SECRET` not set

**Solution**: Ensure `.env.local` exists and contains NEXTAUTH_SECRET:

```bash
# Check if file exists
cat .env.local | grep NEXTAUTH_SECRET

# If not set, generate one
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)" >> .env.local
```

### Build Errors

**Problem**: TypeScript or build errors

**Solutions**:

1. Clear Next.js cache:
   ```bash
   rm -rf .next
   npm run dev
   ```

2. Reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. Check Node.js version:
   ```bash
   node --version  # Must be v18+
   ```

## Database Commands Reference

```bash
# Initialize schema only (no seed data)
npm run db:init

# Seed data only (requires schema)
npm run db:seed

# Full setup (init + seed)
npm run db:setup

# Reset everything (dangerous!)
npm run db:reset
```

## Next Steps

After successful setup:

1. **Explore the Dashboard**: View system statistics and health
2. **Create a Transfer**: Use admin1 or controller1 to initiate a transfer
3. **Test Approval Workflow**: Create a transfer over $1M and approve it with admin2
4. **View Audit Logs**: Sign in as audit1 to see all system activities
5. **Manage Users**: Sign in as admin1 to change user roles

## Testing Your Setup

### Quick Verification Test

Run this in your browser console after logging in:

```javascript
// Test API health
fetch('/api/dashboard')
  .then(r => r.json())
  .then(data => console.log('API Health:', data.health));

// Test accounts endpoint
fetch('/api/accounts')
  .then(r => r.json())
  .then(data => console.log('Accounts:', data.accounts.length));
```

### Create a Test Transfer

1. Sign in as controller1@bank.com
2. Navigate to "New Transfer"
3. Select from/to accounts
4. Enter amount: $500,000
5. Submit
6. Go to Dashboard to see the completed transfer

### Test Approval Workflow

1. Sign in as admin1@bank.com
2. Navigate to "New Transfer"
3. Select from/to accounts
4. Enter amount: $1,500,000 (over approval threshold)
5. Submit - should show "awaiting approval"
6. Sign out
7. Sign in as admin2@bank.com (different admin!)
8. Navigate to "Approvals"
9. Approve the transfer
10. Check Dashboard to see completed transfer

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup instructions.

## Support

If you encounter issues not covered here:

1. Check [ARCHITECTURE.md](./ARCHITECTURE.md) for system details
2. Check [TESTING.md](./TESTING.md) for test-related issues
3. Review application logs in terminal
4. Check PostgreSQL logs
5. Open an issue on GitHub with:
   - Error message
   - Steps to reproduce
   - Environment details (OS, Node version, PostgreSQL version)
