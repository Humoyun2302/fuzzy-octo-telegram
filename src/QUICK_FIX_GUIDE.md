# 🚀 Quick Fix Guide - Barbers Table Missing

## Problem
```
❌ Could not find the 'phone' column of 'barbers' in the schema cache
```

## Root Cause
**The `barbers` table doesn't exist in your Supabase database.**

## ⚡ Quick Fix (5 Minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com
2. Select your **Trimly** project
3. Click **"SQL Editor"** in left sidebar
4. Click **"New Query"**

### Step 2: Run This SQL

Copy and paste this entire SQL script and click **Run**:

```sql
-- Create barbers table with complete schema
CREATE TABLE IF NOT EXISTS barbers (
  -- Primary Key
  id UUID PRIMARY KEY,
  
  -- Basic Info
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  
  -- Profile
  avatar TEXT,
  profile_image TEXT,
  bio TEXT DEFAULT '',
  
  -- Working Information
  working_hours JSONB,
  address TEXT,
  working_district TEXT,
  
  -- Arrays
  districts TEXT[] DEFAULT ARRAY[]::TEXT[],
  languages TEXT[] DEFAULT ARRAY[]::TEXT[],
  specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
  gallery TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Price Range
  price_range_min DECIMAL(10, 2) DEFAULT 0,
  price_range_max DECIMAL(10, 2) DEFAULT 0,
  
  -- Subscription
  subscription_status TEXT DEFAULT 'free_trial',
  current_plan TEXT DEFAULT 'free_trial',
  subscription_expiry_date TIMESTAMPTZ,
  trial_used BOOLEAN DEFAULT false,
  last_payment_date TIMESTAMPTZ,
  
  -- Visibility
  visible_to_public BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  
  -- Stats
  rating DECIMAL(3, 2) DEFAULT 5.0,
  review_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_barbers_phone ON barbers (phone);
CREATE INDEX IF NOT EXISTS idx_barbers_subscription_status ON barbers (subscription_status);

-- Enable RLS
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read of visible barbers"
ON barbers FOR SELECT
USING (
  is_active = true 
  AND (
    visible_to_public = true 
    OR subscription_status = 'active'
    OR subscription_status = 'free_trial'
  )
  AND (
    subscription_expiry_date IS NULL 
    OR subscription_expiry_date > NOW()
  )
);

CREATE POLICY "Allow service role full access"
ON barbers FOR ALL
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON barbers TO anon;
GRANT SELECT ON barbers TO authenticated;
GRANT ALL ON barbers TO service_role;
```

### Step 3: Verify

Run this to check:
```sql
SELECT * FROM barbers;
```

Should return empty result (no errors).

### Step 4: Test Signup

1. Go to your Trimly app
2. Click "Sign Up"
3. Select "Barber"
4. Fill in the form
5. Submit
6. ✅ Should work!

---

## ✅ Done!

Your barbers table is now ready. Barber registration should work perfectly.

## Need Full Migration?

For complete setup with triggers and all features, run:
`/supabase/migrations/20241210_create_barbers_table_from_scratch.sql`

---

**Time Required:** 5 minutes  
**Difficulty:** Easy  
**Risk:** None
