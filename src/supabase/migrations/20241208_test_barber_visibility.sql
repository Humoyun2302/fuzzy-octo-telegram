-- Test script to verify barber visibility
-- Run this after the migration to ensure everything is working

DO $$
DECLARE
  total_barbers INTEGER;
  visible_barbers INTEGER;
  active_subscription INTEGER;
  trial_used_count INTEGER;
  legacy_count INTEGER;
  expired_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🧪 Testing Barber Visibility System';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Count total barbers
  SELECT COUNT(*) INTO total_barbers FROM barbers;
  RAISE NOTICE '📊 Total barbers in database: %', total_barbers;
  
  -- Count visible barbers
  SELECT COUNT(*) INTO visible_barbers 
  FROM barbers 
  WHERE 
    is_active = true 
    AND (
      visible_to_public = true 
      OR subscription_status = 'active'
      OR trial_used = true
    )
    AND (
      subscription_expiry_date IS NULL 
      OR subscription_expiry_date > NOW()
    );
  RAISE NOTICE '👀 Visible barbers: %', visible_barbers;
  
  -- Count by visibility reason
  SELECT COUNT(*) INTO active_subscription
  FROM barbers
  WHERE subscription_status = 'active'
    AND (subscription_expiry_date IS NULL OR subscription_expiry_date > NOW());
  RAISE NOTICE '✅ With active subscription: %', active_subscription;
  
  SELECT COUNT(*) INTO trial_used_count
  FROM barbers
  WHERE trial_used = true;
  RAISE NOTICE '🎁 With trial used: %', trial_used_count;
  
  SELECT COUNT(*) INTO legacy_count
  FROM barbers
  WHERE subscription_status IS NULL 
    AND trial_used IS NULL;
  RAISE NOTICE '📦 Legacy barbers (no subscription data): %', legacy_count;
  
  SELECT COUNT(*) INTO expired_count
  FROM barbers
  WHERE subscription_expiry_date IS NOT NULL
    AND subscription_expiry_date < NOW();
  RAISE NOTICE '⏰ Expired subscriptions: %', expired_count;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  
  -- Show detailed list of visible barbers
  RAISE NOTICE '📋 List of visible barbers:';
  RAISE NOTICE '';
  
  FOR rec IN 
    SELECT 
      id,
      full_name,
      subscription_status,
      trial_used,
      visible_to_public,
      is_active,
      subscription_expiry_date,
      CASE
        WHEN subscription_status = 'active' AND (subscription_expiry_date IS NULL OR subscription_expiry_date > NOW()) THEN 'Active Subscription'
        WHEN trial_used = true THEN 'Trial Used'
        WHEN visible_to_public = true THEN 'Manually Visible'
        WHEN subscription_status IS NULL AND trial_used IS NULL THEN 'Legacy'
        ELSE 'Unknown'
      END as visibility_reason
    FROM barbers
    WHERE 
      is_active = true 
      AND (
        visible_to_public = true 
        OR subscription_status = 'active'
        OR trial_used = true
      )
      AND (
        subscription_expiry_date IS NULL 
        OR subscription_expiry_date > NOW()
      )
    ORDER BY created_at DESC
    LIMIT 10
  LOOP
    RAISE NOTICE '  • % (%) - Reason: %', 
      rec.full_name, 
      LEFT(rec.id::TEXT, 8), 
      rec.visibility_reason;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  
  -- Test RLS policy
  RAISE NOTICE '🔐 Testing RLS Policy...';
  
  -- This should return the same count as visible_barbers
  DECLARE
    policy_visible_count INTEGER;
  BEGIN
    -- Reset session to simulate anonymous user
    PERFORM set_config('role', 'anon', true);
    
    SELECT COUNT(*) INTO policy_visible_count
    FROM barbers;
    
    RAISE NOTICE '  RLS allows % barbers to be seen by anonymous users', policy_visible_count;
    
    IF policy_visible_count = visible_barbers THEN
      RAISE NOTICE '  ✅ RLS policy working correctly';
    ELSE
      RAISE WARNING '  ⚠️  RLS policy mismatch! Expected %, got %', visible_barbers, policy_visible_count;
    END IF;
    
    -- Reset to authenticated role
    PERFORM set_config('role', 'authenticated', true);
  END;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Test Complete!';
  RAISE NOTICE '========================================';
  
END $$;

-- Also run a direct query that the frontend would use
SELECT 
  'Frontend Query Test' as test_name,
  COUNT(*) as visible_barbers_count
FROM barbers
WHERE 
  is_active = true 
  AND (
    visible_to_public = true 
    OR subscription_status = 'active'
    OR trial_used = true
  )
  AND (
    subscription_expiry_date IS NULL 
    OR subscription_expiry_date > NOW()
  );
