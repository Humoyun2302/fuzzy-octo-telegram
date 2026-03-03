-- ================================================================
-- QUICK FIX: Create barber +9982222222 with 3-month free trial
-- ================================================================
-- Run this in Supabase SQL Editor
-- ================================================================

-- Step 1: Check if barber exists in auth (KV store)
-- You need to find the user_id from your KV store first
-- For now, we'll generate a new UUID if barber doesn't exist

DO $$
DECLARE
  barber_id_var UUID;
  barber_phone TEXT := '+9982222222';
  barber_name TEXT := 'Test Barber';
  expiry_date TIMESTAMP;
BEGIN
  -- Calculate expiry date (3 months from now)
  expiry_date := NOW() + INTERVAL '3 months';
  
  -- Try to find existing barber by phone
  SELECT id INTO barber_id_var
  FROM barbers
  WHERE phone = barber_phone;
  
  IF barber_id_var IS NULL THEN
    -- Barber doesn't exist, create with new UUID
    RAISE NOTICE '⚠️  Barber not found, creating new record...';
    
    barber_id_var := gen_random_uuid();
    
    -- Insert into barbers table
    INSERT INTO barbers (
      id,
      phone,
      full_name,
      subscription_status,
      subscription_plan,
      subscription_expiry_date,
      trial_used,
      created_at,
      updated_at
    ) VALUES (
      barber_id_var,
      barber_phone,
      barber_name,
      'free_trial',
      'trial-3-months',
      expiry_date,
      false,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✅ Created barber in barbers table: %', barber_id_var;
  ELSE
    -- Barber exists, update subscription info
    RAISE NOTICE '✅ Found existing barber: %', barber_id_var;
    
    UPDATE barbers
    SET 
      subscription_status = 'free_trial',
      subscription_plan = 'trial-3-months',
      subscription_expiry_date = expiry_date,
      trial_used = false,
      updated_at = NOW()
    WHERE id = barber_id_var;
    
    RAISE NOTICE '✅ Updated barber subscription info';
  END IF;
  
  -- Step 2: Create/update subscription record
  -- Delete old subscription if exists
  DELETE FROM subscriptions WHERE barber_id = barber_id_var;
  RAISE NOTICE '🗑️  Deleted old subscriptions (if any)';
  
  -- Create new 3-month free trial subscription
  INSERT INTO subscriptions (
    barber_id,
    plan_type,
    status,
    expires_at,
    created_at,
    updated_at
  ) VALUES (
    barber_id_var,
    'trial-3-months',
    'active',
    expiry_date,
    NOW(),
    NOW()
  );
  
  RAISE NOTICE '✅ Created 3-month free trial subscription!';
  RAISE NOTICE '📅 Expires at: %', expiry_date::date;
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ SUCCESS! Barber +9982222222 now has 3-month free trial';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: You still need to create auth credentials!';
  RAISE NOTICE '   Use the signup flow or login with this phone to create auth.';
  RAISE NOTICE '';
END $$;

-- Verify the changes
SELECT 
  b.id,
  b.full_name,
  b.phone,
  b.subscription_status,
  b.subscription_plan,
  b.subscription_expiry_date::date as expires_date,
  s.plan_type,
  s.status,
  s.expires_at::date as subscription_expires_date,
  CASE 
    WHEN s.status = 'active' AND s.expires_at > NOW() THEN '✅ ACTIVE'
    ELSE '❌ EXPIRED'
  END as subscription_state
FROM barbers b
LEFT JOIN subscriptions s ON b.id = s.barber_id
WHERE b.phone = '+9982222222';

-- Also verify they appear in the public view
SELECT 
  id,
  full_name,
  phone,
  current_plan,
  subscription_expires_at::date,
  is_subscription_active,
  CASE 
    WHEN is_subscription_active = true THEN '✅ VISIBLE IN APP'
    ELSE '❌ NOT VISIBLE'
  END as visibility_status
FROM v_barbers_public
WHERE phone = '+9982222222';

-- ================================================================
-- EXPECTED OUTPUT:
-- ================================================================
-- ✅ SUCCESS! Barber +9982222222 now has 3-month free trial
-- 
-- Table showing barber and subscription details with ACTIVE status
-- Table showing barber visible in v_barbers_public view
-- ================================================================
