-- =====================================================
-- Create View for Available Slots by Barber
-- =====================================================
-- This view provides a unified source of truth for available slots
-- that can be queried by both Customer Booking and Manual Booking
-- =====================================================

-- Create or replace the view
CREATE OR REPLACE VIEW public.v_available_slots_by_barber AS
SELECT 
  bs.id AS slot_id,
  bs.barber_id,
  bs.slot_date,
  bs.start_time,
  bs.end_time,
  bs.is_available,
  -- Create a combined timestamp for ordering
  (bs.slot_date || ' ' || bs.start_time)::timestamp AS starts_at,
  bs.created_at,
  bs.updated_at
FROM 
  barber_slots bs
WHERE 
  -- Only include available slots
  bs.is_available = true
  -- Only include future or current dates
  AND bs.slot_date >= CURRENT_DATE
ORDER BY 
  bs.barber_id,
  bs.slot_date,
  bs.start_time;

-- Grant permissions for public read access
GRANT SELECT ON public.v_available_slots_by_barber TO public;
GRANT SELECT ON public.v_available_slots_by_barber TO authenticated;
GRANT SELECT ON public.v_available_slots_by_barber TO anon;

COMMENT ON VIEW public.v_available_slots_by_barber IS 'View of available slots grouped by barber for booking workflows';
