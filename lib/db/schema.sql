-- Banking Transfer System Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles enum
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('CONTROLLER', 'AUDIT', 'ADMIN', 'NONE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Transaction status enum
DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM ('PENDING', 'AWAITING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Audit action enum
DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
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
    'ACCOUNT_VIEWED',
    'AUDIT_LOG_VIEWED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS "ai-users" (
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

-- Bank accounts table
CREATE TABLE IF NOT EXISTS "ai-accounts" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_number VARCHAR(50) UNIQUE NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  minimum_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT positive_balance CHECK (balance >= 0),
  CONSTRAINT valid_minimum_balance CHECK (minimum_balance >= 0)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS "ai-transactions" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_account_id UUID NOT NULL REFERENCES "ai-accounts"(id),
  to_account_id UUID NOT NULL REFERENCES "ai-accounts"(id),
  amount DECIMAL(15, 2) NOT NULL,
  status transaction_status DEFAULT 'PENDING',
  initiated_by UUID NOT NULL REFERENCES "ai-users"(id),
  approved_by UUID REFERENCES "ai-users"(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  requires_approval BOOLEAN DEFAULT false,
  description TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT positive_amount CHECK (amount > 0),
  CONSTRAINT different_accounts CHECK (from_account_id != to_account_id)
);

-- Approvals table for tracking approval workflow
CREATE TABLE IF NOT EXISTS "ai-approvals" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES "ai-transactions"(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES "ai-users"(id),
  status VARCHAR(50) DEFAULT 'PENDING',
  decision VARCHAR(50),
  decision_notes TEXT,
  decided_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS "ai-audit_logs" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action audit_action NOT NULL,
  user_id UUID REFERENCES "ai-users"(id),
  transaction_id UUID REFERENCES "ai-transactions"(id),
  account_id UUID REFERENCES "ai-accounts"(id),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_users_email ON "ai-users"(email);
CREATE INDEX IF NOT EXISTS idx_ai_users_role ON "ai-users"(role);
CREATE INDEX IF NOT EXISTS idx_ai_accounts_account_number ON "ai-accounts"(account_number);
CREATE INDEX IF NOT EXISTS idx_ai_transactions_from_account ON "ai-transactions"(from_account_id);
CREATE INDEX IF NOT EXISTS idx_ai_transactions_to_account ON "ai-transactions"(to_account_id);
CREATE INDEX IF NOT EXISTS idx_ai_transactions_initiated_by ON "ai-transactions"(initiated_by);
CREATE INDEX IF NOT EXISTS idx_ai_transactions_status ON "ai-transactions"(status);
CREATE INDEX IF NOT EXISTS idx_ai_transactions_created_at ON "ai-transactions"(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_approvals_transaction ON "ai-approvals"(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ai_approvals_assigned_to ON "ai-approvals"(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ai_approvals_status ON "ai-approvals"(status);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_user ON "ai-audit_logs"(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_transaction ON "ai-audit_logs"(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_account ON "ai-audit_logs"(account_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_action ON "ai-audit_logs"(action);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_created_at ON "ai-audit_logs"(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_ai_users_updated_at ON "ai-users";
CREATE TRIGGER update_ai_users_updated_at BEFORE UPDATE ON "ai-users"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_accounts_updated_at ON "ai-accounts";
CREATE TRIGGER update_ai_accounts_updated_at BEFORE UPDATE ON "ai-accounts"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_transactions_updated_at ON "ai-transactions";
CREATE TRIGGER update_ai_transactions_updated_at BEFORE UPDATE ON "ai-transactions"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_approvals_updated_at ON "ai-approvals";
CREATE TRIGGER update_ai_approvals_updated_at BEFORE UPDATE ON "ai-approvals"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
