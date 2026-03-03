-- Create barber_slots table with date-based slots
CREATE TABLE IF NOT EXISTS barber_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_barber_slots_barber_id ON barber_slots(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_slots_date ON barber_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_barber_slots_barber_date ON barber_slots(barber_id, slot_date);

-- Enable RLS
ALTER TABLE barber_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Barbers can insert/update/delete only their own slots
CREATE POLICY "Barbers can insert their own slots"
  ON barber_slots
  FOR INSERT
  TO authenticated
  WITH CHECK (barber_id = auth.uid());

CREATE POLICY "Barbers can update their own slots"
  ON barber_slots
  FOR UPDATE
  TO authenticated
  USING (barber_id = auth.uid())
  WITH CHECK (barber_id = auth.uid());

CREATE POLICY "Barbers can delete their own slots"
  ON barber_slots
  FOR DELETE
  TO authenticated
  USING (barber_id = auth.uid());

-- Barbers can read their own slots
CREATE POLICY "Barbers can read their own slots"
  ON barber_slots
  FOR SELECT
  TO authenticated
  USING (barber_id = auth.uid());

-- Public can read available slots (for customer booking)
CREATE POLICY "Public can read available slots"
  ON barber_slots
  FOR SELECT
  TO public
  USING (is_available = true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_barber_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_barber_slots_updated_at
  BEFORE UPDATE ON barber_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_barber_slots_updated_at();
