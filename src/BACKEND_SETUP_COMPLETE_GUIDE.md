# 🚀 Trimly Backend Setup - Complete Guide

This guide contains **everything** you need to run Trimly from scratch. Follow these steps in order.

---

## 📋 Prerequisites

1. ✅ Supabase account at https://supabase.com
2. ✅ Active Supabase project (not paused)
3. ✅ Project URL: `https://qxobvbukuxlccqbcbiji.supabase.co`
4. ✅ Anon key from Supabase Dashboard → Settings → API

---

## 🗄️ Step 1: Create Database Tables

Open your **Supabase SQL Editor** and run these SQL scripts **in order**:

### 1.1 Create `customers` Table

```sql
-- Create customers table for phone-based authentication
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own data
CREATE POLICY "Users can view own customer data"
  ON public.customers
  FOR SELECT
  USING (auth.uid() = id);

-- RLS Policy: Users can update their own data
CREATE POLICY "Users can update own customer data"
  ON public.customers
  FOR UPDATE
  USING (auth.uid() = id);

COMMENT ON TABLE public.customers IS 'Customer accounts with phone authentication';
```

### 1.2 Create `barbers` Table

```sql
-- Create barbers table
CREATE TABLE IF NOT EXISTS public.barbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  name TEXT, -- Display name
  password_hash TEXT NOT NULL,
  
  -- Profile fields
  bio TEXT,
  avatar TEXT,
  profile_image TEXT,
  location TEXT,
  address TEXT,
  working_district TEXT,
  working_hours JSONB DEFAULT '{}',
  
  -- Multi-select arrays
  districts TEXT[] DEFAULT ARRAY[]::TEXT[],
  languages TEXT[] DEFAULT ARRAY[]::TEXT[],
  specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
  gallery TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Price range
  price_range_min DECIMAL(10, 2) DEFAULT 0,
  price_range_max DECIMAL(10, 2) DEFAULT 0,
  
  -- Rating
  rating DECIMAL(3, 2) DEFAULT 5.0,
  review_count INTEGER DEFAULT 0,
  
  -- Subscription fields
  subscription_status TEXT DEFAULT 'free_trial' CHECK (subscription_status IN ('free_trial', 'active', 'expired', 'cancelled')),
  current_plan TEXT,
  subscription_expiry_date TIMESTAMPTZ,
  trial_used BOOLEAN DEFAULT FALSE,
  last_payment_date TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_barbers_phone ON public.barbers(phone);
CREATE INDEX IF NOT EXISTS idx_barbers_subscription_status ON public.barbers(subscription_status);

-- Enable RLS
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Barbers are viewable by everyone"
  ON public.barbers
  FOR SELECT
  USING (true);

CREATE POLICY "Barbers can update own data"
  ON public.barbers
  FOR UPDATE
  USING (auth.uid() = id);

-- Auto-update trigger
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

COMMENT ON TABLE public.barbers IS 'Barber accounts with subscription management';
```

### 1.3 Create `services` Table

```sql
-- Create services table
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration INTEGER NOT NULL, -- in minutes
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for barber lookups
CREATE INDEX IF NOT EXISTS idx_services_barber_id ON public.services(barber_id);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Services are viewable by everyone"
  ON public.services
  FOR SELECT
  USING (true);

CREATE POLICY "Barbers can manage own services"
  ON public.services
  FOR ALL
  USING (auth.uid() = barber_id);

COMMENT ON TABLE public.services IS 'Services offered by barbers';
```

### 1.4 Create `barber_slots` Table

```sql
-- Create barber_slots table (single source of truth for availability and bookings)
CREATE TABLE IF NOT EXISTS public.barber_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration INTEGER NOT NULL, -- in minutes
  
  -- Status: 'available', 'booked', 'unavailable'
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'booked', 'unavailable')),
  
  -- Booking information (filled when status = 'booked')
  booked_by_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  booked_at TIMESTAMPTZ,
  
  -- Legacy field for backward compatibility
  is_available BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_barber_slots_barber_date ON public.barber_slots(barber_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_barber_slots_status ON public.barber_slots(status);

-- Enable RLS
ALTER TABLE public.barber_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Slots are viewable by everyone"
  ON public.barber_slots
  FOR SELECT
  USING (true);

CREATE POLICY "Barbers can manage own slots"
  ON public.barber_slots
  FOR ALL
  USING (auth.uid() = barber_id);

COMMENT ON TABLE public.barber_slots IS 'Barber availability slots - single source of truth';
```

### 1.5 Create `bookings` Table

```sql
-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code TEXT UNIQUE NOT NULL,
  
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL, -- Nullable for manual bookings
  slot_id UUID NOT NULL REFERENCES public.barber_slots(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  
  service_type TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration INTEGER NOT NULL, -- in minutes
  price DECIMAL(10, 2) NOT NULL,
  
  status TEXT DEFAULT 'booked' CHECK (status IN ('booked', 'confirmed', 'cancelled', 'completed')),
  source TEXT DEFAULT 'online' CHECK (source IN ('online', 'manual')),
  
  customer_phone TEXT,
  notes TEXT,
  
  -- Manual booking fields (for walk-in customers)
  manual_customer_name TEXT,
  manual_customer_phone TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_barber_id ON public.bookings(barber_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_source ON public.bookings(source) WHERE source = 'manual';

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Barbers can view their bookings"
  ON public.bookings
  FOR SELECT
  USING (auth.uid() = barber_id);

CREATE POLICY "Customers can view their bookings"
  ON public.bookings
  FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Barbers can create bookings"
  ON public.bookings
  FOR INSERT
  WITH CHECK (auth.uid() = barber_id);

CREATE POLICY "Customers can create bookings"
  ON public.bookings
  FOR INSERT
  WITH CHECK (auth.uid() = customer_id AND customer_id IS NOT NULL);

COMMENT ON TABLE public.bookings IS 'Customer bookings (online and manual)';
```

### 1.6 Create `favorites` Table

```sql
-- Create favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(customer_id, barber_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_favorites_customer_id ON public.favorites(customer_id);

-- Enable RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own favorites"
  ON public.favorites
  FOR ALL
  USING (auth.uid() = customer_id);

COMMENT ON TABLE public.favorites IS 'Customer favorite barbers';
```

### 1.7 Create Password Hashing Functions

```sql
-- Install pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to hash passwords using bcrypt
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify passwords
CREATE OR REPLACE FUNCTION public.verify_password(password TEXT, password_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN password_hash = crypt(password, password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.hash_password IS 'Hash password using bcrypt';
COMMENT ON FUNCTION public.verify_password IS 'Verify password against bcrypt hash';
```

### 1.8 Create Available Slots View

```sql
-- Create view for available slots by barber
CREATE OR REPLACE VIEW public.v_available_slots_by_barber AS
SELECT 
  bs.id,
  bs.barber_id,
  bs.slot_date,
  bs.start_time,
  bs.end_time,
  bs.duration,
  bs.status,
  b.full_name AS barber_name,
  b.avatar AS barber_avatar
FROM public.barber_slots bs
JOIN public.barbers b ON b.id = bs.barber_id
WHERE bs.status = 'available'
  AND bs.slot_date >= CURRENT_DATE
ORDER BY bs.slot_date, bs.start_time;

COMMENT ON VIEW public.v_available_slots_by_barber IS 'Available slots for booking (unified source)';
```

---

## 🔐 Step 2: Set Up Authentication

Your app uses **custom authentication** with session tokens stored in `localStorage`, not Supabase Auth.

### 2.1 Create Sessions Table

```sql
-- Create sessions table for custom auth
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer', 'barber')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Index for session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON public.sessions(expires_at);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service role can manage sessions
CREATE POLICY "Service role can manage sessions"
  ON public.sessions
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.sessions IS 'User sessions for custom authentication';
```

---

## 🌐 Step 3: Deploy Backend Server

Your backend uses **Supabase Edge Functions** with a **Hono web server**.

### 3.1 Verify Edge Function Exists

Check if `/supabase/functions/server/index.tsx` exists. If not, I'll create it.

### 3.2 Deploy Command (when ready)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref qxobvbukuxlccqbcbiji

# Deploy edge functions
supabase functions deploy make-server-166b98fa
```

---

## 🧪 Step 4: Test Your Setup

### 4.1 Test Database Connection

Run this in Supabase SQL Editor:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected tables:
-- - barbers
-- - barber_slots
-- - bookings
-- - customers
-- - favorites
-- - services
-- - sessions
```

### 4.2 Test Password Functions

```sql
-- Test password hashing
SELECT public.hash_password('testpassword123');

-- Test password verification
SELECT public.verify_password(
  'testpassword123', 
  public.hash_password('testpassword123')
) AS is_valid; -- Should return TRUE
```

### 4.3 Create Test Barber

```sql
-- Insert test barber
INSERT INTO public.barbers (
  phone,
  full_name,
  name,
  password_hash,
  bio,
  subscription_status,
  subscription_expiry_date,
  trial_used
) VALUES (
  '+998901234567',
  'Test Barber',
  'Test Barber',
  public.hash_password('password123'),
  'Expert barber with 10 years experience',
  'free_trial',
  NOW() + INTERVAL '14 days',
  FALSE
) RETURNING id, full_name, phone;
```

### 4.4 Create Test Service

```sql
-- Insert test service (replace <barber-id> with actual UUID from previous step)
INSERT INTO public.services (
  barber_id,
  name,
  duration,
  price
) VALUES (
  '<barber-id>', -- Replace with actual UUID
  'Haircut',
  30,
  50000
) RETURNING id, name, duration, price;
```

---

## ✅ Step 5: Verification Checklist

Before running the app, verify:

- [ ] All 7 tables created (customers, barbers, services, barber_slots, bookings, favorites, sessions)
- [ ] Password functions work (`hash_password`, `verify_password`)
- [ ] View created (`v_available_slots_by_barber`)
- [ ] Test barber inserted successfully
- [ ] Test service inserted successfully
- [ ] RLS policies enabled on all tables
- [ ] Supabase project is **active** (not paused)

---

## 🚨 Common Issues & Fixes

### Issue: "relation does not exist"
**Fix:** Run the table creation scripts in Supabase SQL Editor

### Issue: "permission denied for table"
**Fix:** Check RLS policies are created correctly

### Issue: "Failed to fetch"
**Fix:** 
1. Check Supabase project is not paused
2. Verify project URL in `/utils/supabase/info.tsx` matches your project
3. Check anon key is correct

### Issue: "function hash_password does not exist"
**Fix:** Run Step 1.7 to create password functions

---

## 📚 Additional Resources

- **Supabase Dashboard:** https://supabase.com/dashboard/project/qxobvbukuxlccqbcbiji
- **API Settings:** Dashboard → Settings → API
- **SQL Editor:** Dashboard → SQL Editor
- **Table Editor:** Dashboard → Table Editor

---

## 🎯 Next Steps After Setup

1. ✅ Run all SQL scripts above in Supabase SQL Editor
2. ✅ Verify tables and functions exist
3. ✅ Create at least one test barber
4. ✅ Test the app in browser
5. ✅ Create real barber accounts via signup

---

**Setup Complete!** 🎉

Your Trimly backend is now ready. The app will connect to Supabase and use these tables.
