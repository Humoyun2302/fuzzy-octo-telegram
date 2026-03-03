-- ============================================
-- TRIMLY DATABASE SCHEMA - TABLE CREATION
-- ============================================
-- Run this file FIRST in Supabase SQL Editor
-- This creates all tables needed for the app
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. CUSTOMERS TABLE
-- ============================================
-- Stores customer accounts and profiles
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster phone lookups
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

COMMENT ON TABLE public.customers IS 'Customer accounts with phone-based authentication';

-- ============================================
-- 2. BARBERS TABLE
-- ============================================
-- Stores barber accounts, profiles, and subscription status
CREATE TABLE IF NOT EXISTS public.barbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    name TEXT, -- Display name (can be different from full_name)
    bio TEXT,
    avatar TEXT, -- Avatar URL
    avatar_url TEXT, -- Alternative avatar field
    profile_image TEXT, -- Alternative avatar field
    
    -- Location & Working Info
    address TEXT,
    location TEXT,
    working_district TEXT,
    districts TEXT[], -- Array of districts barber serves
    
    -- Professional Info
    languages TEXT[], -- Languages spoken
    specialties TEXT[], -- Special skills/services
    services_for_kids BOOLEAN DEFAULT false,
    gallery TEXT[], -- Array of photo URLs
    
    -- Pricing (auto-calculated from services)
    price_range_min INTEGER DEFAULT 0,
    price_range_max INTEGER DEFAULT 0,
    
    -- Ratings & Reviews
    rating DECIMAL(2,1) DEFAULT 5.0,
    review_count INTEGER DEFAULT 0,
    distance DECIMAL(5,2) DEFAULT 1.0, -- Distance from customer (calculated)
    
    -- Working Hours (JSON format: {monday: {open: "09:00", close: "18:00"}, ...})
    working_hours JSONB DEFAULT '{}',
    
    -- Subscription & Status
    subscription_status TEXT DEFAULT 'active', -- 'active', 'free_trial', 'inactive', 'expired'
    subscription_plan TEXT DEFAULT 'free_trial', -- 'free_trial', 'monthly', 'annual'
    current_plan TEXT, -- Alternative plan field
    subscription_expiry_date TIMESTAMPTZ,
    trial_used BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    visible BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_barbers_phone ON public.barbers(phone);
CREATE INDEX IF NOT EXISTS idx_barbers_subscription_status ON public.barbers(subscription_status);
CREATE INDEX IF NOT EXISTS idx_barbers_working_district ON public.barbers(working_district);

COMMENT ON TABLE public.barbers IS 'Barber accounts with profiles and subscription management';

-- ============================================
-- 3. SERVICES TABLE
-- ============================================
-- Stores services offered by each barber
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    duration INTEGER NOT NULL, -- Duration in minutes
    price INTEGER NOT NULL, -- Price in smallest currency unit (e.g., cents)
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_services_barber_id ON public.services(barber_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(is_active);

COMMENT ON TABLE public.services IS 'Services offered by barbers with pricing and duration';

-- ============================================
-- 4. BARBER_SLOTS TABLE (Single Source of Truth)
-- ============================================
-- Stores ALL time slots - both available and booked
-- This is the ONLY table for slot management
CREATE TABLE IF NOT EXISTS public.barber_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Status tracking
    status TEXT DEFAULT 'available', -- 'available', 'booked', 'unavailable'
    is_available BOOLEAN DEFAULT true, -- Backward compatibility
    
    -- Booking information (when status = 'booked')
    booked_by_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    booked_at TIMESTAMPTZ,
    booking_id UUID, -- Reference to bookings table
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: prevent overlapping slots for same barber
    CONSTRAINT no_overlapping_slots UNIQUE (barber_id, slot_date, start_time)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_slots_barber_date ON public.barber_slots(barber_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_slots_status ON public.barber_slots(status);
CREATE INDEX IF NOT EXISTS idx_slots_available ON public.barber_slots(is_available);
CREATE INDEX IF NOT EXISTS idx_slots_customer ON public.barber_slots(booked_by_customer_id);

COMMENT ON TABLE public.barber_slots IS 'Single source of truth for all time slots - available and booked';

-- ============================================
-- 5. BOOKINGS TABLE
-- ============================================
-- Stores booking details and history
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_code TEXT UNIQUE NOT NULL,
    
    -- References
    barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    slot_id UUID REFERENCES public.barber_slots(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    
    -- Booking Details
    service_type TEXT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration INTEGER NOT NULL, -- Minutes
    price INTEGER NOT NULL, -- Price in smallest currency unit
    
    -- Status
    status TEXT DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'completed'
    source TEXT DEFAULT 'online', -- 'online' or 'manual'
    
    -- Contact Info
    customer_phone TEXT,
    
    -- Manual Booking Fields (for walk-ins)
    manual_customer_name TEXT,
    manual_customer_phone TEXT,
    
    -- Additional Info
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_barber_id ON public.bookings(barber_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_code ON public.bookings(booking_code);

COMMENT ON TABLE public.bookings IS 'Booking records with support for online and manual (walk-in) bookings';

-- ============================================
-- 6. FAVORITES TABLE
-- ============================================
-- Customer favorite barbers
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate favorites
    CONSTRAINT unique_favorite UNIQUE (customer_id, barber_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_favorites_customer ON public.favorites(customer_id);
CREATE INDEX IF NOT EXISTS idx_favorites_barber ON public.favorites(barber_id);

COMMENT ON TABLE public.favorites IS 'Customer favorite barbers for quick access';

-- ============================================
-- 7. SESSIONS TABLE
-- ============================================
-- Session management for custom auth
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    role TEXT NOT NULL, -- 'customer' or 'barber'
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON public.sessions(expires_at);

COMMENT ON TABLE public.sessions IS 'Session tokens for custom authentication';

-- ============================================
-- AUTOMATIC UPDATED_AT TRIGGER
-- ============================================
-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_barbers_updated_at BEFORE UPDATE ON public.barbers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_slots_updated_at BEFORE UPDATE ON public.barber_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ All tables created successfully!';
    RAISE NOTICE '📋 Created tables: customers, barbers, services, barber_slots, bookings, favorites, sessions';
    RAISE NOTICE '🔄 Next step: Run 02_auth_functions.sql';
END $$;
