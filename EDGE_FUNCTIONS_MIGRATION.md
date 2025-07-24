# Migration to Supabase Edge Functions

## 🏗️ New Project Structure

```
swearjar/
├── supabase/
│   ├── config.toml
│   ├── functions/
│   │   ├── auth/
│   │   │   └── index.ts          # Auth operations
│   │   ├── swear-jars/
│   │   │   └── index.ts          # Swear jar CRUD
│   │   ├── transactions/
│   │   │   └── index.ts          # Transaction operations
│   │   ├── plaid/
│   │   │   └── index.ts          # Plaid integration
│   │   └── _shared/
│   │       ├── cors.ts           # CORS helper
│   │       ├── auth.ts           # Auth helper
│   │       └── types.ts          # Shared types
│   └── migrations/
│       └── 20240101000000_initial.sql
├── client/                       # React frontend (updated)
├── database/
│   └── schema.sql               # Keep existing schema
└── README.md
```

## 🔄 Environment Variables Migration

### Old .env.local:
```env
NODE_ENV=development
PORT=5000
SUPABASE_URL=https://project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service_role_key
JWT_SECRET=jwt_secret
PLAID_CLIENT_ID=plaid_id
PLAID_SECRET=plaid_secret
PLAID_ENV=sandbox
CLIENT_URL=http://localhost:3000
```

### New .env.local:
```env
# PUBLIC (exposed to frontend)
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# PRIVATE (Edge Functions only)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PLAID_CLIENT_ID=your_plaid_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox
PLAID_PRODUCTS=transactions,accounts
PLAID_COUNTRY_CODES=US,CA
```

## 📋 Migration Steps

### Step 1: Install Supabase CLI
```bash
npm install -g supabase
```

### Step 2: Initialize Supabase Project
```bash
# In your project root
supabase init
supabase login
supabase link --project-ref your-project-ref
```

### Step 3: Create Edge Functions Structure
```bash
supabase functions new auth
supabase functions new swear-jars
supabase functions new transactions
supabase functions new plaid
```

### Step 4: Update Frontend to Use Supabase Auth
```typescript
// client/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Step 5: Replace Auth System
```typescript
// client/src/contexts/AuthContext.tsx
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
})

// Auto-handled by RLS policies
const { data: userJars } = await supabase
  .from('swear_jars')
  .select('*')
  // No need for user filtering - RLS handles it!
```

## 🔧 Key Changes Required

### 1. Remove Express Server
- Delete `server/` directory
- Delete `api/` directory
- Update `package.json` scripts

### 2. Update Frontend Auth
```typescript
// Old: Custom JWT
const login = async (email: string, password: string) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  const { token } = await response.json()
  localStorage.setItem('token', token)
}

// New: Supabase Auth
const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  // Session automatically managed by Supabase
}
```

### 3. Update Data Fetching
```typescript
// Old: API calls
const getSwearJars = async () => {
  const response = await fetch('/api/swear-jars', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return response.json()
}

// New: Direct Supabase calls
const getSwearJars = async () => {
  const { data, error } = await supabase
    .from('swear_jars')
    .select(`
      *,
      swear_jar_members!inner(
        role,
        permissions,
        users(name, email, avatar)
      )
    `)
  return data
}
```

### 4. Complex Operations Use Edge Functions
```typescript
// For complex business logic, call Edge Functions
const processTransaction = async (transactionData) => {
  const { data, error } = await supabase.functions.invoke('transactions', {
    body: { action: 'create', ...transactionData }
  })
  return data
}
```

## 🛡️ Security Benefits

1. **Automatic Authentication**: No JWT management
2. **Row Level Security**: Database-level permissions
3. **Type Safety**: Generated TypeScript types
4. **Real-time**: Built-in subscriptions
5. **Edge Computing**: Global performance

## 📊 Performance Benefits

1. **No Express Server**: Eliminate server cold starts
2. **Global Edge**: Functions run worldwide
3. **Connection Pooling**: Automatic database optimization
4. **Caching**: Built-in query caching

## 🚀 Development Workflow

```bash
# Start local development
supabase start
supabase functions serve

# Deploy to production
supabase functions deploy auth
supabase functions deploy swear-jars
supabase functions deploy transactions
supabase functions deploy plaid
```

## 🔄 Deployment Changes

### Old (Vercel):
- Frontend + API routes
- MongoDB connection management
- Custom authentication

### New (Supabase + Vercel):
- Frontend only on Vercel
- Edge Functions on Supabase
- Built-in auth and database

This migration will give you:
- ⚡ Better performance
- 🔒 Enhanced security  
- 🛠️ Better developer experience
- 📈 Automatic scaling
- 💰 Potentially lower costs 