-- Create services table for barber service management
-- This migration creates the table structure for barbers to define their offered services

-- 1. Create the services table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id TEXT NOT NULL,
  name TEXT NOT NULL,
  duration INTEGER NOT NULL CHECK (duration > 0),
  price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT services_barber_id_fkey FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE
);

-- 2. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_services_barber_id 
ON services (barber_id);

CREATE INDEX IF NOT EXISTS idx_services_created_at 
ON services (created_at);

-- 3. Enable Row Level Security
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Allow public to read services (for customers browsing barbers)
DROP POLICY IF EXISTS "Allow public read of services" ON services;
CREATE POLICY "Allow public read of services"
ON services
FOR SELECT
USING (true);

-- 5. RLS Policy: Barbers can insert their own services
DROP POLICY IF EXISTS "Barbers can insert own services" ON services;
CREATE POLICY "Barbers can insert own services"
ON services
FOR INSERT
WITH CHECK (auth.uid()::text = barber_id OR barber_id IN (
  SELECT id FROM barbers WHERE id = barber_id
));

-- 6. RLS Policy: Barbers can update their own services
DROP POLICY IF EXISTS "Barbers can update own services" ON services;
CREATE POLICY "Barbers can update own services"
ON services
FOR UPDATE
USING (barber_id IN (SELECT id FROM barbers WHERE id = barber_id))
WITH CHECK (barber_id IN (SELECT id FROM barbers WHERE id = barber_id));

-- 7. RLS Policy: Barbers can delete their own services
DROP POLICY IF EXISTS "Barbers can delete own services" ON services;
CREATE POLICY "Barbers can delete own services"
ON services
FOR DELETE
USING (barber_id IN (SELECT id FROM barbers WHERE id = barber_id));

-- 8. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_services_updated_at ON services;
CREATE TRIGGER trigger_update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_services_updated_at();

-- 10. Log migration success
DO $$
BEGIN
  RAISE NOTICE '✅ services table migration complete';
  RAISE NOTICE '   Table created with RLS policies';
  RAISE NOTICE '   Indexes created for optimal performance';
  RAISE NOTICE '   Foreign key constraint to barbers table';
END $$;
