-- ============================================
-- TRIMLY DATABASE VIEWS
-- ============================================
-- Run this file THIRD after 02_auth_functions.sql
-- Creates views for efficient data retrieval
-- ============================================

-- ============================================
-- AVAILABLE SLOTS VIEW
-- ============================================
-- View to get all available (non-booked) slots by barber
-- This is used by booking workflows to show free time slots
CREATE OR REPLACE VIEW public.v_available_slots_by_barber AS
SELECT 
    bs.id,
    bs.barber_id,
    bs.slot_date,
    bs.start_time,
    bs.end_time,
    bs.status,
    bs.is_available,
    b.full_name as barber_name,
    b.phone as barber_phone,
    b.avatar as barber_avatar
FROM public.barber_slots bs
INNER JOIN public.barbers b ON bs.barber_id = b.id
WHERE bs.status = 'available' 
  AND bs.is_available = true
  AND bs.slot_date >= CURRENT_DATE
ORDER BY bs.barber_id, bs.slot_date, bs.start_time;

COMMENT ON VIEW public.v_available_slots_by_barber IS 'Available time slots for all barbers with barber details';

-- ============================================
-- BOOKINGS WITH DETAILS VIEW
-- ============================================
-- View to get bookings with joined barber and customer data
-- Reduces the need for multiple queries
CREATE OR REPLACE VIEW public.v_bookings_with_details AS
SELECT 
    bk.id,
    bk.booking_code,
    bk.barber_id,
    bk.customer_id,
    bk.slot_id,
    bk.service_id,
    bk.service_type,
    bk.date,
    bk.start_time,
    bk.end_time,
    bk.duration,
    bk.price,
    bk.status,
    bk.source,
    bk.customer_phone,
    bk.manual_customer_name,
    bk.manual_customer_phone,
    bk.notes,
    bk.created_at,
    bk.updated_at,
    -- Barber details
    b.full_name as barber_name,
    b.phone as barber_phone,
    b.avatar as barber_avatar,
    b.address as barber_address,
    -- Customer details (NULL for manual bookings)
    c.full_name as customer_name,
    c.phone as customer_phone_from_profile,
    -- Service details
    s.name as service_name,
    s.description as service_description,
    -- Computed field: display customer name
    CASE 
        WHEN bk.source = 'manual' THEN COALESCE(bk.manual_customer_name, 'Walk-in Customer')
        ELSE COALESCE(c.full_name, 'Customer')
    END as display_customer_name,
    -- Computed field: display customer phone
    CASE 
        WHEN bk.source = 'manual' THEN bk.manual_customer_phone
        ELSE COALESCE(c.phone, bk.customer_phone)
    END as display_customer_phone
FROM public.bookings bk
LEFT JOIN public.barbers b ON bk.barber_id = b.id
LEFT JOIN public.customers c ON bk.customer_id = c.id
LEFT JOIN public.services s ON bk.service_id = s.id
ORDER BY bk.date DESC, bk.start_time DESC;

COMMENT ON VIEW public.v_bookings_with_details IS 'Bookings with all related barber, customer, and service details';

-- ============================================
-- BARBER SERVICES VIEW
-- ============================================
-- View to get all services with barber information
CREATE OR REPLACE VIEW public.v_barber_services AS
SELECT 
    s.id,
    s.barber_id,
    s.name,
    s.duration,
    s.price,
    s.description,
    s.is_active,
    s.created_at,
    b.full_name as barber_name,
    b.phone as barber_phone
FROM public.services s
INNER JOIN public.barbers b ON s.barber_id = b.id
WHERE s.is_active = true
ORDER BY s.barber_id, s.price;

COMMENT ON VIEW public.v_barber_services IS 'Active services with barber details';

-- ============================================
-- BARBER STATS VIEW
-- ============================================
-- View to calculate barber statistics
CREATE OR REPLACE VIEW public.v_barber_stats AS
SELECT 
    b.id as barber_id,
    b.full_name as barber_name,
    -- Count of active services
    COUNT(DISTINCT s.id) as total_services,
    -- Count of bookings today
    COUNT(DISTINCT CASE 
        WHEN bk.date = CURRENT_DATE AND bk.status = 'confirmed' 
        THEN bk.id 
    END) as bookings_today,
    -- Count of bookings this week
    COUNT(DISTINCT CASE 
        WHEN bk.date >= CURRENT_DATE - INTERVAL '7 days' 
        AND bk.status = 'confirmed' 
        THEN bk.id 
    END) as bookings_this_week,
    -- Earnings today
    COALESCE(SUM(CASE 
        WHEN bk.date = CURRENT_DATE AND bk.status = 'confirmed' 
        THEN bk.price 
        ELSE 0 
    END), 0) as earnings_today,
    -- Earnings this month
    COALESCE(SUM(CASE 
        WHEN DATE_TRUNC('month', bk.date) = DATE_TRUNC('month', CURRENT_DATE) 
        AND bk.status = 'confirmed' 
        THEN bk.price 
        ELSE 0 
    END), 0) as earnings_this_month,
    -- Total completed bookings
    COUNT(DISTINCT CASE 
        WHEN bk.status = 'completed' 
        THEN bk.id 
    END) as total_completed_bookings
FROM public.barbers b
LEFT JOIN public.services s ON b.id = s.barber_id AND s.is_active = true
LEFT JOIN public.bookings bk ON b.id = bk.barber_id
GROUP BY b.id, b.full_name;

COMMENT ON VIEW public.v_barber_stats IS 'Barber statistics including bookings and earnings';

-- ============================================
-- ACTIVE BARBERS VIEW
-- ============================================
-- View to get only active barbers with valid subscriptions
CREATE OR REPLACE VIEW public.v_active_barbers AS
SELECT 
    b.*,
    -- Computed field: is subscription active?
    CASE 
        WHEN b.subscription_status IN ('active', 'free_trial')
        AND (b.subscription_expiry_date IS NULL OR b.subscription_expiry_date > NOW())
        AND (b.subscription_status != 'free_trial' OR b.trial_used = false)
        THEN true
        ELSE false
    END as is_subscription_active
FROM public.barbers b
WHERE b.is_active = true
  AND b.subscription_status IN ('active', 'free_trial')
  AND (b.subscription_expiry_date IS NULL OR b.subscription_expiry_date > NOW());

COMMENT ON VIEW public.v_active_barbers IS 'Only barbers with active subscriptions and accounts';

-- ============================================
-- GRANT PERMISSIONS TO VIEWS
-- ============================================
-- Allow anon and authenticated users to read from views
GRANT SELECT ON public.v_available_slots_by_barber TO anon, authenticated;
GRANT SELECT ON public.v_bookings_with_details TO anon, authenticated;
GRANT SELECT ON public.v_barber_services TO anon, authenticated;
GRANT SELECT ON public.v_barber_stats TO anon, authenticated;
GRANT SELECT ON public.v_active_barbers TO anon, authenticated;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Database views created successfully!';
    RAISE NOTICE '📊 Created views:';
    RAISE NOTICE '  - v_available_slots_by_barber (for booking workflows)';
    RAISE NOTICE '  - v_bookings_with_details (for booking history)';
    RAISE NOTICE '  - v_barber_services (for service listings)';
    RAISE NOTICE '  - v_barber_stats (for analytics)';
    RAISE NOTICE '  - v_active_barbers (for customer search)';
    RAISE NOTICE '🔄 Next step: (Optional) Run 04_insert_sample_data.sql for testing';
END $$;
