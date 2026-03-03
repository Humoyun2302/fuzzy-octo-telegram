-- ============================================
-- TRIMLY SAMPLE DATA FOR TESTING
-- ============================================
-- Run this file FOURTH (OPTIONAL) for testing
-- Creates sample barbers, customers, services, and slots
-- ⚠️ WARNING: Only run this in development/testing!
-- ============================================

-- ============================================
-- 1. SAMPLE CUSTOMERS
-- ============================================
-- Create 3 test customers
-- Password for all: "password123"
DO $$
DECLARE
    v_customer1_id UUID;
    v_customer2_id UUID;
    v_customer3_id UUID;
BEGIN
    -- Customer 1
    INSERT INTO public.customers (phone, password_hash, full_name)
    VALUES (
        '+1234567890',
        public.hash_password('password123'),
        'John Doe'
    )
    ON CONFLICT (phone) DO NOTHING
    RETURNING id INTO v_customer1_id;
    
    -- Customer 2
    INSERT INTO public.customers (phone, password_hash, full_name)
    VALUES (
        '+1234567891',
        public.hash_password('password123'),
        'Jane Smith'
    )
    ON CONFLICT (phone) DO NOTHING
    RETURNING id INTO v_customer2_id;
    
    -- Customer 3
    INSERT INTO public.customers (phone, password_hash, full_name)
    VALUES (
        '+1234567892',
        public.hash_password('password123'),
        'Mike Johnson'
    )
    ON CONFLICT (phone) DO NOTHING
    RETURNING id INTO v_customer3_id;
    
    RAISE NOTICE '✅ Created 3 sample customers (phone: +123456789X, password: password123)';
END $$;

-- ============================================
-- 2. SAMPLE BARBERS
-- ============================================
-- Create 5 test barbers with different specialties
-- Password for all: "barber123"
DO $$
DECLARE
    v_barber1_id UUID;
    v_barber2_id UUID;
    v_barber3_id UUID;
    v_barber4_id UUID;
    v_barber5_id UUID;
BEGIN
    -- Barber 1: Modern Styles Specialist
    INSERT INTO public.barbers (
        phone, password_hash, full_name, name, bio, 
        address, working_district, districts, languages, specialties,
        subscription_status, subscription_plan, subscription_expiry_date, trial_used,
        rating, review_count, working_hours
    )
    VALUES (
        '+9876543210',
        public.hash_password('barber123'),
        'Alex Martinez',
        'Alex Martinez',
        'Expert in modern haircuts and beard styling. 10+ years experience.',
        '123 Main St, Downtown',
        'Downtown',
        ARRAY['Downtown', 'Midtown'],
        ARRAY['English', 'Spanish'],
        ARRAY['Modern Cuts', 'Beard Styling', 'Hair Coloring'],
        'active',
        'monthly',
        NOW() + INTERVAL '30 days',
        true,
        4.8,
        127,
        '{"monday": {"open": "09:00", "close": "19:00"}, "tuesday": {"open": "09:00", "close": "19:00"}, "wednesday": {"open": "09:00", "close": "19:00"}, "thursday": {"open": "09:00", "close": "19:00"}, "friday": {"open": "09:00", "close": "20:00"}, "saturday": {"open": "10:00", "close": "18:00"}}'::jsonb
    )
    ON CONFLICT (phone) DO NOTHING
    RETURNING id INTO v_barber1_id;
    
    -- Barber 2: Traditional Barbershop
    INSERT INTO public.barbers (
        phone, password_hash, full_name, name, bio,
        address, working_district, districts, languages, specialties,
        subscription_status, subscription_plan, subscription_expiry_date, trial_used,
        rating, review_count, working_hours
    )
    VALUES (
        '+9876543211',
        public.hash_password('barber123'),
        'Carlos Rodriguez',
        'Carlos Rodriguez',
        'Traditional barber specializing in classic cuts and hot towel shaves.',
        '456 Oak Ave, Uptown',
        'Uptown',
        ARRAY['Uptown', 'North End'],
        ARRAY['English', 'Spanish', 'Portuguese'],
        ARRAY['Classic Cuts', 'Hot Shaves', 'Beard Trim'],
        'free_trial',
        'free_trial',
        NOW() + INTERVAL '14 days',
        false,
        4.9,
        89,
        '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "19:00"}, "saturday": {"open": "09:00", "close": "17:00"}}'::jsonb
    )
    ON CONFLICT (phone) DO NOTHING
    RETURNING id INTO v_barber2_id;
    
    -- Barber 3: Kids & Family Specialist
    INSERT INTO public.barbers (
        phone, password_hash, full_name, name, bio,
        address, working_district, districts, languages, specialties,
        services_for_kids, subscription_status, subscription_plan, subscription_expiry_date, trial_used,
        rating, review_count, working_hours
    )
    VALUES (
        '+9876543212',
        public.hash_password('barber123'),
        'Sarah Chen',
        'Sarah Chen',
        'Family-friendly salon. Specializing in kids haircuts and family packages.',
        '789 Elm St, Westside',
        'Westside',
        ARRAY['Westside', 'Central'],
        ARRAY['English', 'Mandarin'],
        ARRAY['Kids Cuts', 'Family Packages', 'Styling'],
        true,
        'active',
        NOW() + INTERVAL '365 days',
        true,
        5.0,
        203,
        '{"monday": {"open": "10:00", "close": "18:00"}, "tuesday": {"open": "10:00", "close": "18:00"}, "wednesday": {"open": "10:00", "close": "18:00"}, "thursday": {"open": "10:00", "close": "18:00"}, "friday": {"open": "10:00", "close": "19:00"}, "saturday": {"open": "09:00", "close": "17:00"}, "sunday": {"open": "10:00", "close": "16:00"}}'::jsonb
    )
    ON CONFLICT (phone) DO NOTHING
    RETURNING id INTO v_barber3_id;
    
    -- Barber 4: Luxury Grooming
    INSERT INTO public.barbers (
        phone, password_hash, full_name, name, bio,
        address, working_district, districts, languages, specialties,
        subscription_status, subscription_plan, subscription_expiry_date, trial_used,
        rating, review_count, working_hours
    )
    VALUES (
        '+9876543213',
        public.hash_password('barber123'),
        'James Wilson',
        'James Wilson',
        'Premium grooming services. VIP treatment and luxury experience.',
        '321 Park Lane, Financial District',
        'Financial District',
        ARRAY['Financial District', 'Downtown'],
        ARRAY['English', 'French'],
        ARRAY['Luxury Cuts', 'Premium Shaves', 'Scalp Treatment'],
        'active',
        'annual',
        NOW() + INTERVAL '365 days',
        true,
        4.7,
        156,
        '{"tuesday": {"open": "10:00", "close": "20:00"}, "wednesday": {"open": "10:00", "close": "20:00"}, "thursday": {"open": "10:00", "close": "20:00"}, "friday": {"open": "10:00", "close": "21:00"}, "saturday": {"open": "09:00", "close": "18:00"}}'::jsonb
    )
    ON CONFLICT (phone) DO NOTHING
    RETURNING id INTO v_barber4_id;
    
    -- Barber 5: Budget-Friendly Quick Cuts
    INSERT INTO public.barbers (
        phone, password_hash, full_name, name, bio,
        address, working_district, districts, languages, specialties,
        subscription_status, subscription_plan, subscription_expiry_date, trial_used,
        rating, review_count, working_hours
    )
    VALUES (
        '+9876543214',
        public.hash_password('barber123'),
        'Tommy Lee',
        'Tommy Lee',
        'Quick, affordable cuts without compromising quality. Walk-ins welcome!',
        '654 Broadway, Eastside',
        'Eastside',
        ARRAY['Eastside', 'South End'],
        ARRAY['English', 'Korean'],
        ARRAY['Quick Cuts', 'Buzz Cuts', 'Fades'],
        'free_trial',
        'free_trial',
        NOW() + INTERVAL '10 days',
        false,
        4.6,
        312,
        '{"monday": {"open": "08:00", "close": "20:00"}, "tuesday": {"open": "08:00", "close": "20:00"}, "wednesday": {"open": "08:00", "close": "20:00"}, "thursday": {"open": "08:00", "close": "20:00"}, "friday": {"open": "08:00", "close": "20:00"}, "saturday": {"open": "08:00", "close": "20:00"}, "sunday": {"open": "10:00", "close": "18:00"}}'::jsonb
    )
    ON CONFLICT (phone) DO NOTHING
    RETURNING id INTO v_barber5_id;
    
    RAISE NOTICE '✅ Created 5 sample barbers (phone: +987654321X, password: barber123)';
END $$;

-- ============================================
-- 3. SAMPLE SERVICES
-- ============================================
-- Create services for each barber
DO $$
DECLARE
    v_barber_id UUID;
    v_service_id UUID;
BEGIN
    -- Services for Barber 1 (Alex Martinez)
    SELECT id INTO v_barber_id FROM public.barbers WHERE phone = '+9876543210';
    IF v_barber_id IS NOT NULL THEN
        INSERT INTO public.services (barber_id, name, duration, price, description)
        VALUES 
            (v_barber_id, 'Modern Haircut', 45, 3500, 'Contemporary style haircut with consultation'),
            (v_barber_id, 'Haircut + Beard', 60, 5000, 'Full haircut and beard styling'),
            (v_barber_id, 'Hair Coloring', 90, 8000, 'Professional hair coloring service'),
            (v_barber_id, 'Beard Trim', 20, 1500, 'Quick beard shaping and trim')
        ON CONFLICT DO NOTHING;
        
        -- Update price range
        UPDATE public.barbers 
        SET price_range_min = 1500, price_range_max = 8000 
        WHERE id = v_barber_id;
    END IF;
    
    -- Services for Barber 2 (Carlos Rodriguez)
    SELECT id INTO v_barber_id FROM public.barbers WHERE phone = '+9876543211';
    IF v_barber_id IS NOT NULL THEN
        INSERT INTO public.services (barber_id, name, duration, price, description)
        VALUES 
            (v_barber_id, 'Classic Cut', 30, 2500, 'Traditional barbershop haircut'),
            (v_barber_id, 'Hot Towel Shave', 45, 4000, 'Luxury straight razor shave with hot towels'),
            (v_barber_id, 'Cut + Shave Combo', 60, 6000, 'Haircut and hot towel shave'),
            (v_barber_id, 'Beard Sculpting', 30, 2000, 'Detailed beard shaping')
        ON CONFLICT DO NOTHING;
        
        UPDATE public.barbers 
        SET price_range_min = 2000, price_range_max = 6000 
        WHERE id = v_barber_id;
    END IF;
    
    -- Services for Barber 3 (Sarah Chen)
    SELECT id INTO v_barber_id FROM public.barbers WHERE phone = '+9876543212';
    IF v_barber_id IS NOT NULL THEN
        INSERT INTO public.services (barber_id, name, duration, price, description)
        VALUES 
            (v_barber_id, 'Kids Haircut', 25, 2000, 'Patient and fun haircut for children'),
            (v_barber_id, 'Adult Haircut', 40, 3000, 'Standard haircut for adults'),
            (v_barber_id, 'Family Package (2)', 70, 4500, 'Two haircuts - great for parent+child'),
            (v_barber_id, 'Hair Styling', 30, 2500, 'Event styling and blow dry')
        ON CONFLICT DO NOTHING;
        
        UPDATE public.barbers 
        SET price_range_min = 2000, price_range_max = 4500 
        WHERE id = v_barber_id;
    END IF;
    
    -- Services for Barber 4 (James Wilson)
    SELECT id INTO v_barber_id FROM public.barbers WHERE phone = '+9876543213';
    IF v_barber_id IS NOT NULL THEN
        INSERT INTO public.services (barber_id, name, duration, price, description)
        VALUES 
            (v_barber_id, 'Executive Cut', 60, 7500, 'Premium haircut with luxury treatment'),
            (v_barber_id, 'VIP Grooming Package', 120, 15000, 'Complete grooming experience'),
            (v_barber_id, 'Scalp Treatment', 45, 6000, 'Relaxing scalp massage and treatment'),
            (v_barber_id, 'Premium Shave', 50, 5500, 'Luxury shaving experience')
        ON CONFLICT DO NOTHING;
        
        UPDATE public.barbers 
        SET price_range_min = 5500, price_range_max = 15000 
        WHERE id = v_barber_id;
    END IF;
    
    -- Services for Barber 5 (Tommy Lee)
    SELECT id INTO v_barber_id FROM public.barbers WHERE phone = '+9876543214';
    IF v_barber_id IS NOT NULL THEN
        INSERT INTO public.services (barber_id, name, duration, price, description)
        VALUES 
            (v_barber_id, 'Quick Cut', 20, 1500, 'Fast and efficient haircut'),
            (v_barber_id, 'Buzz Cut', 15, 1000, 'All-over clipper cut'),
            (v_barber_id, 'Fade', 30, 2000, 'Clean fade haircut'),
            (v_barber_id, 'Trim + Lineup', 25, 1800, 'Quick trim and edge-up')
        ON CONFLICT DO NOTHING;
        
        UPDATE public.barbers 
        SET price_range_min = 1000, price_range_max = 2000 
        WHERE id = v_barber_id;
    END IF;
    
    RAISE NOTICE '✅ Created sample services for all barbers';
END $$;

-- ============================================
-- 4. SAMPLE TIME SLOTS
-- ============================================
-- Create available slots for tomorrow for all barbers
DO $$
DECLARE
    v_barber RECORD;
    v_date DATE := CURRENT_DATE + INTERVAL '1 day';
    v_time TIME;
BEGIN
    -- For each barber, create slots from 9 AM to 6 PM (30-minute intervals)
    FOR v_barber IN (SELECT id FROM public.barbers) LOOP
        v_time := '09:00:00'::TIME;
        
        WHILE v_time < '18:00:00'::TIME LOOP
            INSERT INTO public.barber_slots (
                barber_id, 
                slot_date, 
                start_time, 
                end_time, 
                status, 
                is_available
            )
            VALUES (
                v_barber.id,
                v_date,
                v_time,
                v_time + INTERVAL '30 minutes',
                'available',
                true
            )
            ON CONFLICT (barber_id, slot_date, start_time) DO NOTHING;
            
            v_time := v_time + INTERVAL '30 minutes';
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '✅ Created time slots for tomorrow for all barbers';
END $$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SAMPLE DATA CREATED SUCCESSFULLY!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '👤 TEST CUSTOMERS (Password: password123):';
    RAISE NOTICE '  • +1234567890 - John Doe';
    RAISE NOTICE '  • +1234567891 - Jane Smith';
    RAISE NOTICE '  • +1234567892 - Mike Johnson';
    RAISE NOTICE '';
    RAISE NOTICE '✂️ TEST BARBERS (Password: barber123):';
    RAISE NOTICE '  • +9876543210 - Alex Martinez (Modern Styles)';
    RAISE NOTICE '  • +9876543211 - Carlos Rodriguez (Traditional)';
    RAISE NOTICE '  • +9876543212 - Sarah Chen (Kids & Family)';
    RAISE NOTICE '  • +9876543213 - James Wilson (Luxury)';
    RAISE NOTICE '  • +9876543214 - Tommy Lee (Budget-Friendly)';
    RAISE NOTICE '';
    RAISE NOTICE '📅 Available slots created for tomorrow';
    RAISE NOTICE '💼 Services added for all barbers';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 You can now test the app with these accounts!';
    RAISE NOTICE '';
END $$;
