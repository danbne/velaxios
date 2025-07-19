# API Key Migration Guide

## Overview

This guide explains how to migrate existing plain API keys to hashed API keys in the database. This is a critical security upgrade that should be performed after implementing the security features.

## When Do You Need This?

### ✅ **You need API key migration if:**

1. **Existing Users with API Keys**: You have users who already have API keys stored in the `api_key` column
2. **Production Data**: You're upgrading a production system with existing API keys
3. **Backward Compatibility**: You want to ensure existing API keys continue to work

### ❌ **You DON'T need migration if:**

1. **Fresh Installation**: No existing users with API keys
2. **Development Only**: No real API keys in the database
3. **New System**: Starting with a clean database

## Migration Process

### Step 1: Check Current State

First, check if you have any API keys to migrate:

```bash
cd packages/server
node scripts/migrate-api-keys.js
```

This will show you:

- How many users have API keys
- Whether the migration is needed
- Current database state

### Step 2: Run the Migration

If you have API keys to migrate:

```bash
# Run the migration
yarn migrate-api-keys
```

This will:

- ✅ Hash all existing API keys
- ✅ Store them in the `api_key_hash` column
- ✅ Preserve the original API keys (temporarily)
- ✅ Verify the migration was successful

### Step 3: Test the Migration

After migration, test that API keys still work:

1. **Test with existing API keys** - they should still authenticate
2. **Check the logs** - verify no authentication errors
3. **Monitor for issues** - watch for any failed authentications

### Step 4: Cleanup (Optional)

Once you're confident the migration worked:

```bash
# Remove old plain API keys (PERMANENT)
yarn migrate-api-keys --cleanup
```

⚠️ **WARNING**: This permanently removes the plain API keys from the database!

## Migration Details

### What the Migration Does

1. **Reads** all users with plain API keys from the `api_key` column
2. **Hashes** each API key using SHA-256 (same as the auth system)
3. **Stores** the hashed keys in the `api_key_hash` column
4. **Preserves** the original keys temporarily for verification
5. **Reports** success/failure for each user

### Database Changes

**Before Migration:**

```sql
users table:
- api_key (plain text)
- api_key_hash (NULL)
```

**After Migration:**

```sql
users table:
- api_key (plain text) - still exists
- api_key_hash (hashed) - now populated
```

**After Cleanup:**

```sql
users table:
- api_key (removed)
- api_key_hash (hashed) - only this remains
```

## Security Benefits

### Before Migration

- ❌ API keys stored in plain text
- ❌ Vulnerable to database breaches
- ❌ No secure verification

### After Migration

- ✅ API keys hashed with SHA-256
- ✅ Secure verification process
- ✅ Protection against database breaches
- ✅ One-time display of plain keys

## Troubleshooting

### Common Issues

1. **"api_key_hash column does not exist"**

   - Run the security migration first: `yarn security-migration`

2. **"No API keys to migrate"**

   - This is normal if you don't have existing API keys
   - New API keys will be hashed automatically

3. **Authentication failures after migration**
   - Check that the migration completed successfully
   - Verify the hash function matches between migration and auth

### Verification Commands

```bash
# Check migration status
node scripts/migrate-api-keys.js

# Check database state
psql -d your_database -c "
SELECT
    COUNT(*) as total_users,
    COUNT(CASE WHEN api_key IS NOT NULL THEN 1 END) as plain_keys,
    COUNT(CASE WHEN api_key_hash IS NOT NULL THEN 1 END) as hashed_keys
FROM users;
"
```

## Rollback Plan

If something goes wrong:

1. **Stop the application** immediately
2. **Restore from backup** if available
3. **Check the logs** for migration errors
4. **Verify database state** before restarting

## Best Practices

### Before Migration

- ✅ **Backup your database**
- ✅ **Test on a staging environment first**
- ✅ **Schedule during low-traffic hours**
- ✅ **Have a rollback plan ready**

### During Migration

- ✅ **Monitor the migration logs**
- ✅ **Test authentication immediately after**
- ✅ **Keep the application running** (fallbacks are in place)

### After Migration

- ✅ **Test all API key authentication**
- ✅ **Monitor for authentication errors**
- ✅ **Run cleanup after verification**
- ✅ **Update any hardcoded API keys**

## Example Migration Output

```
🔑 Velaxios API Key Migration Tool
===================================

✅ Database connection successful

🔍 Checking current database state...
📊 Found 5 users with API keys

🔄 Starting API key migration...
🔄 Migrating 5 API keys...
✅ Migrated API key for user: user1@example.com
✅ Migrated API key for user: user2@example.com
✅ Migrated API key for user: user3@example.com
✅ Migrated API key for user: user4@example.com
✅ Migrated API key for user: user5@example.com

📊 Migration Summary:
✅ Successfully migrated: 5
❌ Errors: 0

🔍 Verifying migration...
✅ Users with hashed API keys: 5
⚠️  Users with plain API keys: 5

🎉 API key migration completed successfully!

Next steps:
1. Test API key authentication
2. Monitor for any authentication issues
3. Consider running cleanup: node scripts/migrate-api-keys.js --cleanup
```

## Support

If you encounter issues:

1. **Check the logs** for specific error messages
2. **Verify database state** using the verification commands
3. **Review the migration script** for debugging
4. **Contact the security team** if needed

---

**Remember**: This migration is critical for security. Take your time, test thoroughly, and ensure you have a backup before proceeding.
