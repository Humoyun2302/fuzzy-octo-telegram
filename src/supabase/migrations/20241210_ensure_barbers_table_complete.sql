-- Ensure barbers table has all necessary columns for complete profile management
-- This migration adds any missing columns to the barbers table

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Avatar/Profile Image
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barbers' AND column_name='avatar') THEN
    ALTER TABLE barbers ADD COLUMN avatar TEXT;
    RAISE NOTICE '✅ Added avatar column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barbers' AND column_name='profile_image') THEN
    ALTER TABLE barbers ADD COLUMN profile_image TEXT;
    RAISE NOTICE '✅ Added profile_image column';
  END IF;
  
  -- Bio
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barbers' AND column_name='bio') THEN
    ALTER TABLE barbers ADD COLUMN bio TEXT;
    RAISE NOTICE '✅ Added bio column';
  END IF;
  
  -- Location
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barbers' AND column_name='location') THEN
    ALTER TABLE barbers ADD COLUMN location TEXT;
    RAISE NOTICE '✅ Added location column';
  END IF;
  
  -- Working Information
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barbers' AND column_name='working_hours') THEN
    ALTER TABLE barbers ADD COLUMN working_hours TEXT;
    RAISE NOTICE '✅ Added working_hours column';
  END IF;
  
  -- Arrays for multi-select fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barbers' AND column_name='districts') THEN
    ALTER TABLE barbers ADD COLUMN districts TEXT[] DEFAULT ARRAY[]::TEXT[];
    RAISE NOTICE '✅ Added districts column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barbers' AND column_name='languages') THEN
    ALTER TABLE barbers ADD COLUMN languages TEXT[] DEFAULT ARRAY[]::TEXT[];
    RAISE NOTICE '✅ Added languages column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barbers' AND column_name='specialties') THEN
    ALTER TABLE barbers ADD COLUMN specialties TEXT[] DEFAULT ARRAY[]::TEXT[];
    RAISE NOTICE '✅ Added specialties column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barbers' AND column_name='gallery') THEN
    ALTER TABLE barbers ADD COLUMN gallery TEXT[] DEFAULT ARRAY[]::TEXT[];
    RAISE NOTICE '✅ Added gallery column';
  END IF;
  
  -- Price Range
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barbers' AND column_name='price_range_min') THEN
    ALTER TABLE barbers ADD COLUMN price_range_min DECIMAL(10, 2) DEFAULT 0;
    RAISE NOTICE '✅ Added price_range_min column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barbers' AND column_name='price_range_max') THEN
    ALTER TABLE barbers ADD COLUMN price_range_max DECIMAL(10, 2) DEFAULT 0;
    RAISE NOTICE '✅ Added price_range_max column';
  END IF;
  
  -- Subscription Information  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barbers' AND column_name='last_payment_date') THEN
    ALTER TABLE barbers ADD COLUMN last_payment_date TIMESTAMPTZ;
    RAISE NOTICE '✅ Added last_payment_date column';
  END IF;
  
  -- Ensure rating and review_count exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barbers' AND column_name='rating') THEN
    ALTER TABLE barbers ADD COLUMN rating DECIMAL(3, 2) DEFAULT 5.0;
    RAISE NOTICE '✅ Added rating column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barbers' AND column_name='review_count') THEN
    ALTER TABLE barbers ADD COLUMN review_count INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added review_count column';
  END IF;

  RAISE NOTICE '✅ Barbers table schema check complete';
END $$;

-- Update the updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_barbers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_barbers_updated_at ON barbers;
CREATE TRIGGER trigger_update_barbers_updated_at
  BEFORE UPDATE ON barbers
  FOR EACH ROW
  EXECUTE FUNCTION update_barbers_updated_at();

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Barbers table is ready for complete profile management';
  RAISE NOTICE '   All necessary columns exist';
  RAISE NOTICE '   Triggers configured';
  RAISE NOTICE '   Ready to sync data from KV store';
END $$;