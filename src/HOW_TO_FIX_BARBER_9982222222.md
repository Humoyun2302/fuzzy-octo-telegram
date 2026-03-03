# 🔧 Fix Barber +9982222222 - Give 3-Month Free Trial

## ⚡ Quick Fix (2 Steps)

### Step 1: Run SQL Script

1. **Open Supabase SQL Editor:**
   - Go to https://supabase.com/dashboard
   - Select your Trimly project
   - Click **SQL Editor** → **New Query**

2. **Copy and paste this script:**

```sql
-- Create/Update barber +9982222222 with 3-month free trial
DO $$
DECLARE
  barber_id_var UUID;
  barber_phone TEXT := '+9982222222';
  barber_name TEXT := 'Test Barber';
  expiry_date TIMESTAMP;
BEGIN
  expiry_date := NOW() + INTERVAL '3 months';
  
  -- Find or create barber
  SELECT id INTO barber_id_var FROM barbers WHERE phone = barber_phone;
  
  IF barber_id_var IS NULL THEN
    barber_id_var := gen_random_uuid();
    INSERT INTO barbers (id, phone, full_name, subscription_status, subscription_plan, subscription_expiry_date, trial_used, created_at, updated_at)
    VALUES (barber_id_var, barber_phone, barber_name, 'free_trial', 'trial-3-months', expiry_date, false, NOW(), NOW());
    RAISE NOTICE '✅ Created new barber';
  ELSE
    UPDATE barbers SET subscription_status = 'free_trial', subscription_plan = 'trial-3-months', subscription_expiry_date = expiry_date, trial_used = false, updated_at = NOW()
    WHERE id = barber_id_var;
    RAISE NOTICE '✅ Updated existing barber';
  END IF;
  
  -- Create subscription
  DELETE FROM subscriptions WHERE barber_id = barber_id_var;
  INSERT INTO subscriptions (barber_id, plan_type, status, expires_at, created_at, updated_at)
  VALUES (barber_id_var, 'trial-3-months', 'active', expiry_date, NOW(), NOW());
  
  RAISE NOTICE '✅ 3-month free trial activated! Expires: %', expiry_date::date;
END $$;

-- Verify
SELECT b.phone, s.plan_type, s.status, s.expires_at::date, 
  CASE WHEN s.status = 'active' AND s.expires_at > NOW() THEN '✅ ACTIVE' ELSE '❌ EXPIRED' END as state
FROM barbers b
LEFT JOIN subscriptions s ON b.id = s.barber_id
WHERE b.phone = '+9982222222';
```

3. **Click RUN** (or press Ctrl+Enter)

4. **Expected output:**
```
✅ 3-month free trial activated! Expires: 2025-03-29

Results:
| phone        | plan_type       | status | expires_at | state      |
|--------------|-----------------|--------|------------|------------|
| +9982222222  | trial-3-months  | active | 2025-03-29 | ✅ ACTIVE  |
```

---

### Step 2: Login to Create Auth

The barber now exists in the database, but needs auth credentials.

**Option A: First-time login (creates auth automatically)**

1. Open your app
2. Click **Sign Up** → Select **Barber**
3. Enter:
   - Phone: `+9982222222`
   - Name: `Test Barber`
   - Password: `test1234` (or any password)
4. Verify OTP
5. ✅ Done! The auth will be created and linked to the database record

**Option B: If barber already has auth (just login)**

1. Open your app
2. Click **Login**
3. Enter:
   - Phone: `+9982222222`
   - Password: (their existing password)
4. ✅ Done! The backend will auto-sync to database

---

## ✅ Verification

After completing both steps:

### 1. **Check Subscription in App**
- Login as barber (+9982222222)
- Navigate to subscription section
- Should show:
  - **Plan:** "3-oy Bepul sinov" (3-month Free Trial)
  - **Status:** "Faol" (Active)
  - **Expires:** 3 months from today
  - **NO** expired warnings
  - **NO** renew buttons

### 2. **Check Visibility in Customer Search**
- Logout
- Login as a customer (different phone)
- Go to barber search
- ✅ Barber +9982222222 should appear in the list

### 3. **Check Console Logs**
Open browser console (F12) and look for:

```javascript
[FETCH PROFILE] 📋 Subscription from view: {
  current_plan: "trial-3-months",
  subscription_expires_at: "2025-03-29...",
  is_subscription_active: true
}

✅ Barber Test Barber: {
  current_plan: "trial-3-months",
  is_subscription_active: true
}
```

---

## 🔍 Troubleshooting

### Problem: "Barber not found in database" error after SQL

**Cause:** Auth credentials don't exist yet

**Solution:** Complete Step 2 (signup or login)

---

### Problem: Subscription shows as expired

**Solution:**
1. Check the expiry date in database:
```sql
SELECT phone, subscription_expiry_date, is_subscription_active
FROM v_barbers_public
WHERE phone = '+9982222222';
```

2. If `is_subscription_active = false`, re-run the SQL script

---

### Problem: Barber doesn't appear in customer search

**Cause:** `is_subscription_active = false` in view

**Solution:**
1. Verify subscription is active:
```sql
SELECT * FROM v_barbers_public WHERE phone = '+9982222222';
```

2. If not found, check `subscriptions` table:
```sql
SELECT * FROM subscriptions s
JOIN barbers b ON s.barber_id = b.id
WHERE b.phone = '+9982222222';
```

3. Re-run the SQL script to create subscription

---

## 📋 What This Fix Does

### Before Fix:
- ❌ Barber has KV auth but NO database record
- ❌ Error: "BARBER PROFILE EDITOR ⚠️ No barber data found"
- ❌ Barber invisible in customer search
- ❌ Can't edit profile or add services

### After Fix:
- ✅ Barber has complete database record
- ✅ `barbers` table: subscription info
- ✅ `subscriptions` table: active 3-month trial
- ✅ `v_barbers_public` view: visible to customers
- ✅ Can edit profile and add services
- ✅ Appears in customer search

---

## 🎯 Summary

**Two simple steps:**
1. Run SQL script in Supabase → Creates database records
2. Login/signup in app → Creates/links auth credentials

**Total time:** ~2 minutes

**Result:** Barber +9982222222 has a fully working account with 3-month free trial! 🚀
