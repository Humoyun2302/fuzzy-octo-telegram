# 📊 Trimly Database Schema

Complete reference for all database tables, columns, and relationships.

---

## 🗂️ Tables Overview

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `customers` | Customer accounts | Phone auth, profiles |
| `barbers` | Barber accounts | Phone auth, profiles, subscriptions |
| `services` | Services offered | Pricing, duration, barber link |
| `barber_slots` | Time slot management | **Single source of truth** for availability |
| `bookings` | Booking records | Online & manual bookings |
| `favorites` | Customer favorites | Barber wishlists |
| `sessions` | Auth sessions | Session token management |

---

## 📋 Detailed Schema

### 1. `customers` Table

```sql
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT UNIQUE NOT NULL,              -- Phone number (unique login)
    password_hash TEXT NOT NULL,              -- Bcrypt hashed password
    full_name TEXT NOT NULL,                  -- Customer's full name
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `idx_customers_phone` on `phone` (for login lookups)

**Notes:**
- Phone numbers are stored without spaces
- Passwords are hashed using `pgcrypto` with bcrypt
- No email required - phone-only authentication

---

### 2. `barbers` Table

```sql
CREATE TABLE public.barbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Authentication
    phone TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    
    -- Profile
    full_name TEXT NOT NULL,
    name TEXT,                                -- Display name
    bio TEXT,
    avatar TEXT,                              -- Avatar URL
    avatar_url TEXT,
    profile_image TEXT,
    
    -- Location
    address TEXT,
    location TEXT,
    working_district TEXT,
    districts TEXT[],                         -- Array of districts served
    
    -- Professional Info
    languages TEXT[],                         -- Languages spoken
    specialties TEXT[],                       -- Special skills
    services_for_kids BOOLEAN DEFAULT false,
    gallery TEXT[],                           -- Photo URLs
    
    -- Pricing (auto-calculated)
    price_range_min INTEGER DEFAULT 0,
    price_range_max INTEGER DEFAULT 0,
    
    -- Ratings
    rating DECIMAL(2,1) DEFAULT 5.0,
    review_count INTEGER DEFAULT 0,
    distance DECIMAL(5,2) DEFAULT 1.0,
    
    -- Working Hours (JSON)
    working_hours JSONB DEFAULT '{}',
    
    -- Subscription Management
    subscription_status TEXT DEFAULT 'active',     -- 'active', 'free_trial', 'inactive', 'expired'
    subscription_plan TEXT DEFAULT 'free_trial',   -- 'free_trial', 'monthly', 'annual'
    current_plan TEXT,
    subscription_expiry_date TIMESTAMPTZ,
    trial_used BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    visible BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `idx_barbers_phone` on `phone`
- `idx_barbers_subscription_status` on `subscription_status`
- `idx_barbers_working_district` on `working_district`

**Working Hours Format:**
```json
{
  "monday": {"open": "09:00", "close": "18:00"},
  "tuesday": {"open": "09:00", "close": "18:00"},
  ...
}
```

**Notes:**
- New barbers get 14-day free trial automatically
- `price_range_min/max` are auto-calculated from services
- `districts`, `languages`, `specialties`, `gallery` are PostgreSQL arrays

---

### 3. `services` Table

```sql
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                       -- Service name
    duration INTEGER NOT NULL,                -- Duration in minutes
    price INTEGER NOT NULL,                   -- Price in cents
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `idx_services_barber_id` on `barber_id`
- `idx_services_active` on `is_active`

**Notes:**
- `duration` is in minutes (e.g., 30, 45, 60)
- `price` is in smallest currency unit (e.g., 3500 = $35.00)
- Deleting a barber cascades to delete their services

---

### 4. `barber_slots` Table (⭐ Most Important)

```sql
CREATE TABLE public.barber_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'available',          -- 'available', 'booked', 'unavailable'
    is_available BOOLEAN DEFAULT true,
    
    -- Booking Info (when booked)
    booked_by_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    booked_at TIMESTAMPTZ,
    booking_id UUID,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT no_overlapping_slots UNIQUE (barber_id, slot_date, start_time)
);
```

**Indexes:**
- `idx_slots_barber_date` on `(barber_id, slot_date)`
- `idx_slots_status` on `status`
- `idx_slots_available` on `is_available`
- `idx_slots_customer` on `booked_by_customer_id`

**Status Values:**
- `available` - Free for booking
- `booked` - Customer has booked this slot
- `unavailable` - Barber marked as unavailable (break, lunch, etc.)

**⚠️ CRITICAL:**
This is the **single source of truth** for availability. No separate bookings table for slot management!

---

### 5. `bookings` Table

```sql
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_code TEXT UNIQUE NOT NULL,        -- Human-readable code (e.g., "BK-ABC123")
    
    -- References
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    slot_id UUID REFERENCES barber_slots(id) ON DELETE SET NULL,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    
    -- Details
    service_type TEXT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration INTEGER NOT NULL,                -- Minutes
    price INTEGER NOT NULL,                   -- Cents
    
    -- Status
    status TEXT DEFAULT 'confirmed',          -- 'confirmed', 'cancelled', 'completed'
    source TEXT DEFAULT 'online',             -- 'online' or 'manual'
    customer_phone TEXT,
    
    -- Manual Booking Fields
    manual_customer_name TEXT,                -- For walk-ins (source='manual')
    manual_customer_phone TEXT,
    
    -- Extra
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `idx_bookings_barber_id` on `barber_id`
- `idx_bookings_customer_id` on `customer_id`
- `idx_bookings_date` on `date`
- `idx_bookings_status` on `status`
- `idx_bookings_code` on `booking_code`

**Source Types:**
- `online` - Booked by customer through app
- `manual` - Added by barber (walk-in customer)

**Notes:**
- Manual bookings don't require `customer_id`
- Booking code is unique and human-readable
- Price and duration are denormalized for history

---

### 6. `favorites` Table

```sql
CREATE TABLE public.favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_favorite UNIQUE (customer_id, barber_id)
);
```

**Indexes:**
- `idx_favorites_customer` on `customer_id`
- `idx_favorites_barber` on `barber_id`

**Notes:**
- Unique constraint prevents duplicate favorites
- Cascade delete when customer or barber is deleted

---

### 7. `sessions` Table

```sql
CREATE TABLE public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token TEXT UNIQUE NOT NULL,       -- Random token stored in localStorage
    user_id UUID NOT NULL,                    -- Customer or barber ID
    role TEXT NOT NULL,                       -- 'customer' or 'barber'
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `idx_sessions_token` on `session_token`
- `idx_sessions_user` on `user_id`
- `idx_sessions_expires` on `expires_at`

**Notes:**
- Session tokens are UUIDs stored in localStorage
- Default expiry is 30 days (720 hours)
- Expired sessions are automatically cleaned up

---

## 🔗 Relationships

```
customers ──┬─→ favorites ──→ barbers
            ├─→ bookings ──┬─→ barbers
            └─→ barber_slots    ├─→ services
                            └─→ barber_slots

barbers ──┬─→ services
          └─→ barber_slots ──→ bookings

sessions ──→ (customer_id OR barber_id)
```

---

## 📊 Database Views

### `v_available_slots_by_barber`
Shows all available slots with barber details:
```sql
SELECT * FROM v_available_slots_by_barber 
WHERE barber_id = 'xxx' AND slot_date >= CURRENT_DATE;
```

### `v_bookings_with_details`
Bookings with joined barber, customer, and service data:
```sql
SELECT * FROM v_bookings_with_details 
WHERE customer_id = 'xxx' 
ORDER BY date DESC;
```

### `v_barber_services`
Active services with barber information:
```sql
SELECT * FROM v_barber_services 
WHERE barber_id = 'xxx';
```

### `v_barber_stats`
Barber statistics (bookings, earnings):
```sql
SELECT * FROM v_barber_stats 
WHERE barber_id = 'xxx';
```

### `v_active_barbers`
Only barbers with active subscriptions:
```sql
SELECT * FROM v_active_barbers 
ORDER BY rating DESC;
```

---

## 🔐 Security Notes

1. **Password Storage:** All passwords are hashed with bcrypt (10 rounds)
2. **Phone Numbers:** Stored without spaces, used as unique identifier
3. **Sessions:** Tokens expire after 30 days, automatically cleaned up
4. **RLS:** Row Level Security is **bypassed** - server handles all permissions
5. **Service Role:** Backend uses Supabase service role key for full access

---

## 🔄 Auto-Updated Fields

These fields are automatically updated:
- `updated_at` - Triggered on every UPDATE
- `created_at` - Set on INSERT (never changes)
- `price_range_min/max` - Calculated when services are saved

---

## 📝 Common Queries

**Get available slots for a barber:**
```sql
SELECT * FROM v_available_slots_by_barber
WHERE barber_id = $1 
  AND slot_date = $2
ORDER BY start_time;
```

**Get customer's bookings:**
```sql
SELECT * FROM v_bookings_with_details
WHERE customer_id = $1
ORDER BY date DESC, start_time DESC;
```

**Get barber's today bookings:**
```sql
SELECT * FROM v_bookings_with_details
WHERE barber_id = $1 
  AND date = CURRENT_DATE
  AND status = 'confirmed'
ORDER BY start_time;
```

**Check if slot is available:**
```sql
SELECT * FROM barber_slots
WHERE barber_id = $1
  AND slot_date = $2
  AND start_time = $3
  AND status = 'available';
```

---

This schema supports the complete Trimly booking workflow with proper data integrity and efficient queries! 🎯
