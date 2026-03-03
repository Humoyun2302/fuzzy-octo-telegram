-- Fix Barber Visibility and RLS Policies
-- This migration ensures barbers are visible when they have active subscriptions

-- 1. Add visible_to_public column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'barbers' AND column_name = 'visible_to_public'
  ) THEN
    ALTER TABLE barbers ADD COLUMN visible_to_public BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 2. Add is_active column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'barbers' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE barbers ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- 3. Update existing barbers: Set visible_to_public based on subscription status
UPDATE barbers
SET visible_to_public = true,
    is_active = true
WHERE 
  subscription_status = 'active' 
  AND (subscription_expiry_date IS NULL OR subscription_expiry_date > NOW());

-- 4. Set visible for barbers who used their trial
UPDATE barbers
SET visible_to_public = true,
    is_active = true
WHERE trial_used = true;

-- 5. Set visible for legacy barbers (backward compatibility)
UPDATE barbers
SET visible_to_public = true,
    is_active = true
WHERE 
  subscription_status IS NULL 
  AND trial_used IS NULL;

-- 6. Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Barbers are viewable by everyone" ON barbers;
DROP POLICY IF EXISTS "Public barbers are viewable by everyone" ON barbers;
DROP POLICY IF EXISTS "Allow anonymous read of public barbers" ON barbers;

-- 7. Create comprehensive RLS policy for reading barbers
CREATE POLICY "Allow public read of visible barbers"
ON barbers
FOR SELECT
USING (
  -- Allow anonymous/authenticated users to see barbers that are:
  -- 1. Active (is_active = true)
  -- 2. Visible to public (visible_to_public = true) OR have active subscription
  -- 3. Subscription not expired (if expiry date exists)
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
);

-- 8. Create policy for barbers to update their own profile
DROP POLICY IF EXISTS "Barbers can update own profile" ON barbers;
CREATE POLICY "Barbers can update own profile"
ON barbers
FOR UPDATE
USING (auth.uid()::text = id)
WITH CHECK (auth.uid()::text = id);

-- 9. Create policy for barbers to read their own profile (including private fields)
DROP POLICY IF EXISTS "Barbers can read own profile" ON barbers;
CREATE POLICY "Barbers can read own profile"
ON barbers
FOR SELECT
USING (auth.uid()::text = id);

-- 10. Enable RLS on barbers table
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;

-- 11. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_barbers_visibility 
ON barbers (is_active, visible_to_public, subscription_status, subscription_expiry_date);

CREATE INDEX IF NOT EXISTS idx_barbers_subscription_expiry 
ON barbers (subscription_expiry_date) 
WHERE subscription_expiry_date IS NOT NULL;

-- 12. Create a function to automatically set visibility when subscription is activated
CREATE OR REPLACE FUNCTION update_barber_visibility()
RETURNS TRIGGER AS $$
BEGIN
  -- When subscription becomes active, set visible_to_public and is_active
  IF NEW.subscription_status = 'active' AND (OLD.subscription_status IS NULL OR OLD.subscription_status != 'active') THEN
    NEW.visible_to_public := true;
    NEW.is_active := true;
  END IF;
  
  -- When trial is used, set visible
  IF NEW.trial_used = true AND (OLD.trial_used IS NULL OR OLD.trial_used = false) THEN
    NEW.visible_to_public := true;
    NEW.is_active := true;
  END IF;
  
  -- When subscription expires, hide from public
  IF NEW.subscription_expiry_date IS NOT NULL AND NEW.subscription_expiry_date < NOW() THEN
    NEW.visible_to_public := false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Create trigger to auto-update visibility
DROP TRIGGER IF EXISTS trigger_update_barber_visibility ON barbers;
CREATE TRIGGER trigger_update_barber_visibility
  BEFORE INSERT OR UPDATE ON barbers
  FOR EACH ROW
  EXECUTE FUNCTION update_barber_visibility();

-- 14. Log migration success
DO $$
DECLARE
  visible_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM barbers;
  SELECT COUNT(*) INTO visible_count FROM barbers WHERE visible_to_public = true;
  
  RAISE NOTICE '✅ Barber visibility migration complete:';
  RAISE NOTICE '   Total barbers: %', total_count;
  RAISE NOTICE '   Visible barbers: %', visible_count;
END $$;
