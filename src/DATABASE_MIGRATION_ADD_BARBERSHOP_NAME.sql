-- ============================================================
-- MIGRATION: Add barbershop_name column to barbers table
-- Date: 2026-01-23
-- Purpose: Add optional barbershop name field to barber profiles
-- ============================================================

-- Add barbershop_name column to barbers table
ALTER TABLE public.barbers 
ADD COLUMN IF NOT EXISTS barbershop_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.barbers.barbershop_name IS 'Optional name of the barbershop where the barber works';

-- Verify the column was added successfully
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'barbers' 
    AND column_name = 'barbershop_name'
  ) THEN
    RAISE NOTICE '✅ barbershop_name column added successfully to barbers table';
  ELSE
    RAISE EXCEPTION '❌ Failed to add barbershop_name column to barbers table';
  END IF;
END $$;
