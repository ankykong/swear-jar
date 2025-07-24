-- SwearJar Supabase Database Schema
-- This replaces the MongoDB collections with PostgreSQL tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (replaces User model)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    avatar TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Swear jars table (replaces SwearJar model)
CREATE TABLE IF NOT EXISTS swear_jars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    balance DECIMAL(10,2) DEFAULT 0 CHECK (balance >= 0),
    currency VARCHAR(3) DEFAULT 'USD' CHECK (currency IN ('USD', 'CAD', 'EUR', 'GBP')),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{
        "isPublic": false,
        "requireApprovalForWithdrawals": true,
        "minimumDeposit": 0.01,
        "maximumDeposit": 1000,
        "swearWords": [],
        "autoDeductOnSwear": false
    }'::jsonb,
    statistics JSONB DEFAULT '{
        "totalDeposits": 0,
        "totalWithdrawals": 0,
        "transactionCount": 0,
        "averageDeposit": 0,
        "mostActiveUser": null,
        "popularSwearWord": null,
        "streakDays": 0,
        "lastActivity": null
    }'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Swear jar members table (replaces embedded members array)
CREATE TABLE IF NOT EXISTS swear_jar_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    swear_jar_id UUID NOT NULL REFERENCES swear_jars(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    permissions JSONB DEFAULT '{
        "canDeposit": true,
        "canWithdraw": false,
        "canInvite": false,
        "canViewTransactions": true
    }'::jsonb,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(swear_jar_id, user_id)
);

-- Bank accounts table (replaces BankAccount model)
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plaid_account_id VARCHAR(255) NOT NULL,
    plaid_item_id VARCHAR(255) NOT NULL,
    plaid_access_token VARCHAR(255) NOT NULL,
    institution_id VARCHAR(255) NOT NULL,
    institution_name VARCHAR(255) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('checking', 'savings', 'credit', 'investment', 'loan', 'other')),
    account_subtype VARCHAR(50),
    mask VARCHAR(10),
    balance JSONB DEFAULT '{
        "available": null,
        "current": null,
        "limit": null,
        "isoCurrencyCode": "USD",
        "lastUpdated": null
    }'::jsonb,
    verification JSONB DEFAULT '{
        "status": "pending",
        "verifiedAt": null,
        "method": null
    }'::jsonb,
    permissions JSONB DEFAULT '{
        "canDeposit": true,
        "canWithdraw": false
    }'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    sync_errors JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table (replaces Transaction model)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    swear_jar_id UUID NOT NULL REFERENCES swear_jars(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer', 'penalty', 'refund')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0.01),
    currency VARCHAR(3) DEFAULT 'USD' CHECK (currency IN ('USD', 'CAD', 'EUR', 'GBP')),
    description VARCHAR(500),
    metadata JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    bank_account_id UUID REFERENCES bank_accounts(id),
    balance_after DECIMAL(10,2) NOT NULL,
    fees JSONB DEFAULT '{
        "amount": 0,
        "description": null
    }'::jsonb,
    external_transaction_id VARCHAR(255),
    plaid_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_swear_jars_owner ON swear_jars(owner_id);
CREATE INDEX IF NOT EXISTS idx_swear_jar_members_jar ON swear_jar_members(swear_jar_id);
CREATE INDEX IF NOT EXISTS idx_swear_jar_members_user ON swear_jar_members(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_plaid ON bank_accounts(plaid_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_jar ON transactions(swear_jar_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_swear_jars_updated_at BEFORE UPDATE ON swear_jars FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE swear_jars ENABLE ROW LEVEL SECURITY;
ALTER TABLE swear_jar_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Swear jar policies
CREATE POLICY "Users can view swear jars they're members of" ON swear_jars FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM swear_jar_members 
        WHERE swear_jar_id = id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update swear jars they own" ON swear_jars FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can create swear jars" ON swear_jars FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Bank account policies
CREATE POLICY "Users can view own bank accounts" ON bank_accounts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can manage own bank accounts" ON bank_accounts FOR ALL USING (user_id = auth.uid());

-- Transaction policies
CREATE POLICY "Users can view transactions for their swear jars" ON transactions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM swear_jar_members 
        WHERE swear_jar_id = transactions.swear_jar_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can create transactions for their swear jars" ON transactions FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM swear_jar_members 
        WHERE swear_jar_id = NEW.swear_jar_id AND user_id = auth.uid()
    )
); 