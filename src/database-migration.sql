-- =====================================================
-- Database Migration for Manual Booking Support
-- =====================================================
-- This migration adds support for manual bookings created by barbers
-- for walk-in customers without creating customer accounts.
--
-- Run this migration in your Supabase SQL Editor
-- =====================================================

-- Step 1: Add manual booking columns to bookings table
-- =====================================================
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS manual_customer_name TEXT,
ADD COLUMN IF NOT EXISTS manual_customer_phone TEXT;

COMMENT ON COLUMN bookings.manual_customer_name IS 'Name of walk-in customer for manual bookings (null for online bookings)';
COMMENT ON COLUMN bookings.manual_customer_phone IS 'Phone of walk-in customer for manual bookings (null for online bookings)';

-- Step 2: Make customer_id nullable
-- =====================================================
-- This allows manual bookings to have customer_id = null
ALTER TABLE bookings 
ALTER COLUMN customer_id DROP NOT NULL;

COMMENT ON COLUMN bookings.customer_id IS 'Foreign key to customers table (null for manual bookings)';

-- Step 3: Update RLS policies to allow barbers to create manual bookings
-- =====================================================

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert their own bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can insert bookings" ON bookings;
DROP POLICY IF EXISTS "Barbers can create manual bookings" ON bookings;

-- Create new unified INSERT policy
CREATE POLICY "Unified booking insert policy"
ON bookings
FOR INSERT
TO authenticated
WITH CHECK (
  -- Barbers can insert bookings for any customer_id (including null for manual bookings)
  auth.uid() IN (
    SELECT id FROM barbers WHERE id = auth.uid()
  )
  OR
  -- Customers can only insert bookings for themselves
  (
    auth.uid() IN (
      SELECT id FROM customers WHERE id = auth.uid()
    )
    AND customer_id = auth.uid()
  )
);

COMMENT ON POLICY "Unified booking insert policy" ON bookings IS 'Allows barbers to create manual bookings with customer_id = null, and customers to create online bookings for themselves';

-- Step 4: Update SELECT policy to show barbers their manual bookings
-- =====================================================

-- Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Barbers can view their bookings" ON bookings;

-- Create new unified SELECT policy
CREATE POLICY "Unified booking select policy"
ON bookings
FOR SELECT
TO authenticated
USING (
  -- Barbers can see all their bookings (both online and manual)
  auth.uid() IN (
    SELECT id FROM barbers WHERE id = barber_id
  )
  OR
  -- Customers can see their own bookings
  auth.uid() IN (
    SELECT id FROM customers WHERE id = customer_id
  )
);

COMMENT ON POLICY "Unified booking select policy" ON bookings IS 'Allows barbers to see all their bookings including manual ones, and customers to see their own bookings';

-- Step 5: Create index for manual booking queries
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_bookings_source 
ON bookings(source) 
WHERE source = 'manual';

COMMENT ON INDEX idx_bookings_source IS 'Index for filtering manual bookings';

-- Step 6: Verify migration
-- =====================================================
-- Run this query to check the new columns exist:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'bookings' 
-- AND column_name IN ('manual_customer_name', 'manual_customer_phone', 'customer_id', 'source');

-- =====================================================
-- Rollback Instructions (if needed)
-- =====================================================
-- To rollback this migration:
--
-- ALTER TABLE bookings DROP COLUMN IF EXISTS manual_customer_name;
-- ALTER TABLE bookings DROP COLUMN IF EXISTS manual_customer_phone;
-- ALTER TABLE bookings ALTER COLUMN customer_id SET NOT NULL;
-- DROP POLICY IF EXISTS "Unified booking insert policy" ON bookings;
-- DROP POLICY IF EXISTS "Unified booking select policy" ON bookings;
-- DROP INDEX IF EXISTS idx_bookings_source;
--
-- Then recreate your original policies.
-- =====================================================

-- =====================================================
-- Test Data (Optional)
-- =====================================================
-- Uncomment below to insert test manual booking:
--
-- INSERT INTO bookings (
--   booking_code,
--   barber_id,
--   customer_id,
--   slot_id,
--   service_type,
--   date,
--   start_time,
--   end_time,
--   duration,
--   price,
--   status,
--   source,
--   manual_customer_name,
--   manual_customer_phone
-- ) VALUES (
--   'TRIMLY-' || FLOOR(RANDOM() * 100000)::text,
--   '<your-barber-uuid>',
--   NULL, -- No customer ID for manual bookings
--   '<your-slot-uuid>',
--   'Haircut',
--   CURRENT_DATE + INTERVAL '1 day',
--   '10:00:00',
--   '10:45:00',
--   45,
--   50000,
--   'booked',
--   'manual',
--   'John Doe',
--   '+998 90 123 45 67'
-- );
-- =====================================================

-- Migration complete!
-- =====================================================
RAISE NOTICE 'Manual booking migration completed successfully!';
