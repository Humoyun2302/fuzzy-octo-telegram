-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY,
  full_name text NOT NULL,
  phone text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster phone lookups
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Customers can read and update only their own profile
CREATE POLICY "Customers can read their own profile"
  ON customers
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Customers can update their own profile"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow insert for authenticated users (for profile creation)
CREATE POLICY "Authenticated users can insert their profile"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Service role can do everything (for server-side operations)
CREATE POLICY "Service role has full access"
  ON customers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();
