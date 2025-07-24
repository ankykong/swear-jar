# MongoDB to Supabase Migration Guide

This guide will help you migrate your SwearJar application from MongoDB to Supabase.

## ✅ What's Changed

- **Database**: MongoDB → Supabase (PostgreSQL)
- **ORM**: Mongoose → Supabase JavaScript client
- **Environment Variables**: `MONGODB_URI` → `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- **Schema**: MongoDB collections → PostgreSQL tables with Row Level Security

## 🚀 Migration Steps

### 1. Set Up Supabase

1. Create a free account at [https://supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → API to get your:
   - Project URL
   - Service role key (keep this secret!)

### 2. Create Database Schema

1. Go to the SQL Editor in your Supabase dashboard
2. Copy and paste the contents of `database/schema.sql`
3. Click "Run" to create all tables and policies

### 3. Update Environment Variables

Replace these environment variables:

**Old (MongoDB):**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/swearjar
```

**New (Supabase):**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Install Dependencies

The migration has already updated the package.json files. Run:

```bash
npm run install-all
```

This will install the new `@supabase/supabase-js` dependency and remove the old `mongoose` dependency.

### 5. Data Migration (If Needed)

If you have existing data in MongoDB that you want to migrate:

1. **Export from MongoDB:**
   ```bash
   mongoexport --uri="your-mongodb-uri" --collection=users --out=users.json
   mongoexport --uri="your-mongodb-uri" --collection=swearjars --out=swearjars.json
   mongoexport --uri="your-mongodb-uri" --collection=transactions --out=transactions.json
   mongoexport --uri="your-mongodb-uri" --collection=bankaccounts --out=bankaccounts.json
   ```

2. **Transform and Import to Supabase:**
   - Convert MongoDB ObjectIds to UUIDs
   - Transform nested objects to JSONB fields
   - Update field names (camelCase → snake_case)
   - Use Supabase dashboard or create a migration script

### 6. Test the Migration

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Test key functionality:
   - User registration and login
   - Creating swear jars
   - Adding transactions
   - Bank account integration

## 🔄 Schema Mapping

### Users Collection → Users Table
```
MongoDB                 | Supabase
-----------------------|------------------
_id                    | id (UUID)
name                   | name
email                  | email
password               | password
avatar                 | avatar
isActive               | is_active
lastLogin              | last_login
createdAt              | created_at
updatedAt              | updated_at
swearJars (embedded)   | swear_jar_members (table)
bankAccounts (refs)    | bank_accounts (table)
```

### SwearJars Collection → Swear_Jars + Swear_Jar_Members Tables
```
MongoDB                 | Supabase
-----------------------|------------------
_id                    | id (UUID)
name                   | name
description            | description
balance                | balance
currency               | currency
owner                  | owner_id
members (embedded)     | swear_jar_members (table)
settings (embedded)    | settings (JSONB)
statistics (embedded)  | statistics (JSONB)
isActive               | is_active
createdAt              | created_at
updatedAt              | updated_at
```

### Transactions Collection → Transactions Table
```
MongoDB                 | Supabase
-----------------------|------------------
_id                    | id (UUID)
swearJar               | swear_jar_id
user                   | user_id
type                   | type
amount                 | amount
currency               | currency
description            | description
metadata (embedded)    | metadata (JSONB)
status                 | status
bankAccount            | bank_account_id
balanceAfter           | balance_after
fees (embedded)        | fees (JSONB)
externalTransactionId  | external_transaction_id
plaidData (embedded)   | plaid_data (JSONB)
createdAt              | created_at
processedAt            | processed_at
updatedAt              | updated_at
```

### BankAccounts Collection → Bank_Accounts Table
```
MongoDB                 | Supabase
-----------------------|------------------
_id                    | id (UUID)
user                   | user_id
plaidAccountId         | plaid_account_id
plaidItemId            | plaid_item_id
plaidAccessToken       | plaid_access_token
institutionId          | institution_id
institutionName        | institution_name
accountName            | account_name
accountType            | account_type
accountSubtype         | account_subtype
mask                   | mask
balance (embedded)     | balance (JSONB)
verification (embedded)| verification (JSONB)
permissions (embedded) | permissions (JSONB)
metadata (embedded)    | metadata (JSONB)
isActive               | is_active
lastSyncAt             | last_sync_at
syncErrors (embedded)  | sync_errors (JSONB)
createdAt              | created_at
updatedAt              | updated_at
```

## 🔐 Security Improvements

Supabase provides several security enhancements over MongoDB:

1. **Row Level Security (RLS)**: Users can only access their own data
2. **Built-in Auth**: Option to use Supabase Auth instead of custom JWT
3. **Real-time Subscriptions**: Listen to database changes in real-time
4. **Automatic API Generation**: REST and GraphQL APIs generated automatically

## 🎯 Benefits of the Migration

- **Better Performance**: PostgreSQL is optimized for complex queries
- **ACID Compliance**: Better data consistency and reliability
- **Real-time Features**: Built-in subscriptions for live updates
- **Better Scaling**: Automatic connection pooling and scaling
- **Enhanced Security**: Row Level Security and built-in auth
- **Modern Tooling**: Beautiful dashboard and monitoring tools

## 🆘 Troubleshooting

### Common Issues:

1. **Connection Errors:**
   - Check your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - Ensure the service role key has the right permissions

2. **Schema Errors:**
   - Make sure you ran the complete `schema.sql` file
   - Check for any SQL errors in the Supabase dashboard

3. **Permission Errors:**
   - RLS policies might be blocking access
   - Check the policies in the Supabase dashboard under Authentication → Policies

4. **Data Type Errors:**
   - Ensure UUIDs are properly formatted
   - Check JSONB field structures match the expected format

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)

## 🎉 You're Done!

Congratulations! Your SwearJar application is now running on Supabase with improved performance, security, and modern tooling. Enjoy the enhanced developer experience! 